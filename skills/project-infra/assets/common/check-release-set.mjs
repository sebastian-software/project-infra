#!/usr/bin/env node
// Checks that every version a release has to rewrite is covered by a Release
// Please updater and already agrees with the release manifest.
//
// Usage: node check-release-set.mjs [config-file] [manifest-file] [--ignore <path>]...
//
// The files default to release-please-config.json and
// .release-please-manifest.json; run the check from the repository root.
// Repeat --ignore for a tracked path, or a directory holding such paths, that
// carries a version of its own and is not part of the release: a fixture crate
// or a configuration excerpt. An ignored path leaves both the scan and the
// updater list.
//
// The scan reads the tracked tree through `git ls-files`, so ignored build
// output never counts, and reports for every package.json, Cargo.toml, npm and
// Cargo lockfile entry, and `x-release-please-version` annotation:
//
//   - a version no updater writes, which the next release leaves stale;
//   - a version that disagrees with its component's manifest entry;
//   - an updater whose file or field does not exist, which writes nothing.
//
// It knows the files the `simple`, `node` and `rust` strategies update by
// themselves, both `extra-files` forms, and `$.a.b.c` jsonpaths including the
// `$.package[?(@.name.value=="crate")].version` form Cargo lockfiles use. An
// updater it cannot interpret is reported, never passed silently.
//
// Out of scope, by design: pnpm and yarn lockfiles, which carry no published
// version where sidecar packages are referenced with `workspace:*`; private npm
// packages, which reach no consumer; intra-workspace dependency requirements
// and `x-release-please-major`, `-minor`, `-patch` and `-date` annotations,
// which are checked for coverage but not for their value; an annotation block
// left open by a missing `x-release-please-end`; and a `members` pattern such
// as `crates/*`, which the `rust` strategy does not expand either, so the
// manifests behind it are reported as uncovered. Repository-specific agreement
// — a publish matrix, platform sidecars, a publication hold — stays in the
// repository's own checks.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Directories a release never versions, whether or not something in them is
// tracked.
const excludedDirectories = new Set([".git", "node_modules", "target", "dist"]);
// The generic updater's own pattern. It rewrites the first match on a line, so
// that first match is the value this check compares.
const versionPattern = /\d+\.\d+\.\d+(?:-[\w.]+)?(?:\+[-\w.]+)?/;
const inlineAnnotation = /x-release-please-(major|minor|patch|version-date|version|date)/;
const blockAnnotation = /x-release-please-start-(major|minor|patch|version-date|version|date)/;
const blockEnd = /x-release-please-end/;
// An annotated file is documentation or configuration; a larger tracked file is
// data, and reading it would only slow the scan down.
const scanLimit = 1024 * 1024;

function usage(message) {
  console.error(`check-release-set: ${message}`);
  console.error("Usage: check-release-set.mjs [config-file] [manifest-file] [--ignore <path>]...");
  process.exit(2);
}

const positional = [];
const ignored = [];
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--ignore") {
    index += 1;
    const value = process.argv[index];
    if (value === undefined) usage("--ignore needs a path");
    ignored.push(value.replace(/^\.\//, "").replace(/\/+$/, ""));
  } else if (argument.startsWith("-")) {
    usage(`unknown option ${argument}`);
  } else {
    positional.push(argument);
  }
}
if (positional.length > 2) usage("expected at most a config file and a manifest file");

const configFile = positional[0] ?? "release-please-config.json";
const manifestFile = positional[1] ?? ".release-please-manifest.json";
const problems = [];

function report(problem) {
  problems.push(problem);
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function escapeRegExp(text) {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isIgnored(file) {
  return ignored.some((entry) => file === entry || file.startsWith(`${entry}/`));
}

// The tracked tree, so a build artifact or an ignored copy never counts as a
// file the release has to keep current. The buffer holds a large repository.
const tracked = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
})
  .split("\0")
  .filter(Boolean)
  .filter((file) => !file.split("/").some((segment) => excludedDirectories.has(segment)))
  .filter((file) => !isIgnored(file));
const trackedFiles = new Set(tracked);
const contents = new Map();

