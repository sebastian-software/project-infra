#!/usr/bin/env node
// The publish loop is the smallest part of publishing a set of npm packages.
// What a release actually runs into: npm Trusted Publishing cannot mint a token
// for a package name that has never been published, so a newly added package
// fails with a 404 halfway through the loop, after its siblings are already
// out; a re-run of that half-finished release must not try to overwrite an
// immutable version; and a publish the registry accepted is not served to an
// installer until it has propagated. This script wraps the loop in the four
// safeguards that answer those cases — a first-publish preflight, a skip for a
// version that is already on the registry, a bounded post-publish verification,
// and a dry run that rehearses all of it without publishing.
//
// It runs in a job that only checks the repository out, so it uses Node
// built-ins alone: `fetch` for the registry reads, and a small tar reader for
// the manifest inside a packed tarball, because a release that publishes
// pnpm-packed archives has no package directory to read a name and version
// from.
//
// Every registry read distinguishes three answers, because collapsing them is
// what republishes a version that already exists: 200 means published, 404
// means not published, and anything else — another status, or a transport
// failure that outlives the retries — fails the job instead of passing for
// "not published yet".
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { gunzipSync } from "node:zlib";

export const DEFAULT_REGISTRY = "https://registry.npmjs.org";
export const MAX_VERIFY_TIMEOUT = 1800;

const REQUEST_TIMEOUT_MS = 10_000;
const REQUEST_ATTEMPTS = 3;
const REQUEST_RETRY_MS = 5000;
const VERIFY_POLL_MS = 15_000;
const TAR_BLOCK = 512;

// The abbreviated packument answers "does this name exist at all" in kilobytes
// instead of megabytes. The version document does not serve that media type, so
// it is asked for as plain JSON.
const PACKUMENT_ACCEPT = "application/vnd.npm.install-v1+json";
const VERSION_ACCEPT = "application/json";

const sleep = (milliseconds) =>
  new Promise((wake) => {
    setTimeout(wake, milliseconds);
  });

export function parsePackages(value) {
  return String(value ?? "")
    .split(/\s+/)
    .filter(Boolean);
}

// npm resolves a publish argument as a registry spec before it considers a
// path: `tool` names the package `tool` on the registry, and `npm/tool` is the
// GitHub shorthand `owner/repo`, which sends npm off to clone a repository.
// Only a path that starts with `./`, `../` or `/` — or the bare `.` — is read
// as the local directory or tarball the caller meant, so the shape is settled
// here rather than in every calling workflow.
export function normalizeEntry(entry) {
  if (entry === "." || /^(?:\.{1,2}[\\/]|\/|[A-Za-z]:[\\/])/.test(entry)) return entry;
  return `./${entry}`;
}

function isTarball(entry) {
  return /\.(?:tgz|tar\.gz)$/.test(entry);
}

// The version's prerelease identifier is the dist-tag, so a release candidate
// never lands on `latest` by omission.
export function deriveDistTag(version) {
  if (!version.includes("-")) return "latest";
  const identifier = version.slice(version.indexOf("-") + 1).split(/[.+]/)[0];
  // A purely numeric identifier (1.2.3-1) is not a usable dist-tag.
  return /^\d+$/.test(identifier) ? "next" : identifier;
}

export function isPrerelease(version) {
  return version.includes("-");
}

// An npm tarball is a gzipped tar whose entries all live under one root
// directory, so the manifest is the `package.json` one level in. Reading the
// header fields of a tar is short enough to do here; the alternative is a
// dependency this action cannot have. A name parked in a GNU or pax extension
// header falls through to the error below rather than being guessed at.
export function manifestFromTarball(path) {
  const tar = gunzipSync(readFileSync(path));
  let offset = 0;
  while (offset + TAR_BLOCK <= tar.length) {
    const header = tar.subarray(offset, offset + TAR_BLOCK);
    const name = headerField(header, 0, 100);
    // Two zero-filled blocks end the archive.
    if (name === "") break;
    const size = Number.parseInt(headerField(header, 124, 12) || "0", 8);
    const type = header[156] === 0 ? "0" : String.fromCharCode(header[156]);
    const content = offset + TAR_BLOCK;
    if (type === "0" && /^[^/]+\/package\.json$/.test(name)) {
      return JSON.parse(tar.subarray(content, content + size).toString("utf8"));
    }
    offset = content + Math.ceil(size / TAR_BLOCK) * TAR_BLOCK;
  }
  throw new Error("the archive carries no package.json at its root");
}

function headerField(header, start, length) {
  const field = header.subarray(start, start + length).toString("utf8");
  const end = field.indexOf("\0");
  return (end === -1 ? field : field.slice(0, end)).trim();
}

