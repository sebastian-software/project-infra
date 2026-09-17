#!/usr/bin/env node
// Holds an npm wrapper of a Rust CLI to a single version: the wrapper's
// `package.json` carries the version of the crate it launches, and every
// platform package in `optionalDependencies` is pinned to exactly that
// version. A wrapper whose version drifts points at a build that does not
// exist — a platform package its launcher refuses, or a release archive
// nothing ever published — and the consumer's first run is what reports it.
// Wire it into the repository's check job so a pull request fails, and
// into the wrapper's `prepublishOnly` script, which is the last point before
// the version becomes immutable on the registry:
//
//   "scripts": { "prepublishOnly": "node scripts/check-cli-version.mjs" }
//
// Defaults to the wrapper manifest one level up and the Cargo manifest of the
// repository root above it. Pass both paths when the layout differs, or when
// the crate inherits `version.workspace = true` from another manifest:
//
//   node scripts/check-cli-version.mjs npm/package.json Cargo.toml

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const manifestPath = path.resolve(
  process.argv[2] ?? path.join(import.meta.dirname, "..", "package.json"),
);
const cargoPath = path.resolve(
  process.argv[3] ?? path.join(import.meta.dirname, "..", "..", "Cargo.toml"),
);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const version = cargoVersion(readFileSync(cargoPath, "utf8"));
const findings = [];

if (manifest.version !== version) {
  findings.push(`the wrapper is ${manifest.version}, while the crate is ${version}`);
}

for (const [name, specifier] of Object.entries(manifest.optionalDependencies ?? {})) {
  // pnpm replaces `workspace:*` with the exact version it publishes, so that
  // specifier is a pin. `workspace:^` and `workspace:~` become ranges, and a
  // range lets a consumer install a platform package this release never built.
  if (specifier === "workspace:*") continue;
  if (specifier !== version) {
    findings.push(`${name} is required as "${specifier}" instead of "${version}"`);
  }
}

if (findings.length > 0) {
  console.error(`${manifest.name} does not carry one version:`);
  for (const finding of findings) console.error(`  ${finding}`);
  process.exit(1);
}

const platforms = Object.keys(manifest.optionalDependencies ?? {}).length;
const counted = `${platforms} platform package${platforms === 1 ? "" : "s"}`;
console.log(`${manifest.name}@${version}: ${counted} on the crate version.`);

/**
 * The version of `[package]`, or of `[workspace.package]` where the crate
 * inherits it. Reading one key out of two named sections needs no TOML parser,
 * and a wrapper that ships to consumers takes no dependency for it.
 */
function cargoVersion(source) {
  const versions = new Map();
  let section = "";
  for (const line of source.split("\n")) {
    const text = line.trim();
    const header = text.match(/^\[([^\]]+)\]/);
    if (header) {
      section = header[1].trim();
      continue;
    }
    // Section-scoped, so a dependency's `version = "1"` cannot be read as the
    // crate's own. `version.workspace = true` does not match and falls through
    // to `[workspace.package]`, which is where that version is declared.
    const value = text.match(/^version\s*=\s*"([^"]+)"/);
    if (value && !versions.has(section)) versions.set(section, value[1]);
  }

  const declared = versions.get("package") ?? versions.get("workspace.package");
  if (declared === undefined) {
    console.error(`${cargoPath} declares no [package] or [workspace.package] version.`);
    process.exit(1);
  }
  return declared;
}