// Tracked text, or undefined for a file that is missing, binary, or too large
// to be a release target.
function content(file) {
  if (!contents.has(file)) {
    let text;
    try {
      const bytes = readFileSync(file);
      text = bytes.length > scanLimit || bytes.includes(0) ? undefined : bytes.toString("utf8");
    } catch {
      text = undefined;
    }
    contents.set(file, text);
  }
  return contents.get(file);
}

// Cargo manifests and lockfiles are the only TOML this check reads, so it scans
// their sections instead of implementing the format: a header line opens a
// section, and `key = "value"` inside it carries the version.
function tomlSections(text) {
  const sections = [{ path: "", array: false, lines: [] }];
  for (const line of text.split(/\r?\n/)) {
    const header = /^\s*(\[\[?)([^\]]+)\]\]?\s*(?:#.*)?$/.exec(line);
    if (header) sections.push({ path: header[2].trim(), array: header[1] === "[[", lines: [] });
    else sections.at(-1).lines.push(line);
  }
  return sections.map((section) => ({ ...section, body: section.lines.join("\n") }));
}

function tomlSection(text, path, array = false) {
  return tomlSections(text).find((section) => section.path === path && section.array === array);
}

// The preceding character keeps `version` from matching `rust-version`, and the
// quotes keep it from matching an inherited `version.workspace = true`.
function tomlValue(body, key) {
  return new RegExp(`(?:^|[\\s,{])${escapeRegExp(key)}\\s*=\\s*"([^"]*)"`, "m").exec(body)?.[1];
}

function tomlLookup(text, segments) {
  const sections = tomlSections(text);
  const selector = segments.findIndex((segment) => segment.startsWith("?name="));
  if (selector >= 0) {
    // A lockfile entry: the table of the array whose `name` the selector names.
    const name = segments[selector].slice("?name=".length);
    const entry = sections
      .filter((section) => section.array && section.path === segments.slice(0, selector).join("."))
      .find((section) => tomlValue(section.body, "name") === name);
    return entry && tomlValue(entry.body, segments.slice(selector + 1).join("."));
  }
  for (const section of sections) {
    if (section.path !== segments.slice(0, -1).join(".")) continue;
    const value = tomlValue(section.body, segments.at(-1));
    if (value !== undefined) return value;
  }
  // A dependency can keep its version inline: `core = { version = "1.2.3", path = "../core" }`.
  if (segments.length >= 2) {
    const entry = escapeRegExp(segments.at(-2));
    for (const section of sections) {
      if (section.path !== segments.slice(0, -2).join(".")) continue;
      const inline = new RegExp(`^\\s*${entry}\\s*=\\s*\\{([^}]*)\\}`, "m").exec(section.body);
      if (inline) return tomlValue(inline[1], segments.at(-1));
    }
  }
  return undefined;
}

function jsonLookup(text, segments) {
  let value = JSON.parse(text);
  for (const segment of segments) {
    if (value === null || typeof value !== "object") return undefined;
    value = value[segment];
  }
  return typeof value === "string" ? value : undefined;
}

