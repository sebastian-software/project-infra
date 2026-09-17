#!/usr/bin/env node
// Checks that every performance figure a project publishes traces to a
// committed benchmark report.
//
// Usage: node check-published-numbers.mjs [claim-map] [project-root]
//
// The claim map defaults to benchmark/published-numbers.json; every path in it
// is relative to the project root, which defaults to the working directory.
// The map registers one entry per published figure:
//
//   {
//     "entries": [
//       {
//         "id": "readme.parse",
//         "report": "benchmark/results/parse-v1-<sha>.json",
//         "value": "scenarios[id=parse/large-input].statistics.median_mib_per_sec",
//         "published": 725,
//         "tolerance": 4,
//         "documents": [
//           { "file": "README.md", "contains": "**725 MiB/s**" },
//           { "file": "site/app/routes/home.tsx", "contains": "rate: 725" }
//         ]
//       }
//     ],
//     "sweep": {
//       "pattern": "\\b\\d+(?:\\.\\d+)?\\s?[MG]iB/s\\b",
//       "files": ["site/app/routes"],
//       "extensions": [".md", ".mdx", ".ts", ".tsx"],
//       "allowed": [{ "file": "README.md", "value": "309 MiB/s", "reason": "..." }]
//     }
//   }
//
// `value` walks the report: `name` reads a property, `name[2]` an index, and
// `name[field=text]` the list element whose field holds that text, which is how
// a scenario is selected by its id. `published` is the figure as the documents
// print it and `tolerance` the distance from the report still allowed, so a
// rounded claim stays valid while a rerun that moves the number does not.
//
// The optional `sweep` block catches a figure nobody registered: every match of
// `pattern` in the registered documents, in the files and directories under
// `files`, and in a walked directory's files carrying one of `extensions`, has
// to sit inside a registered literal or be listed in `allowed` with a reason.
// Reports every finding at once.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const argv = process.argv.slice(2);
const root = resolve(argv[1] ?? ".");
const mapPath = resolve(root, argv[0] ?? "benchmark/published-numbers.json");
const problems = [];
const documents = new Map();

// A path segment: a property name and, where it selects into a list, the index
// or `field=text` pair in brackets. Sticky, so a selector may contain the dots
// and slashes a scenario id uses.
const SEGMENT = /(?<key>[^.[\]]+)(?:\[(?<selector>[^\]]*)\])?/y;

const EXTENSIONS = [".md", ".mdx", ".ts", ".tsx"];

function read(file) {
  if (!documents.has(file)) {
    try {
      documents.set(file, readFileSync(resolve(root, file), "utf8"));
    } catch (error) {
      documents.set(file, null);
      problems.push(`${file}: cannot be read: ${error.message}`);
    }
  }
  return documents.get(file);
}

function segments(path) {
  const parts = [];
  let index = 0;
  while (index < path.length) {
    SEGMENT.lastIndex = index;
    const match = SEGMENT.exec(path);
    if (match === null) return null;
    parts.push(match.groups);
    index = SEGMENT.lastIndex;
    if (index < path.length && path[index] !== ".") return null;
    index += 1;
  }
  return parts.length > 0 ? parts : null;
}

// The value a `value` path names, or an explanation of where the walk stopped:
// a report that no longer carries the scenario is the failure this catches.
function resolveValue(report, path) {
  const parts = segments(path);
  if (parts === null) throw new Error(`value path "${path}" does not parse`);
  let current = report;
  for (const { key, selector } of parts) {
    if (current === null || typeof current !== "object" || !(key in current)) {
      throw new Error(`the report has no "${key}" for value path "${path}"`);
    }
    current = current[key];
    if (selector === undefined) continue;
    if (!Array.isArray(current)) throw new Error(`"${key}" is not a list in the report`);
    const equals = selector.indexOf("=");
    current =
      equals === -1
        ? current[Number(selector)]
        : current.find(
            (item) =>
              item !== null &&
              typeof item === "object" &&
              String(item[selector.slice(0, equals)]) === selector.slice(equals + 1),
          );
    if (current === undefined) throw new Error(`the report has no "${key}[${selector}]"`);
  }
  return current;
}

function checkEntry(entry) {
  const where = entry.id ?? entry.report;
  let measured;
  try {
    const report = JSON.parse(readFileSync(resolve(root, entry.report), "utf8"));
    measured = resolveValue(report, entry.value);
  } catch (error) {
    problems.push(`${where}: ${entry.report}: ${error.code ?? error.message}`);
    return;
  }
  if (typeof measured !== "number" || !Number.isFinite(measured)) {
    problems.push(`${where}: "${entry.value}" is ${JSON.stringify(measured)}, not a number`);
    return;
  }
  const distance = Math.abs(measured - entry.published);
  if (distance > entry.tolerance) {
    problems.push(
      `${where}: publishes ${entry.published}, but ${entry.report} measured ` +
        `${measured} (off by ${distance.toFixed(3)}, tolerance ${entry.tolerance})`,
    );
  }
  for (const document of entry.documents ?? []) {
    const text = read(document.file);
    if (text !== null && !text.includes(document.contains)) {
      problems.push(
        `${where}: ${document.file} no longer contains ${JSON.stringify(document.contains)}`,
      );
    }
  }
}

function sweptFiles(sweep, registered) {
  const extensions = sweep.extensions ?? EXTENSIONS;
  const files = new Set(registered);
  for (const target of sweep.files ?? []) {
    const path = resolve(root, target);
    if (!statSync(path).isDirectory()) {
      files.add(target);
      continue;
    }
    for (const entry of readdirSync(path, { recursive: true, withFileTypes: true })) {
      if (entry.isFile() && extensions.includes(extname(entry.name))) {
        files.add(relative(root, join(entry.parentPath, entry.name)));
      }
    }
  }
  return [...files].sort();
}

function sweep(block, entries) {
  const literals = new Map();
  for (const entry of entries) {
    for (const document of entry.documents ?? []) {
      literals.set(document.file, [...(literals.get(document.file) ?? []), document.contains]);
    }
  }
  const allowed = block.allowed ?? [];
  const pattern = new RegExp(block.pattern, "g");
  let swept = 0;
  for (const file of sweptFiles(block, literals.keys())) {
    const text = read(file);
    if (text === null) continue;
    for (const found of text.match(pattern) ?? []) {
      swept += 1;
      const registered = (literals.get(file) ?? []).some((literal) => literal.includes(found));
      const excepted = allowed.some((item) => item.file === file && item.value === found);
      if (!registered && !excepted) {
        problems.push(
          `${file}: ${JSON.stringify(found)} is published without a report; register it in ` +
            `${relative(root, mapPath)} or list it under "allowed" with a reason`,
        );
      }
    }
  }
  return swept;
}

const map = JSON.parse(readFileSync(mapPath, "utf8"));
for (const entry of map.entries) checkEntry(entry);
const swept = map.sweep === undefined ? 0 : sweep(map.sweep, map.entries);

if (problems.length > 0) {
  console.error(`Published-number check failed (${problems.length} findings):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(
  `Published-number check passed: ${map.entries.length} figures in ${documents.size} documents, ` +
    `${swept} mentions swept.`,
);
