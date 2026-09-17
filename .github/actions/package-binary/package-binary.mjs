#!/usr/bin/env node
// Stages one matrix job's release archive and names it, so every platform's
// download follows the same contract: `<name>-<version>-<target>.tar.gz`, with
// `<name>-<version>-<target>/` as its single top-level directory. An installer
// and `cargo binstall` reconstruct that name from a version and a platform, so
// the name is derived here once instead of being written into a workflow per
// target.
//
// Two invariants are checked before anything is staged: the version comes from
// the manifest in the checkout rather than from the tag, and the tag has to end
// with it. A tag that names a different version means the release would carry
// archives whose contents contradict their name, and the archive that reaches
// a user is the one artifact nothing downstream re-checks.
//
// The archive is created, checksummed, signed and uploaded by the action's
// shell steps; this script owns the parts that are logic rather than a call to
// `tar`, `cosign` or `gh`, and it is the part the tests cover.
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import process from "node:process";

const CHECKSUM_MODES = ["per-asset", "none"];
const TOML_TABLE = /^\s*\[\s*([^\]]+?)\s*\]/;
const TOML_VERSION = /^\s*version\s*=\s*"([^"]+)"/;

// Paths are joined with `/` throughout: the action's steps run in bash on every
// runner, Windows included, where a backslash would reach `tar` as an escape.
export function baseName(path) {
  const parts = path.split(/[/\\]/).filter((part) => part.length > 0);
  return parts.length === 0 ? path : parts[parts.length - 1];
}

function tomlVersion(text) {
  const tables = new Map();
  let table = "";
  for (const line of text.split("\n")) {
    const header = TOML_TABLE.exec(line);
    if (header) {
      table = header[1];
      continue;
    }
    const version = TOML_VERSION.exec(line);
    // The first `version = "…"` of a table wins; a later one belongs to an
    // inline value the line-based read is not meant to follow.
    if (version && !tables.has(table)) tables.set(table, version[1]);
  }
  // A member of a workspace that inherits `version.workspace = true` has no
  // version of its own — the quoted-string match skips that line — so the
  // workspace's version is what the tag has to agree with.
  for (const name of ["package", "workspace.package", ""]) {
    const found = tables.get(name);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function readVersion(text, file) {
  let version;
  if (file.endsWith(".json")) {
    version = JSON.parse(text).version;
  } else if (file.endsWith(".toml")) {
    version = tomlVersion(text);
  } else {
    // A plain version file, as a Cargo workspace using the `simple` release
    // strategy carries it.
    const trimmed = text.trim();
    version = /^\S+$/.test(trimmed) ? trimmed : undefined;
  }
  if (typeof version !== "string" || version.length === 0) {
    throw new Error(`no version found in ${file}`);
  }
  return version;
}

// The tag ends with the version at a separator boundary, so `tool-v1.2.3`,
// `v1.2.3` and `1.2.3` all name version 1.2.3 while `v1.12.3` does not name
// 12.3. Which prefix a repository uses is Release Please's decision; that the
// two agree is this action's.
export function tagProblem(tag, version) {
  if (tag.length === 0) return "the `tag` input is empty";
  if (!tag.endsWith(version)) {
    return `tag "${tag}" does not end with the version ${version} from the manifest`;
  }
  const prefix = tag.slice(0, tag.length - version.length);
  if (prefix.length > 0 && !/[-_/v]$/.test(prefix)) {
    return `tag "${tag}" ends with ${version} but not at a separator; expected "<component>-v${version}", "v${version}" or "${version}"`;
  }
  return "";
}

export function archiveBase({ name, binary, version, target }) {
  if (name.length > 0) return name;
  return `${baseName(binary).replace(/\.exe$/i, "")}-${version}-${target}`;
}

// A Windows build writes `<binary>.exe`, which is the only difference between
// the matrix legs; resolving it here keeps the suffix out of every consumer's
// matrix.
export function resolveBinary(path, exists = existsSync) {
  if (exists(path)) return path;
  if (!/\.exe$/i.test(path) && exists(`${path}.exe`)) return `${path}.exe`;
  throw new Error(`the binary "${path}" does not exist`);
}

export function parseList(value) {
  return (value ?? "")
    .split(/\r?\n/)
    .flatMap((line) => line.split(/\s*,\s*/))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

// Everything the archive contains lands under one directory named like the
// archive, so extracting it never scatters files into the working directory and
// `bin-dir` stays derivable for `cargo binstall`.
export function stage({ directory, name, binary, extra }, exists = existsSync) {
  const missing = extra.filter((entry) => !exists(entry));
  if (missing.length > 0) {
    throw new Error(
      `missing \`extra\` ${missing.length === 1 ? "entry" : "entries"}: ${missing.join(", ")}`,
    );
  }

  const root = `${directory}/${name}`;
  // A runner with a reused workspace can hold a previous attempt's tree, whose
  // leftovers would ship inside the archive.
  rmSync(root, { force: true, recursive: true });
  mkdirSync(root, { recursive: true });

  const staged = [binary, ...extra];
  for (const entry of staged) {
    cpSync(entry, `${root}/${baseName(entry)}`, { preserveTimestamps: true, recursive: true });
  }
  return { root, staged };
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

function required(name, value) {
  if (value.length === 0) throw new Error(`the \`${name}\` input is required`);
  return value;
}

function main() {
  const tag = process.env.INPUT_TAG ?? "";
  const target = required("target", (process.env.INPUT_TARGET ?? "").trim());
  const versionFile = required("version-file", (process.env.INPUT_VERSION_FILE ?? "").trim());
  const checksum = (process.env.INPUT_CHECKSUM ?? "per-asset").trim();
  const directory = (process.env.INPUT_DIRECTORY ?? "dist").trim().replace(/\/+$/, "") || ".";
  if (!CHECKSUM_MODES.includes(checksum)) {
    throw new Error(`\`checksum\` must be one of ${CHECKSUM_MODES.join(", ")}, not "${checksum}"`);
  }

  const binary = resolveBinary(required("binary", (process.env.INPUT_BINARY ?? "").trim()));
  const version = readVersion(readFileSync(versionFile, "utf8"), versionFile);
  const problem = tagProblem(tag, version);
  if (problem.length > 0) throw new Error(problem);

  const name = archiveBase({
    binary,
    name: (process.env.INPUT_NAME ?? "").trim(),
    target,
    version,
  });
  const { root, staged } = stage({
    binary,
    directory,
    extra: parseList(process.env.INPUT_EXTRA),
    name,
  });

  const archive = `${directory}/${name}.tar.gz`;
  process.stdout.write(`Staged ${staged.length} entries in ${root} for ${archive}\n`);
  emit({
    archive,
    // The normalized directory, so the shell steps that run `tar` and the
    // checksum use the same path this script staged into.
    directory,
    bundle: process.env.INPUT_SIGN === "true" ? `${archive}.sigstore.json` : "",
    checksum: checksum === "none" ? "" : `${archive}.sha256`,
    name,
    version,
  });
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exit(main());
  } catch (error) {
    process.stderr.write(`::error::package-binary: ${error.message}\n`);
    process.exit(1);
  }
}