// `$.a.b`, `$.a[''].b`, and the lockfile selector `$.a[?(@.name.value=="x")].b`.
// Anything else returns undefined and is reported instead of assumed.
function parseJsonPath(path) {
  if (typeof path !== "string" || !path.startsWith("$")) return undefined;
  const segments = [];
  let rest = path.slice(1);
  while (rest.length > 0) {
    const member = /^\.([\w-]+)/.exec(rest);
    const selector = /^\[\?\(@\.name(?:\.value)?\s*==\s*(['"])(.*?)\1\)\]/.exec(rest);
    const quoted = /^\[(['"])(.*?)\1\]/.exec(rest);
    if (member) segments.push(member[1]);
    else if (selector) segments.push(`?name=${selector[2]}`);
    else if (quoted) segments.push(quoted[2]);
    else return undefined;
    rest = rest.slice((member ?? selector ?? quoted)[0].length);
  }
  return segments.length > 0 ? segments : undefined;
}

const config = readJson(configFile);
const manifest = readJson(manifestFile);
const components = Object.entries(config.packages ?? {}).map(([key, options]) => ({
  key,
  directory: key === "." ? "" : key.replace(/\/+$/, ""),
  strategy: options?.["release-type"] ?? config["release-type"] ?? "node",
  version: manifest[key],
  options: options ?? {},
}));
if (components.length === 0) report(`${configFile}: no packages are configured`);

// A path is relative to the component's directory, unless a leading slash
// makes it relative to the repository root.
function within(component, file) {
  if (file.startsWith("/")) return file.replace(/^\/+/, "");
  return component.directory ? `${component.directory}/${file}` : file;
}

function owner(file) {
  return [...components]
    .sort((left, right) => right.directory.length - left.directory.length)
    .find((component) => !component.directory || file.startsWith(`${component.directory}/`));
}

function records(component) {
  return component
    ? `the manifest records ${component.version} for component "${component.key}"`
    : "no component covers this path";
}

// One updater: the file it writes, the field it writes there, and the component
// whose version it writes. A field is a jsonpath's segments, "annotations" for
// the generic updater, or "content" for a whole version file.
const updaters = new Map();

function fieldKey(file, field) {
  return JSON.stringify([file, field]);
}

function cover(component, file, field, updater) {
  if (isIgnored(file)) return;
  updaters.set(fieldKey(file, Array.isArray(field) ? JSON.stringify(field) : field), {
    ...updater,
    component,
    file,
    field,
  });
}

function covered(file, field) {
  return updaters.has(fieldKey(file, Array.isArray(field) ? JSON.stringify(field) : field));
}

function lockEntry(name) {
  return ["package", `?name=${name}`, "version"];
}

function lockDisplay(name) {
  return `$.package[?(@.name.value=="${name}")].version`;
}

function expand(component, path, glob) {
  const file = within(component, path);
  if (!glob) return trackedFiles.has(file) ? [file] : [];
  if (file.includes("**")) return undefined;
  const pattern = new RegExp(`^${file.split("*").map(escapeRegExp).join("[^/]*")}$`);
  return tracked.filter((candidate) => pattern.test(candidate));
}

// A strategy silently updates nothing where its own file is missing, and the
// component then releases a version this check cannot see.
function requireTracked(component, file) {
  if (!trackedFiles.has(file) && !isIgnored(file)) {
    report(`${configFile}: component "${component.key}" releases ${file}, which is not tracked`);
  }
}

// What each strategy writes without being told, from the release-please
// strategy it names.
function coverStrategy(component) {
  const strategy = { format: "json", origin: "strategy" };
  switch (component.strategy) {
    case "simple": {
      const file = within(component, component.options["version-file"] ?? "version.txt");
      cover(component, file, "content", { ...strategy, format: "content", display: "the version" });
      requireTracked(component, file);
      return;
    }
    case "node": {
      const file = within(component, "package.json");
      cover(component, file, ["version"], { ...strategy, display: "$.version" });
      requireTracked(component, file);
      for (const lockfile of ["package-lock.json", "npm-shrinkwrap.json"]) {
        const lock = within(component, lockfile);
        cover(component, lock, ["version"], { ...strategy, display: "$.version" });
        cover(component, lock, ["packages", "", "version"], {
          ...strategy,
          display: "$.packages[''].version",
        });
      }
      return;
    }
    case "rust":
      coverRustWorkspace(component, strategy);
      return;
    default:
      report(
        `${configFile}: component "${component.key}" uses release-type "${component.strategy}", whose own updates this check does not know`,
      );
  }
}

// The `rust` strategy writes the package manifest, the manifests of the members
// it lists, and the lockfile entry of each of those crates.
function coverRustWorkspace(component, strategy) {
  const manifestPath = within(component, "Cargo.toml");
  const text = content(manifestPath);
  if (text === undefined) {
    requireTracked(component, manifestPath);
    return;
  }
  const toml = { ...strategy, format: "toml", display: "$.package.version" };
  cover(component, manifestPath, ["package", "version"], toml);
  const names = [tomlValue(tomlSection(text, "package")?.body ?? "", "name")];
  const list = /^\s*members\s*=\s*\[([^\]]*)\]/m.exec(tomlSection(text, "workspace")?.body ?? "");
  for (const match of (list?.[1] ?? "").matchAll(/"([^"]+)"/g)) {
    // The strategy reads the member list literally, so a pattern updates
    // nothing and the scan reports the manifests behind it.
    if (match[1].includes("*")) continue;
    const memberPath = within(component, `${match[1]}/Cargo.toml`);
    cover(component, memberPath, ["package", "version"], toml);
    const member = content(memberPath);
    if (member) names.push(tomlValue(tomlSection(member, "package")?.body ?? "", "name"));
  }
  for (const name of names.filter(Boolean)) {
    cover(component, within(component, "Cargo.lock"), lockEntry(name), {
      ...toml,
      display: lockDisplay(name),
    });
  }
}

// A string entry runs the generic updater, and `$.version` as well when the
// extension names a structured format.
function extraFileType(entry) {
  if (typeof entry === "object") return entry.type;
  if (entry.endsWith(".json")) return "json";
  if (entry.endsWith(".toml")) return "toml";
  if (entry.endsWith(".yaml") || entry.endsWith(".yml")) return "yaml";
  if (entry.endsWith(".xml")) return "xml";
  return "generic";
}

function coverExtraFile(component, entry) {
  const unsupported = (detail) =>
    report(`${configFile}: extra-files entry ${JSON.stringify(entry)} ${detail}`);
  const path = typeof entry === "string" ? entry : entry?.path;
  if (typeof path !== "string") return unsupported("has no path");
  if (isIgnored(within(component, path.split("*")[0].replace(/\/+$/, "")))) return;
  const files = expand(component, path, entry?.glob === true);
  if (files === undefined) return unsupported("uses a `**` pattern this check cannot expand");
  if (files.length === 0) {
    report(
      `${configFile}: extra-files entry "${path}" of component "${component.key}" matches no tracked file`,
    );
    return;
  }
  const type = extraFileType(entry);
  const annotationsOnly = typeof entry === "object" && type === "generic";
  for (const file of files) {
    cover(component, file, "annotations", {
      format: "annotations",
      origin: annotationsOnly ? "extra-files" : "string-entry",
      display: "the x-release-please annotations",
    });
    if (type === "generic") continue;
    if (type !== "json" && type !== "toml") {
      unsupported(`uses type "${type ?? "none"}", whose format this check cannot read`);
      continue;
    }
    const display = typeof entry === "string" ? "$.version" : entry.jsonpath;
    const segments = parseJsonPath(display);
    if (!segments || (type === "json" && segments.some((segment) => segment.startsWith("?")))) {
      unsupported(`uses jsonpath ${JSON.stringify(display)}, which this check cannot resolve`);
      continue;
    }
    cover(component, file, segments, { format: type, origin: "extra-files", display });
  }
}

for (const component of components) {
  if (component.version === undefined) {
    report(`${manifestFile}: no released version for component "${component.key}"`);
  }
  coverStrategy(component);
  for (const entry of component.options["extra-files"] ?? []) coverExtraFile(component, entry);
}

// Every version the repository carries where a release would have to rewrite it.
const carried = [];
const crates = new Map();

function carries(file, field, value, display) {
  carried.push({ file, field, value, display });
}

for (const file of tracked) {
  const name = file.split("/").at(-1);
  const text = content(file);
  if (text === undefined) continue;
  if (name === "package.json") {
    const parsed = JSON.parse(text);
    // A private package reaches no consumer, so no release has to version it.
    if (typeof parsed.version === "string" && parsed.private !== true) {
      carries(file, ["version"], parsed.version, "$.version");
    }
  } else if (name === "package-lock.json" || name === "npm-shrinkwrap.json") {
    const sibling = content(`${file.slice(0, -name.length)}package.json`);
    const owned = sibling ? JSON.parse(sibling) : {};
    if (typeof owned.version === "string" && owned.private !== true) {
      const parsed = JSON.parse(text);
      if (typeof parsed.version === "string") {
        carries(file, ["version"], parsed.version, "$.version");
      }
      const root = parsed.packages?.[""]?.version;
      if (typeof root === "string") {
        carries(file, ["packages", "", "version"], root, "$.packages[''].version");
      }
    }
  } else if (name === "Cargo.toml") {
    const own = tomlSection(text, "package");
    // `version.workspace = true` carries no version of its own.
    const version = own && tomlValue(own.body, "version");
    if (own) crates.set(tomlValue(own.body, "name"), file);
    if (version) carries(file, ["package", "version"], version, "$.package.version");
    const shared = tomlSection(text, "workspace.package");
    const inherited = shared && tomlValue(shared.body, "version");
    if (inherited) {
      carries(file, ["workspace", "package", "version"], inherited, "$.workspace.package.version");
    }
  }
}

for (const file of tracked) {
  if (file.split("/").at(-1) !== "Cargo.lock") continue;
  for (const section of tomlSections(content(file) ?? "")) {
    if (!section.array || section.path !== "package") continue;
    // A dependency from a registry carries a `source` and a version of its own.
    // A crate of this repository does not, and its entry goes stale unless a
    // release rewrites it.
    if (/^\s*source\s*=/m.test(section.body)) continue;
    const name = tomlValue(section.body, "name");
    const version = tomlValue(section.body, "version");
    if (name && version && crates.has(name)) {
      carries(file, lockEntry(name), version, lockDisplay(name));
    }
  }
}

// The lines a generic updater rewrites: an annotated line, and every line of a
// closed annotation block.
function annotatedLines(text) {
  const lines = [];
  let block = [];
  let scope;
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const inline = inlineAnnotation.exec(line);
    if (inline) {
      lines.push({ number: index + 1, line, scope: inline[1] });
    } else if (scope) {
      block.push({ number: index + 1, line, scope });
      if (blockEnd.test(line)) {
        lines.push(...block);
        block = [];
        scope = undefined;
      }
    } else {
      scope = blockAnnotation.exec(line)?.[1];
    }
  }
  // A block start that is never closed is prose about the annotation.
  return lines.sort((left, right) => left.number - right.number);
}

const annotated = new Map();
for (const file of tracked) {
  const text = content(file);
  if (text === undefined || !text.includes("x-release-please")) continue;
  const lines = annotatedLines(text).filter((entry) => versionPattern.test(entry.line));
  if (lines.length > 0) annotated.set(file, lines);
}

// Nothing carries a version that no updater writes.
for (const entry of carried) {
  if (covered(entry.file, entry.field)) continue;
  report(
    `${entry.file}: ${entry.display} is ${entry.value} and no release updater writes it; ${records(owner(entry.file))}`,
  );
}

for (const [file, lines] of annotated) {
  if (covered(file, "annotations")) continue;
  for (const line of lines) {
    report(
      `${file}:${line.number}: annotated version ${versionPattern.exec(line.line)[0]} is written by no release updater; ${records(owner(file))}`,
    );
  }
}

// Every updater writes a version that exists and already matches the manifest.
let verified = 0;

for (const updater of updaters.values()) {
  const { component, display, file, format, origin } = updater;
  const text = content(file);
  if (text === undefined) {
    if (origin === "strategy") continue;
    report(
      trackedFiles.has(file)
        ? `${file}: the updater in ${configFile} cannot read this file`
        : `${configFile}: extra-files entry "${file}" matches no tracked file`,
    );
    continue;
  }
  if (format === "annotations") {
    for (const line of annotated.get(file) ?? []) {
      if (line.scope !== "version" && line.scope !== "version-date") continue;
      verified += 1;
      const found = versionPattern.exec(line.line)[0];
      if (found !== component.version) {
        report(
          `${file}:${line.number}: annotated version ${found} contradicts ${component.version}, the released version of component "${component.key}"`,
        );
      }
    }
    if (origin === "extra-files" && !annotated.has(file)) {
      report(`${file}: no x-release-please annotation, so ${configFile} updates nothing here`);
    }
    continue;
  }
  const value =
    format === "content"
      ? text.trim()
      : format === "toml"
        ? tomlLookup(text, updater.field)
        : jsonLookup(text, updater.field);
  if (value === undefined) {
    if (origin !== "strategy") {
      report(`${file}: ${display} does not exist, so ${configFile} updates nothing there`);
    }
    continue;
  }
  verified += 1;
  if (value !== component.version) {
    report(`${file}: ${display} is ${value}, but ${records(component)}`);
  }
}

if (problems.length > 0) {
  console.error(`Release set check failed (${configFile}):\n`);
  for (const problem of [...new Set(problems)].sort()) console.error(`  ${problem}`);
  process.exit(1);
}

const plural = (count, noun) => `${count} ${noun}${count === 1 ? "" : "s"}`;
const released = components.map((component) => `"${component.key}" at ${component.version}`);
const skipped = ignored.length > 0 ? `, ignoring ${ignored.join(", ")}` : "";
console.log(
  `Release set check passed: ${plural(verified, "version")} verified in ${plural(tracked.length, "tracked file")} for ${plural(components.length, "component")} ${released.join(", ")}${skipped}.`,
);
