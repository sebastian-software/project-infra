#!/usr/bin/env node
// The gate between a draft release and a public one. A build matrix reports
// success per leg, which says that each job ran — not that every asset reached
// the release: an upload can fail after the build, a leg can be skipped by a
// condition, and a re-run can produce an asset under a name nothing else
// checks. What a user downloads is the release, so the release is what gets
// asserted, from the asset list the API returns.
//
// `verify` compares that list against the expected set and fails when
// something is missing, which leaves the release a draft. `sums` assembles one
// `SHA256SUMS` from the per-asset checksums already on the release, so the
// combined list and the single-asset files cannot disagree.
//
// The `gh` calls stay in the action's steps; this script owns the comparison
// and the assembly, which is the part the tests cover.
import { appendFileSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";

const SHA256_RECORD = /^(?<hash>[0-9a-f]{64})\s+\*?(?<file>\S.*)$/;

export function parseExpected(value) {
  const entries = (value ?? "")
    .split(/\r?\n/)
    .flatMap((line) => line.split(/\s*,\s*/))
    .map((entry) => entry.trim())
    // A `|` block keeps `#` as text, so the list strips its own comments; a
    // list of a dozen asset names is otherwise unreadable per target.
    .filter((entry) => entry.length > 0 && !entry.startsWith("#"));
  if (entries.length === 0) throw new Error("the `expected` input is empty");
  if (entries.length === 1 && /^\d+$/.test(entries[0])) {
    return { count: Number(entries[0]), kind: "count" };
  }
  return { kind: "names", names: entries };
}

// Extra assets are not a problem: a release can also carry an installer
// script, a generated formula, or the `SHA256SUMS` a previous run uploaded.
// The question is only whether everything that was promised is there.
export function assetProblems(expected, actual) {
  if (expected.kind === "count") {
    if (actual.length >= expected.count) return [];
    return [
      `the release carries ${actual.length} assets, fewer than the expected ${expected.count}`,
    ];
  }
  const present = new Set(actual);
  return expected.names
    .filter((name) => !present.has(name))
    .map((name) => `missing asset: ${name}`);
}

// A checksum file has to describe the asset it is named after. One that names
// another file verifies nothing a consumer would notice, because `sha256sum -c`
// reads the name from the record rather than from the file it was downloaded
// as.
export function checksumRecord(asset, text) {
  const expected = asset.replace(/\.sha256$/, "");
  const line = text.split("\n").find((entry) => entry.trim().length > 0) ?? "";
  const record = SHA256_RECORD.exec(line.trim());
  if (record === null) {
    throw new Error(`${asset}: not a SHA-256 record: "${line.trim()}"`);
  }
  const file = record.groups.file.trim();
  if (file !== expected) {
    throw new Error(`${asset}: the record names ${file}, not ${expected}`);
  }
  return { file, hash: record.groups.hash };
}

// `sha256sum -c SHA256SUMS` reads this format: the hash, two spaces, the file
// name. Sorted by name so a re-run produces the same file.
export function assembleSums(files) {
  const records = files
    .map((entry) => checksumRecord(entry.name, entry.text))
    .sort((left, right) => (left.file < right.file ? -1 : 1));
  if (records.length === 0) throw new Error("no checksum files to assemble");
  return `${records.map((record) => `${record.hash}  ${record.file}`).join("\n")}\n`;
}

function emit(outputs) {
  const target = process.env.GITHUB_OUTPUT;
  for (const [key, value] of Object.entries(outputs)) {
    if (target === undefined || target.length === 0) {
      process.stdout.write(`${key}=${value}\n`);
    } else {
      appendFileSync(target, `${key}=${value}\n`, "utf8");
    }
  }
}

function verifyCommand([path]) {
  if (path === undefined) throw new Error("verify needs the path of the release JSON");
  const release = JSON.parse(readFileSync(path, "utf8"));
  const assets = (release.assets ?? []).map((asset) => asset.name);
  const expected = parseExpected(process.env.INPUT_EXPECTED);
  const problems = assetProblems(expected, assets);
  const tag = process.env.TAG ?? "the release";

  if (problems.length > 0) {
    const scope =
      expected.kind === "count"
        ? `${expected.count} assets`
        : `${expected.names.length} named assets`;
    for (const problem of problems) process.stderr.write(`  ${problem}\n`);
    process.stderr.write(
      `::error::${tag} does not carry the expected ${scope}; it stays a draft.\n`,
    );
    return 1;
  }

  emit({ assets: JSON.stringify(assets) });
  process.stdout.write(`${tag}: ${assets.length} assets, the expected set is complete.\n`);
  return 0;
}

function sumsCommand([directory, output]) {
  if (directory === undefined || output === undefined) {
    throw new Error("sums needs a directory of .sha256 files and an output path");
  }
  const files = readdirSync(directory)
    .filter((name) => name.endsWith(".sha256"))
    .sort()
    .map((name) => ({ name, text: readFileSync(`${directory}/${name}`, "utf8") }));

  const sums = assembleSums(files);
  writeFileSync(output, sums, "utf8");
  process.stdout.write(`Assembled ${files.length} checksums into ${output}:\n${sums}`);
  return 0;
}

function main(argv) {
  const [command, ...rest] = argv;
  if (command === "verify") return verifyCommand(rest);
  if (command === "sums") return sumsCommand(rest);
  throw new Error(`unknown command "${command ?? ""}"; expected verify or sums`);
}

if (process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    process.stderr.write(`::error::finish-release: ${error.message}\n`);
    process.exit(2);
  }
}
