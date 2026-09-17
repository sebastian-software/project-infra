#!/usr/bin/env node
// Refuses to publish a platform package that carries no binary: reads the
// manifest, collects the artifacts it advertises through `bin`, `main`, and
// `exports`, and fails when one of them is missing or empty. Wire it as the
// package's `prepublishOnly` script so every publish path runs it, and as a CI
// step after the build lane downloads its artifacts. Run it from the package
// directory or with that directory as the only argument.

import { readFileSync, statSync } from "node:fs";
import path from "node:path";

const directory = path.resolve(process.argv[2] ?? ".");
const manifest = JSON.parse(readFileSync(path.join(directory, "package.json"), "utf8"));
const name = manifest.name ?? directory;
const artifacts = advertisedArtifacts(manifest);

// A platform package that advertises no artifact is a wiring mistake: the
// manifest has been renamed or the guard sits in the wrapper package, where
// the binaries of the platform packages are not present in the first place.
if (artifacts.length === 0) {
  fail(`${name} advertises no native artifact through "bin", "main", or "exports".`);
}

const missing = artifacts.filter((artifact) => size(path.join(directory, artifact)) === 0);
if (missing.length > 0) {
  // The build matrix leg failed, or its artifact never reached this directory.
  // npm has no opinion about what `main` points at, so publishing succeeds and
  // the consumer that resolves this package fails when it loads the addon.
  fail(
    `${name} would publish with ${missing.join(", ")} missing or empty. ` +
      `Build the package for its platform, or download its artifact, before publishing.`,
  );
}

console.log(`${name}: ${artifacts.join(", ")} present.`);

/** The binary paths this package promises, deduplicated and package-relative. */
function advertisedArtifacts(packageJson) {
  const targets = new Set();
  const bin = packageJson.bin;
  if (typeof bin === "string") targets.add(bin);
  else if (bin && typeof bin === "object") {
    for (const target of Object.values(bin)) {
      if (typeof target === "string") targets.add(target);
    }
  }
  // An addon is reached through `main` or an `exports` condition; only the
  // `.node` entries are this guard's subject, the JavaScript around them is
  // covered by the packed-artifact check.
  collectAddons([packageJson.main, packageJson.exports], targets);
  return [...targets].map((target) => target.replace(/^\.\//, ""));
}

function collectAddons(value, targets) {
  if (typeof value === "string") {
    if (value.endsWith(".node")) targets.add(value);
  } else if (Array.isArray(value)) {
    for (const entry of value) collectAddons(entry, targets);
  } else if (value && typeof value === "object") {
    for (const nested of Object.values(value)) collectAddons(nested, targets);
  }
}

/** Zero for anything that is not a regular file, so both cases read alike. */
function size(filePath) {
  try {
    const stats = statSync(filePath);
    return stats.isFile() ? stats.size : 0;
  } catch {
    return 0;
  }
}

function fail(message) {
  console.error(`Refusing to publish: ${message}`);
  process.exit(1);
}