export function readManifest(entry, cwd = process.cwd()) {
  const path = resolve(cwd, entry);
  let manifest;
  try {
    manifest = isTarball(entry)
      ? manifestFromTarball(path)
      : JSON.parse(readFileSync(join(path, "package.json"), "utf8"));
  } catch (error) {
    throw new Error(`Cannot read the manifest of ${entry}: ${error.message}`);
  }
  if (typeof manifest.name !== "string" || typeof manifest.version !== "string") {
    throw new Error(`The manifest of ${entry} carries no name and version.`);
  }
  return { entry, name: manifest.name, version: manifest.version };
}

async function registryRequest(url, accept, context) {
  let failure = "";
  for (let attempt = 1; attempt <= REQUEST_ATTEMPTS; attempt += 1) {
    try {
      const response = await context.fetchImpl(url, {
        cache: "no-store",
        headers: { accept },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.status === 404) return undefined;
      if (response.ok) return await response.json();
      failure = `HTTP ${response.status}`;
      // A status the registry will still answer the same way after a wait —
      // anything but a server error or a rate limit — is reported at once.
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      failure = error.message;
    }
    if (attempt < REQUEST_ATTEMPTS) await context.sleepImpl(REQUEST_RETRY_MS);
  }
  throw new Error(
    `Registry lookup failed for ${url}: ${failure}. Refusing to guess whether the version is already published.`,
  );
}

// A scoped name's slash has to be encoded; the registry serves `@scope%2fname`.
function packumentUrl(context, name) {
  return `${context.registry}/${encodeURIComponent(name)}`;
}

function versionUrl(context, name, version) {
  return `${context.registry}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`;
}

async function isNamePublished(name, context) {
  return (
    (await registryRequest(packumentUrl(context, name), PACKUMENT_ACCEPT, context)) !== undefined
  );
}

async function isVersionPublished(item, context) {
  const document = await registryRequest(
    versionUrl(context, item.name, item.version),
    VERSION_ACCEPT,
    context,
  );
  return document !== undefined && document.version === item.version;
}

// Trusted Publishing exchanges the job's OIDC identity for a token scoped to a
// package that exists. A package name that does not exist yet therefore fails
// on PUT, and it fails after the packages before it in the list are published.
// Reporting every such name before anything is published turns that into one
// manual bootstrap pass instead of one 404 per re-run.
async function preflightFirstPublish(items, context) {
  const unpublished = [];
  for (const item of items) {
    if (!(await isNamePublished(item.name, context))) unpublished.push(item);
  }
  if (unpublished.length === 0) {
    context.log(
      `All ${items.length} package names exist on the registry; Trusted Publishing can mint a token for each.`,
    );
    return;
  }

  const names = unpublished.map((item) => item.name);
  for (const item of unpublished) {
    context.log(`${item.name} (${item.entry}) has never been published.`);
  }
  const remedy =
    "Publish each one once with an npm token, configure its trusted publisher on npmjs.com, then re-run this workflow.";
  // A dry run publishes nothing, so blocking it would make a newly added
  // package impossible to rehearse — which is when the rehearsal matters most.
  if (context.dryRun) {
    context.log(`::warning::${names.length} package(s) need a manual first publish. ${remedy}`);
    return;
  }
  throw new Error(
    `${names.length} package(s) have never been published, so this release would fail partway through: ${names.join(", ")}. ${remedy}`,
  );
}

// npm acknowledges a publish before every read replica serves it, so a package
// that is not there yet is rechecked until the budget runs out. A lookup that
// fails outright is not propagation lag and fails immediately.
async function verifyPublishedVersions(items, context) {
  const deadline = context.now() + context.verifyTimeout * 1000;
  let pending = items;
  for (;;) {
    const unresolved = [];
    for (const item of pending) {
      if (await isVersionPublished(item, context)) {
        context.log(`${item.name}@${item.version} is served by the registry.`);
      } else {
        unresolved.push(item);
      }
    }
    if (unresolved.length === 0) {
      context.log(`Verified ${items.length} package(s) on the registry.`);
      return;
    }
    const remaining = deadline - context.now();
    if (remaining <= 0) {
      const missing = unresolved.map((item) => `${item.name}@${item.version}`).join(", ");
      throw new Error(
        `The registry does not serve ${missing} ${context.verifyTimeout}s after publishing. The versions that did go out stay published; re-run this workflow once the cause is understood, and the packages already on the registry are skipped.`,
      );
    }
    const wait = Math.min(VERIFY_POLL_MS, remaining);
    context.log(
      `${unresolved.length} package(s) not served yet; rechecking in ${Math.round(wait / 1000)}s.`,
    );
    await context.sleepImpl(wait);
    pending = unresolved;
  }
}

// On Windows the npm binary resolves to `npm.cmd`, which Node refuses to spawn
// without a shell (CVE-2024-27980); POSIX keeps the direct, unquoted spawn.
function spawnNpm(args, cwd) {
  const windows = process.platform === "win32";
  const result = spawnSync(windows ? "npm.cmd" : "npm", args, {
    cwd,
    shell: windows,
    stdio: "inherit",
  });
  if (result.error) {
    throw new Error(`npm ${args.join(" ")} failed to start: ${result.error.message}`);
  }
  return result.status ?? 1;
}

export async function publishNpm(options) {
  const cwd = options.cwd ?? process.cwd();
  const dryRun = options.dryRun ?? false;
  const context = {
    dryRun,
    fetchImpl: options.fetchImpl ?? fetch,
    log: options.log ?? ((message) => process.stdout.write(`${message}\n`)),
    now: options.now ?? Date.now,
    registry: options.registry ?? DEFAULT_REGISTRY,
    sleepImpl: options.sleepImpl ?? sleep,
    verifyTimeout: options.verifyTimeout ?? 120,
  };
  const runNpm = options.runNpm ?? ((args) => spawnNpm(args, cwd));
  const token = options.token ?? "";

  const entries = (options.packages ?? []).map(normalizeEntry);
  if (entries.length === 0) throw new Error("No package directories or tarballs given.");
  const items = entries.map((entry) => readManifest(entry, cwd));

  // The last entry is the main package: its sidecars are published before it,
  // and it carries the version the release is named after.
  const mainPackage = items.at(-1);
  const distTag = options.distTag || deriveDistTag(mainPackage.version);
  if (!options.distTag) {
    context.log(`Derived dist-tag ${distTag} from version ${mainPackage.version}.`);
  }
  if (distTag === "latest") {
    const prerelease = items.filter((item) => isPrerelease(item.version));
    if (prerelease.length > 0) {
      throw new Error(
        `Refusing to publish the prerelease ${prerelease[0].name}@${prerelease[0].version} to the "latest" dist-tag, which is what an installer takes by default.`,
      );
    }
  }

  if (options.preflightFirstPublish ?? true) {
    if (token === "") {
      await preflightFirstPublish(items, context);
    } else {
      context.log("Skipping the first-publish preflight: a token can publish a new package name.");
    }
  }

  const published = [];
  const skipped = [];
  for (const item of items) {
    const spec = `${item.name}@${item.version}`;
    if (await isVersionPublished(item, context)) {
      context.log(`Skipping ${spec}; that version is already on the registry.`);
      skipped.push(item.entry);
      continue;
    }
    const args = ["publish", item.entry, "--access", options.access ?? "public", "--tag", distTag];
    if (options.provenance ?? true) args.push("--provenance");
    if (dryRun) args.push("--dry-run");
    context.log(`::group::npm publish ${item.entry} (${distTag})`);
    const status = await runNpm(args);
    context.log("::endgroup::");
    if (status !== 0) throw new Error(`npm publish ${item.entry} exited with status ${status}.`);
    published.push(item.entry);
  }

  // A dry run published nothing, so there is nothing for the registry to serve.
  if ((options.verify ?? true) && !dryRun) await verifyPublishedVersions(items, context);

  return { distTag, published, skipped };
}

// A workflow that passes an unset `workflow_dispatch` input through reaches the
// action as an empty string, so empty means "the default", not a parse error.
export function parseBoolean(name, value, fallback) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "") return fallback;
  if (normalized === "true" || normalized === "false") return normalized === "true";
  throw new Error(`Input ${name} must be "true" or "false", not "${value}".`);
}

