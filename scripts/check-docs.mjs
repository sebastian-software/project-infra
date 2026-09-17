#!/usr/bin/env node
// Checks this repository's documentation and skill package:
//
//   1. every relative Markdown link resolves, including heading anchors;
//   2. the installed skill package links only within its own directory;
//   3. the skill frontmatter carries the fields its format requires.
//
// oxfmt already parses Markdown, JSON, YAML, and TypeScript, so this script
// does not repeat those checks. Run it through scripts/check.sh.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const skillDir = resolve(root, "skills/project-infra");
const skipDirs = new Set([".git", "node_modules"]);
const problems = [];

function walk(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(path));
    else if (entry.name.endsWith(".md")) found.push(path);
  }
  return found;
}

// GitHub derives a heading anchor by lowercasing, dropping characters other
// than letters, digits, spaces, and hyphens, then joining words with hyphens.
function anchors(markdown) {
  return markdown
    .split("\n")
    .filter((line) => /^#{1,6}\s+/.test(line))
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/, "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-"),
    );
}

const markdownFiles = walk(root);
let linkCount = 0;

for (const file of markdownFiles) {
  const source = readFileSync(file, "utf8");
  const where = relative(root, file);

  for (const match of source.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const link = match[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith("//")) continue;
    linkCount += 1;

    const [path, fragment] = link.split("#");
    const target = path ? resolve(dirname(file), path) : file;

    let stats;
    try {
      stats = statSync(target);
    } catch {
      problems.push(`${where}: link target missing: ${link}`);
      continue;
    }

    if (fragment && stats.isFile() && target.endsWith(".md")) {
      const known = anchors(readFileSync(target, "utf8"));
      if (!known.includes(fragment)) {
        problems.push(`${where}: no heading for anchor: ${link}`);
      }
    }

    // The installer copies only the skill directory, so a link that leaves it
    // resolves in this repository but breaks in every consuming project.
    if (file.startsWith(skillDir + sep) && !target.startsWith(skillDir + sep)) {
      problems.push(`${where}: link leaves the installed package: ${link}`);
    }
  }
}

const skillEntry = join(skillDir, "SKILL.md");
const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(readFileSync(skillEntry, "utf8"));

if (!frontmatter) {
  problems.push("skills/project-infra/SKILL.md: no frontmatter block");
} else {
  const fields = new Map(
    frontmatter[1]
      .split("\n")
      .map((line) => /^([a-z][a-z0-9_-]*):\s*(.*)$/i.exec(line))
      .filter(Boolean)
      .map((match) => [match[1], match[2].trim()]),
  );

  if (fields.get("name") !== "project-infra") {
    problems.push(
      `skills/project-infra/SKILL.md: name must be project-infra, found ${fields.get("name")}`,
    );
  }
  if (!fields.get("description")) {
    problems.push("skills/project-infra/SKILL.md: description is required for skill discovery");
  }
}

const summary = `${markdownFiles.length} Markdown files, ${linkCount} relative links`;

if (problems.length > 0) {
  console.error(`Documentation check failed (${summary}):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`Documentation check passed: ${summary}.`);
