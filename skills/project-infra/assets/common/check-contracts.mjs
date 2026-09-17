#!/usr/bin/env node
// Checks the two agreements every repository makes with itself.
//
// Usage: node check-contracts.mjs [--section <heading text>] [project-root]
//
//   1. Gate commands. Every command in a fenced sh, shell, or bash block under
//      a CONTRIBUTING.md heading that names a check, a gate, or the pull
//      request, subsections included, runs as a `run:` step in some workflow
//      under .github/workflows. Pass --section to select a differently named
//      heading instead.
//   2. MSRV. When the root Cargo.toml declares rust-version, no workflow, no
//      README.md, and no CONTRIBUTING.md states a different version where the
//      text reads as a support floor.
//
// Reports every finding at once. Assertions that hold only for one repository
// belong beside this file in that repository, not in this excerpt.

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const argv = process.argv.slice(2);
const flag = argv.indexOf("--section");
const section = flag === -1 ? null : argv[flag + 1].toLowerCase();
const skipped = flag === -1 ? new Set() : new Set([flag, flag + 1]);
const root = resolve(argv.find((_, index) => !skipped.has(index)) ?? ".");
const where = section
  ? `a "${section}" heading`
  : "a heading naming a check, a gate, or the pull request";
const problems = [];

const read = (file) => {
  try {
    return readFileSync(join(root, file), "utf8");
  } catch {
    return null;
  }
};

// `./scripts/check.sh` and `scripts/check.sh` start the same file: a command
// containing a slash is resolved from the working directory either way, so the
// leading `./` is presentation. A bare name is a PATH lookup and stays distinct.
const normalize = (command) => command.replace(/^\.\//, "");

const contributing = read("CONTRIBUTING.md");
if (contributing === null) {
  console.error("No CONTRIBUTING.md at the project root; nothing states the gate.");
  process.exit(1);
}

const documented = new Set();
// A selected heading covers its subsections: a gate section split by stack
// keeps every block until a heading of the same or a higher level ends it.
let selected = 0;
let fence = null;
for (const line of contributing.split("\n")) {
  const marker = /^`{3,}\s*([\w-]*)/.exec(line);
  if (marker) {
    fence = fence === null ? marker[1].toLowerCase() : null;
    continue;
  }
  const heading = /^(#{1,6})\s+(.*)$/.exec(line);
  if (heading && fence === null) {
    const level = heading[1].length;
    const text = heading[2].trim().toLowerCase();
    const matches = section ? text.includes(section) : /check|gate|pull request/.test(text);
    if (matches) selected = level;
    else if (level <= selected) selected = 0;
    continue;
  }
  if (!selected || !["sh", "shell", "bash"].includes(fence ?? "")) continue;
  const command = line.trim();
  if (command !== "" && !command.startsWith("#")) documented.add(command);
}

let workflows = [];
try {
  workflows = readdirSync(join(root, ".github/workflows")).filter((name) => /\.ya?ml$/.test(name));
} catch {
  problems.push("no .github/workflows directory, so no documented command can run in CI");
}

const executed = new Set();
for (const name of workflows) {
  const lines = read(join(".github/workflows", name)).split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const step = /^(\s*)(?:-\s+)?run:[ \t]*(.*)$/.exec(lines[i]);
    if (step === null) continue;
    const value = step[2].trim();
    if (!/^[|>][-+\d]*$/.test(value)) {
      executed.add(normalize(value));
      continue;
    }
    // A block scalar: every line indented past the key is one command line.
    for (let j = i + 1; j < lines.length; j += 1) {
      if (lines[j].trim() === "") continue;
      if (lines[j].search(/\S/) <= step[1].length) break;
      executed.add(normalize(lines[j].trim()));
    }
  }
}

// A check that silently compares an empty set reports success forever.
if (documented.size === 0) problems.push(`CONTRIBUTING.md: no shell block under ${where}`);
for (const command of documented) {
  if (!executed.has(normalize(command))) {
    problems.push(`CONTRIBUTING.md documents a command no workflow runs: ${command}`);
  }
}

// 1.94 and 1.94.0 are one floor written two ways; 1.93 and 1.94.1 are not.
const agrees = (found, msrv) => {
  const width = Math.min(found.split(".").length, msrv.split(".").length);
  const head = (value) => value.split(".").slice(0, width).join(".");
  return head(found) === head(msrv);
};

const cargo = read("Cargo.toml");
const declared = cargo === null ? null : /^\s*rust-version\s*=\s*"([\d.]+)"/m.exec(cargo);
if (declared !== null) {
  const contexts = [
    /toolchain[:@]\s*"?v?(\d+\.\d+(?:\.\d+)?)/gi,
    /rust-version[^\n\d]{0,12}(\d+\.\d+(?:\.\d+)?)/gi,
    /\bMSRV\b[^\n\d]{0,16}(\d+\.\d+(?:\.\d+)?)/gi,
    /\bRust\s+(\d+\.\d+(?:\.\d+)?)/gi,
  ];
  const scanned = workflows.map((name) => `.github/workflows/${name}`);
  for (const file of ["README.md", "CONTRIBUTING.md", ...scanned]) {
    const source = read(file);
    if (source === null) continue;
    // Two patterns can describe one phrase ("MSRV is Rust 1.88"). They end at
    // the same literal, so that position reports the place once.
    const reported = new Set();
    for (const context of contexts) {
      for (const match of source.matchAll(context)) {
        const place = match.index + match[0].length;
        if (agrees(match[1], declared[1]) || reported.has(place)) continue;
        reported.add(place);
        problems.push(
          `${file}: "${match[0].trim()}" contradicts rust-version ${declared[1]} in Cargo.toml`,
        );
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`Contract check failed (${problems.length} findings):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

const msrv = declared === null ? "no MSRV declared" : `MSRV ${declared[1]} stated once`;
console.log(
  `Contract check passed: every documented gate command runs in CI (${documented.size}), ${msrv}.`,
);
