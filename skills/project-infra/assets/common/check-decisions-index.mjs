#!/usr/bin/env node
// Checks that a project's decision records and their index agree.
//
// Usage: node check-decisions-index.mjs [index-file]
//
// The index defaults to docs/adr/README.md; the records are the NNNN-slug
// files beside it. Point the argument at a documentation site's ADR index to
// check the records on that route instead. Reports every finding at once.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

// The statuses the contributor guide defines. Extend both together.
const statuses = new Set(["proposed", "accepted", "rejected", "deprecated", "superseded"]);

// A record file: four-digit number, slug, Markdown or a site's MDX.
const recordName = /^(\d{4})-[^.]+\.mdx?$/;

const indexFile = resolve(process.argv[2] ?? "docs/adr/README.md");
const recordDir = dirname(indexFile);
const indexName = relative(recordDir, indexFile);
const index = readFileSync(indexFile, "utf8");
const problems = [];

// A table cell and a list item produce the same Markdown link, so the index
// layout stays the project's choice.
const linked = new Set(
  [...index.matchAll(/\]\(\.?\/?([^)#\s]+)/g)]
    .map((match) => match[1])
    .filter((target) => recordName.test(target)),
);

for (const target of linked) {
  try {
    statSync(join(recordDir, target));
  } catch {
    problems.push(`${indexName}: entry for a record that does not exist: ${target}`);
  }
}

const records = readdirSync(recordDir)
  .filter((name) => recordName.test(name))
  .sort();

for (const name of records) {
  const number = recordName.exec(name)[1];
  if (!linked.has(name)) problems.push(`${name}: no entry in ${indexName}`);

  const source = readFileSync(join(recordDir, name), "utf8");
  const heading = source.split("\n").find((line) => line.startsWith("# ")) ?? "";
  const title = /^# ADR-(\d{4}): \S/.exec(heading);
  if (!title) {
    problems.push(`${name}: first heading must read "# ADR-${number}: Title"`);
  } else if (title[1] !== number) {
    problems.push(`${name}: heading ADR-${title[1]} contradicts the file number ${number}`);
  }

  const status = /^- Status:[ \t]*(.+)$/m.exec(source);
  if (!status) {
    problems.push(`${name}: no "- Status:" line`);
    continue;
  }
  // A record may qualify its status ("superseded by ADR-0012"), so the first
  // word carries the vocabulary; case is not part of it.
  const value = status[1].trim().toLowerCase().split(/[\s,]/)[0];
  if (!statuses.has(value)) {
    problems.push(`${name}: status "${status[1].trim()}" is outside the vocabulary`);
  }
}

if (problems.length > 0) {
  console.error(`Decision index check failed (${records.length} records):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`Decision index check passed: ${records.length} records indexed in ${indexName}.`);
