#!/usr/bin/env node
// Checks the artifact a consumer receives rather than the tree it was built
// from: packs the package, compares the archive against what the manifest
// advertises, then installs that archive in an empty consumer and loads every
// entry point from there. Run it after the build, from the package directory
// or with that directory as the only argument. Findings are collected and
// reported together, because one missing file usually hides the next.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const directory = path.resolve(process.argv[2] ?? ".");
const manifest = JSON.parse(readFileSync(path.join(directory, "package.json"), "utf8"));
const work = mkdtempSync(path.join(tmpdir(), "verify-pack-"));
const consumer = path.join(work, "consumer");
const findings = [];

try {
  const archive = pack();
  const packed = new Set(archive.files);

  // A `files` entry that matches nothing is a typo or a renamed build output.
  // Neither package manager reports it; the archive just loses that content.
  for (const entry of manifest.files ?? []) {
    const prefix = entry.replace(/^\.?\/|\/?\*.*$|\/$/g, "");
    if (prefix && ![...packed].some((file) => file === prefix || file.startsWith(`${prefix}/`))) {
      findings.push(`"files" lists ${entry}, which contributed nothing to the archive`);
    }
  }

  for (const target of advertisedPaths()) {
    if (!packed.has(target)) {
      findings.push(`the manifest advertises ${target}, which the archive does not contain`);
    }
  }

  // `pnpm publish` embeds only a workspace-root file matching `LICEN{S,C}E{,.*}`
  // and npm force-includes only `license{,.*}` from the package directory, so a
  // compound expression needs every text copied into the package and listed in
  // `files`; otherwise the package states terms it does not carry.
  if (/\s(?:AND|OR|WITH)\s/.test(manifest.license ?? "")) {
    const licenses = [...packed].filter((file) => /^licen[sc]e/i.test(file));
    if (licenses.length < 2) {
      findings.push(`license "${manifest.license}" packs ${licenses.length} license texts`);
    }
  }

  const entries = exportEntries();
  const installed = install(archive.tarball);

  // Type resolution stops at the first matching `types` condition, so a
  // declaration that was never emitted or never packed stays invisible to the
  // compiler until a consumer reaches the condition pointing at it.
  for (const { specifier, types } of entries) {
    for (const declaration of types) {
      if (!existsSync(path.join(installed, declaration))) {
        findings.push(`${specifier} declares types at ${declaration}, which is not installed`);
      }
    }
  }

  loadFromConsumer(entries);

  if (findings.length > 0) {
    console.error(`${manifest.name} fails its packed-artifact check:`);
    for (const finding of findings) console.error(`  ${finding}`);
    process.exit(1);
  }
  console.log(`${manifest.name}@${manifest.version}: ${packed.size} packed files, \
${entries.length} export entries loaded from a clean install.`);
} finally {
  rmSync(work, { force: true, recursive: true });
}

/** Runs a package manager, whose reported output is this check's input. */
function run(command, args, cwd, env) {
  const windows = process.platform === "win32";
  const result = spawnSync(windows ? `${command}.cmd` : command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
    shell: windows,
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? "");
    throw new Error(`${command} ${args.join(" ")} failed in ${cwd}`);
  }
  return result.stdout;
}

function pack() {
  // pnpm packs because only pnpm rewrites a `workspace:*` dependency to the
  // version it publishes; an npm-packed workspace member would ship a
  // specifier no consumer can resolve. npm reports an array, pnpm an object.
  const args = ["pack", "--json", "--pack-destination", work];
  const reported = JSON.parse(run("pnpm", args, directory));
  const result = Array.isArray(reported) ? reported[0] : reported;
  return {
    tarball: path.join(work, path.basename(result.filename)),
    files: result.files.map((file) => file.path),
  };
}

/** Installs the archive alone, so only its own content can satisfy an import. */
function install(tarball) {
  mkdirSync(consumer);
  const empty = { name: "verify-pack-consumer", private: true, type: "module" };
  writeFileSync(path.join(consumer, "package.json"), JSON.stringify(empty));
  // Install scripts stay off: this checks the published files themselves, not
  // what a lifecycle hook could still download on the consumer's machine.
  const args = ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball];
  run("npm", args, consumer, { npm_config_cache: path.join(work, "npm-cache") });
  return path.join(consumer, "node_modules", ...manifest.name.split("/"));
}

/** Every path the manifest promises through its fields, `bin`, and `exports`. */
function advertisedPaths() {
  const targets = new Set();
  const fields = [manifest.main, manifest.module, manifest.types, manifest.bin, manifest.exports];
  collect(fields, targets);
  return [...targets].map((target) => target.replace(/^\.\//, ""));
}

function collect(value, targets) {
  if (typeof value === "string") {
    if (!value.includes("*")) targets.add(value);
  } else if (value && typeof value === "object") {
    for (const nested of Object.values(value)) collect(nested, targets);
  }
}

/** The subpaths a consumer can import, with the promises each one makes. */
function exportEntries() {
  const field = manifest.exports ?? { ".": manifest.main ?? "./index.js" };
  const subpaths =
    typeof field === "object" && Object.keys(field).every((key) => key.startsWith("."))
      ? field
      : { ".": field };
  return Object.entries(subpaths)
    .filter(([subpath]) => !subpath.includes("*"))
    .map(([subpath, condition]) => ({
      specifier: subpath === "." ? manifest.name : `${manifest.name}/${subpath.slice(2)}`,
      // A `require` condition promises that a CommonJS consumer resolves here.
      dual: JSON.stringify(condition).includes(`"require"`),
      types: [...declaredTypes(condition)],
    }));
}

function declaredTypes(condition, found = new Set()) {
  if (condition && typeof condition === "object") {
    for (const [name, value] of Object.entries(condition)) {
      if (name === "types" && typeof value === "string") found.add(value);
      else declaredTypes(value, found);
    }
  }
  return found;
}

/**
 * Loads each entry from inside the consumer, so Node applies the real export
 * conditions instead of a resolution this script emulates. A JSON subpath is
 * left out: importing one needs an import attribute the consumer chooses.
 */
function loadFromConsumer(entries) {
  const probe = path.join(consumer, "probe.mjs");
  const targets = entries.filter(({ specifier }) => !specifier.endsWith(".json"));
  writeFileSync(
    probe,
    `import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
for (const { specifier, dual } of ${JSON.stringify(targets)}) {
  await import(specifier)
  if (dual) require(specifier)
}
`,
  );
  const loaded = spawnSync(process.execPath, [probe], { cwd: consumer, encoding: "utf8" });
  if (loaded.status !== 0) {
    findings.push(`the installed package does not load:\n  ${loaded.stderr.trim()}`);
  }
}