export function parseTimeout(name, value, fallback) {
  const text = String(value ?? "").trim();
  if (text === "") return fallback;
  const seconds = Number(text);
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > MAX_VERIFY_TIMEOUT) {
    throw new Error(
      `Input ${name} must be a whole number of seconds from 0 to ${MAX_VERIFY_TIMEOUT}, not "${value}".`,
    );
  }
  return seconds;
}

async function main(environment) {
  try {
    const result = await publishNpm({
      access: environment.INPUT_ACCESS || "public",
      distTag: (environment.INPUT_DIST_TAG ?? "").trim(),
      dryRun: parseBoolean("dry-run", environment.INPUT_DRY_RUN, false),
      packages: parsePackages(environment.INPUT_PACKAGES),
      preflightFirstPublish: parseBoolean(
        "preflight-first-publish",
        environment.INPUT_PREFLIGHT_FIRST_PUBLISH,
        true,
      ),
      provenance: parseBoolean("provenance", environment.INPUT_PROVENANCE, true),
      // The reads follow npm's own registry configuration when the job sets it,
      // so they cannot ask npmjs.org about a package published elsewhere.
      registry:
        (environment.npm_config_registry ?? "").trim().replace(/\/$/, "") || DEFAULT_REGISTRY,
      token: (environment.NODE_AUTH_TOKEN ?? "").trim(),
      verify: parseBoolean("verify", environment.INPUT_VERIFY, true),
      verifyTimeout: parseTimeout("verify-timeout", environment.INPUT_VERIFY_TIMEOUT, 120),
    });
    if (environment.GITHUB_OUTPUT) {
      appendFileSync(environment.GITHUB_OUTPUT, `dist-tag=${result.distTag}\n`);
    }
    return 0;
  } catch (error) {
    process.stderr.write(`::error::${error.message}\n`);
    return 1;
  }
}

if (process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main(process.env);
}
