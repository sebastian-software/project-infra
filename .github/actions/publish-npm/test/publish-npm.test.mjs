// The publish loop is exercised against a local registry served by node:http,
// so a test asserts what the action does with a 200, a 404 and a 500 without
// reaching npmjs.org and without waiting for real propagation. npm itself is
// injected, because a test that publishes is not a test.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { promisify } from "node:util";
import { gzipSync } from "node:zlib";

import {
  deriveDistTag,
  normalizeEntry,
  parseBoolean,
  parseTimeout,
  publishNpm,
} from "../publish-npm.mjs";

const TAR_BLOCK = 512;
const script = join(import.meta.dirname, "..", "publish-npm.mjs");

// A registry that answers the two documents the action reads: the abbreviated
// packument for "does this name exist" and the version document for "is this
// version published". `publishAfter` makes a spec appear on a later lookup, the
// way propagation does; `failWith` answers a status the action must not read as
// "not published".
async function startRegistry(t, options = {}) {
  const published = new Set(options.published ?? []);
  const publishAfter = new Map(Object.entries(options.publishAfter ?? {}));
  const lookups = new Map();
  const requests = [];

  const server = createServer((request, response) => {
    requests.push(request.url);
    if (options.failWith !== undefined) {
      response.writeHead(options.failWith).end("{}");
      return;
    }
    const [name, version] = request.url.slice(1).split("/").map(decodeURIComponent);
    if (version === undefined) {
      const known = [...published].some((spec) => spec.startsWith(`${name}@`));
      if (known) response.writeHead(200).end(JSON.stringify({ name, versions: {} }));
      else response.writeHead(404).end('{"error":"Not found"}');
      return;
    }
    const spec = `${name}@${version}`;
    const seen = (lookups.get(spec) ?? 0) + 1;
    lookups.set(spec, seen);
    const due = publishAfter.get(spec);
    if (published.has(spec) || (due !== undefined && seen >= due)) {
      response.writeHead(200).end(JSON.stringify({ name, version }));
    } else {
      response.writeHead(404).end('{"error":"Not found"}');
    }
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  return { requests, url: `http://127.0.0.1:${port}` };
}

function workspace(t, manifests) {
  const root = mkdtempSync(join(tmpdir(), "publish-npm-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  for (const [directory, manifest] of Object.entries(manifests)) {
    mkdirSync(join(root, directory), { recursive: true });
    writeFileSync(join(root, directory, "package.json"), JSON.stringify(manifest));
  }
  return root;
}

// A minimal ustar archive with the one entry the action reads, so the tarball
// path is tested against the format rather than against a packed fixture.
function writeTarball(path, manifest) {
  const body = Buffer.from(JSON.stringify(manifest), "utf8");
  // Every field is NUL-terminated, and the header starts out zero-filled, so
  // each write leaves the terminator the format expects behind it.
  const header = Buffer.alloc(TAR_BLOCK);
  header.write("package/package.json", 0, "utf8");
  header.write("0000644", 100, "utf8");
  header.write("0000000", 108, "utf8");
  header.write("0000000", 116, "utf8");
  header.write(body.length.toString(8).padStart(11, "0"), 124, "utf8");
  header.write("00000000000", 136, "utf8");
  header.write("        ", 148, "utf8");
  header.write("0", 156, "utf8");
  header.write("ustar", 257, "utf8");
  header.write("00", 263, "utf8");
  const checksum = header.reduce((total, byte) => total + byte, 0);
  header.write(checksum.toString(8).padStart(6, "0"), 148, "utf8");
  header.write(" ", 155, "utf8");
  const padding = Buffer.alloc((TAR_BLOCK - (body.length % TAR_BLOCK)) % TAR_BLOCK);
  const end = Buffer.alloc(TAR_BLOCK * 2);
  writeFileSync(path, gzipSync(Buffer.concat([header, body, padding, end])));
}

// A clock that only moves when the action waits, so a poll budget is asserted
// without a test that takes two minutes.
function clock() {
  let current = 0;
  return {
    now: () => current,
    sleepImpl: async (milliseconds) => {
      current += milliseconds;
    },
  };
}

function recorder(status = 0) {
  const calls = [];
  return {
    calls,
    runNpm: (args) => {
      calls.push(args);
      return status;
    },
  };
}

function collector() {
  const lines = [];
  return { lines, log: (message) => lines.push(message) };
}

test("the dist-tag follows the version's prerelease identifier", () => {
  assert.equal(deriveDistTag("1.2.3"), "latest");
  assert.equal(deriveDistTag("1.2.3-rc.1"), "rc");
  assert.equal(deriveDistTag("1.2.3-next.4"), "next");
  assert.equal(deriveDistTag("1.2.3-1"), "next");
  assert.equal(deriveDistTag("1.2.3-beta.1+build.5"), "beta");
});

test("a package argument becomes a local path npm cannot read as a registry spec", () => {
  assert.equal(normalizeEntry("artifacts/tool-1.0.0.tgz"), "./artifacts/tool-1.0.0.tgz");
  assert.equal(normalizeEntry("./artifacts/tool-1.0.0.tgz"), "./artifacts/tool-1.0.0.tgz");
  assert.equal(normalizeEntry("/tmp/tool-1.0.0.tgz"), "/tmp/tool-1.0.0.tgz");
  // `npm/darwin-arm64` is the GitHub shorthand `owner/repo`, and `tool` names a
  // package on the registry; both publish something other than the checkout.
  assert.equal(normalizeEntry("npm/darwin-arm64"), "./npm/darwin-arm64");
  assert.equal(normalizeEntry("tool"), "./tool");
  assert.equal(normalizeEntry("."), ".");
});

test("a version the registry already carries is skipped, and the rest is published", async (t) => {
  const registry = await startRegistry(t, { published: ["sidecar@1.2.3"] });
  const cwd = workspace(t, {
    main: { name: "tool", version: "1.2.3" },
    sidecar: { name: "sidecar", version: "1.2.3" },
  });
  const npm = recorder();
  const result = await publishNpm({
    cwd,
    packages: ["sidecar", "main"],
    preflightFirstPublish: false,
    registry: registry.url,
    runNpm: npm.runNpm,
    verify: false,
    ...collector(),
  });

  assert.deepEqual(result, { distTag: "latest", published: ["./main"], skipped: ["./sidecar"] });
  assert.deepEqual(npm.calls, [
    ["publish", "./main", "--access", "public", "--tag", "latest", "--provenance"],
  ]);
});

test("a registry error fails the run instead of republishing an existing version", async (t) => {
  const registry = await startRegistry(t, { failWith: 500 });
  const cwd = workspace(t, { main: { name: "tool", version: "1.2.3" } });
  const npm = recorder();
  await assert.rejects(
    publishNpm({
      cwd,
      packages: ["main"],
      preflightFirstPublish: false,
      registry: registry.url,
      runNpm: npm.runNpm,
      sleepImpl: async () => {},
      verify: false,
      ...collector(),
    }),
    /Registry lookup failed .*HTTP 500.*Refusing to guess/s,
  );
  assert.deepEqual(npm.calls, []);
});

test("the preflight names every package that has never been published", async (t) => {
  const registry = await startRegistry(t, { published: ["tool@1.0.0"] });
  const cwd = workspace(t, {
    main: { name: "tool", version: "1.2.3" },
    sidecar: { name: "sidecar", version: "1.2.3" },
  });
  const npm = recorder();
  await assert.rejects(
    publishNpm({
      cwd,
      packages: ["sidecar", "main"],
      registry: registry.url,
      runNpm: npm.runNpm,
      verify: false,
      ...collector(),
    }),
    /1 package\(s\) have never been published.*sidecar/s,
  );
  assert.deepEqual(npm.calls, []);
});

test("a fallback token skips the preflight, because it can publish a new name", async (t) => {
  const registry = await startRegistry(t);
  const cwd = workspace(t, { main: { name: "tool", version: "1.2.3" } });
  const npm = recorder();
  const log = collector();
  const result = await publishNpm({
    cwd,
    log: log.log,
    packages: ["main"],
    registry: registry.url,
    runNpm: npm.runNpm,
    token: "npm_secret",
    verify: false,
  });

  assert.deepEqual(result.published, ["./main"]);
  assert.deepEqual(registry.requests, ["/tool/1.2.3"]);
  assert.ok(log.lines.some((line) => line.includes("Skipping the first-publish preflight")));
});

test("a dry run rehearses the publish, warns about a first publish, and verifies nothing", async (t) => {
  const registry = await startRegistry(t);
  const cwd = workspace(t, { main: { name: "tool", version: "1.2.3-rc.1" } });
  const npm = recorder();
  const log = collector();
  const result = await publishNpm({
    cwd,
    dryRun: true,
    log: log.log,
    packages: ["main"],
    registry: registry.url,
    runNpm: npm.runNpm,
  });

  assert.equal(result.distTag, "rc");
  assert.deepEqual(npm.calls, [
    ["publish", "./main", "--access", "public", "--tag", "rc", "--provenance", "--dry-run"],
  ]);
  assert.ok(log.lines.some((line) => line.startsWith("::warning::")));
  // The version lookup for the skip decision is the last registry read: a dry
  // run publishes nothing, so there is nothing to verify afterwards.
  assert.deepEqual(registry.requests, ["/tool", "/tool/1.2.3-rc.1"]);
});

test("verification waits for a version the registry does not serve yet", async (t) => {
  const registry = await startRegistry(t, { publishAfter: { "tool@1.2.3": 3 } });
  const cwd = workspace(t, { main: { name: "tool", version: "1.2.3" } });
  const time = clock();
  const log = collector();
  await publishNpm({
    cwd,
    log: log.log,
    packages: ["main"],
    preflightFirstPublish: false,
    registry: registry.url,
    runNpm: recorder().runNpm,
    verifyTimeout: 120,
    ...time,
  });

  assert.ok(log.lines.some((line) => line.includes("not served yet")));
  assert.ok(log.lines.includes("Verified 1 package(s) on the registry."));
  assert.equal(time.now(), 15_000);
});

test("verification fails after its budget and says the published versions stay", async (t) => {
  const registry = await startRegistry(t);
  const cwd = workspace(t, { main: { name: "tool", version: "1.2.3" } });
  const time = clock();
  await assert.rejects(
    publishNpm({
      cwd,
      packages: ["main"],
      preflightFirstPublish: false,
      registry: registry.url,
      runNpm: recorder().runNpm,
      verifyTimeout: 30,
      ...time,
      ...collector(),
    }),
    /does not serve tool@1\.2\.3 30s after publishing.*are skipped/s,
  );
  assert.equal(time.now(), 30_000);
});

test("a packed tarball carries the name and version the registry is asked about", async (t) => {
  const cwd = workspace(t, {});
  writeTarball(join(cwd, "tool-2.0.0-rc.3.tgz"), { name: "tool", version: "2.0.0-rc.3" });
  const registry = await startRegistry(t, { published: ["tool@1.0.0"] });
  const npm = recorder();
  const result = await publishNpm({
    cwd,
    packages: ["tool-2.0.0-rc.3.tgz"],
    registry: registry.url,
    runNpm: npm.runNpm,
    verify: false,
  });

  assert.equal(result.distTag, "rc");
  assert.deepEqual(npm.calls, [
    ["publish", "./tool-2.0.0-rc.3.tgz", "--access", "public", "--tag", "rc", "--provenance"],
  ]);
  assert.deepEqual(registry.requests, ["/tool", "/tool/2.0.0-rc.3"]);
});

test("an explicit latest dist-tag is refused for a prerelease version", async (t) => {
  const registry = await startRegistry(t);
  const cwd = workspace(t, { main: { name: "tool", version: "1.2.3-rc.1" } });
  const npm = recorder();
  await assert.rejects(
    publishNpm({
      cwd,
      distTag: "latest",
      packages: ["main"],
      registry: registry.url,
      runNpm: npm.runNpm,
      ...collector(),
    }),
    /Refusing to publish the prerelease tool@1\.2\.3-rc\.1 to the "latest" dist-tag/,
  );
  assert.deepEqual(npm.calls, []);
});

test("an unreadable package entry is reported with its path", async (t) => {
  const registry = await startRegistry(t);
  const cwd = workspace(t, {});
  await assert.rejects(
    publishNpm({ cwd, packages: ["missing"], registry: registry.url, ...collector() }),
    /Cannot read the manifest of \.\/missing/,
  );
});

test("an empty input falls back to the default, and a value that is neither is rejected", () => {
  assert.equal(parseBoolean("verify", "", true), true);
  assert.equal(parseBoolean("verify", "false", true), false);
  assert.throws(() => parseBoolean("verify", "yes", true), /must be "true" or "false"/);
  assert.equal(parseTimeout("verify-timeout", "", 120), 120);
  assert.equal(parseTimeout("verify-timeout", "0", 120), 0);
  assert.throws(() => parseTimeout("verify-timeout", "3600", 120), /from 0 to 1800/);
  assert.throws(() => parseTimeout("verify-timeout", "soon", 120), /from 0 to 1800/);
});

// The script runs as its own process, the way the composite action starts it,
// so the fake registry has to keep answering while it runs: `execFile` is
// awaited rather than run synchronously, which would block this event loop.
test("the action entry point reads its inputs and writes the dist-tag output", async (t) => {
  const registry = await startRegistry(t, { published: ["tool@1.2.3", "sidecar@1.2.3"] });
  const cwd = workspace(t, {
    main: { name: "tool", version: "1.2.3" },
    sidecar: { name: "sidecar", version: "1.2.3" },
  });
  const output = join(cwd, "github-output");
  writeFileSync(output, "");
  const { stdout } = await promisify(execFile)(process.execPath, [script], {
    cwd,
    env: {
      ...process.env,
      GITHUB_OUTPUT: output,
      INPUT_PACKAGES: "sidecar\nmain\n",
      INPUT_VERIFY_TIMEOUT: "10",
      NODE_AUTH_TOKEN: "",
      npm_config_registry: registry.url,
    },
  });

  assert.equal(readFileSync(output, "utf8"), "dist-tag=latest\n");
  assert.match(stdout, /Skipping tool@1\.2\.3; that version is already on the registry\./);
  assert.match(stdout, /Verified 2 package\(s\) on the registry\./);
});
