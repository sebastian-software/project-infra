// Fixtures under `fixtures/` are the manifest shapes the version is read from.
// The staging tests build their tree in a temporary directory, so a copied file
// mode and a missing entry are checked against the file system the action uses
// rather than against a mock of it.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";

import {
  archiveBase,
  baseName,
  parseList,
  readVersion,
  resolveBinary,
  stage,
  tagProblem,
} from "../package-binary.mjs";

const fixtures = join(import.meta.dirname, "fixtures");
const script = join(import.meta.dirname, "..", "package-binary.mjs");
const fixture = (name) => join(fixtures, name);
const read = (name) => readVersion(readFileSync(fixture(name), "utf8"), name);

function workspace() {
  return mkdtempSync(join(tmpdir(), "package-binary-"));
}

test("the version comes from the manifest, including a workspace-inherited one", () => {
  assert.equal(read("crate.toml"), "1.2.3");
  assert.equal(read("workspace.toml"), "0.4.0");
  assert.equal(read("package.json"), "2.0.0-rc.1");
  assert.equal(read("version.txt"), "0.9.1");
  assert.throws(() => read("versionless.toml"), /no version found in versionless\.toml/);
});

test("a dependency's version is not the package's version", () => {
  assert.equal(read("crate.toml"), "1.2.3");
  assert.notEqual(read("crate.toml"), "9.9.9");
});

test("the tag has to end with the manifest version at a separator", () => {
  assert.equal(tagProblem("tool-v1.2.3", "1.2.3"), "");
  assert.equal(tagProblem("v1.2.3", "1.2.3"), "");
  assert.equal(tagProblem("1.2.3", "1.2.3"), "");
  assert.match(tagProblem("tool-v1.2.4", "1.2.3"), /does not end with the version 1\.2\.3/);
  assert.match(tagProblem("v11.2.3", "1.2.3"), /not at a separator/);
  assert.match(tagProblem("", "1.2.3"), /`tag` input is empty/);
});

test("the archive name is derived from the binary, version and target", () => {
  const derived = { binary: "target/x/release/tool", name: "", target: "x", version: "1.2.3" };
  assert.equal(archiveBase(derived), "tool-1.2.3-x");
  assert.equal(
    archiveBase({ ...derived, binary: "target/x/release/tool.exe" }),
    "tool-1.2.3-x",
    "a Windows build carries the same name as every other platform",
  );
  assert.equal(archiveBase({ ...derived, name: "chosen" }), "chosen");
  assert.equal(baseName("a\\b\\tool.exe"), "tool.exe");
});

test("a Windows build is found through its .exe suffix", () => {
  const present = new Set(["target/release/tool.exe", "target/release/other"]);
  const exists = (path) => present.has(path);
  assert.equal(resolveBinary("target/release/tool", exists), "target/release/tool.exe");
  assert.equal(resolveBinary("target/release/other", exists), "target/release/other");
  assert.throws(() => resolveBinary("target/release/absent", exists), /does not exist/);
});

test("extra entries are read from newlines or commas", () => {
  assert.deepEqual(parseList("README.md\n  completions \n\nman"), [
    "README.md",
    "completions",
    "man",
  ]);
  assert.deepEqual(parseList("LICENSE-MIT, LICENSE-APACHE"), ["LICENSE-MIT", "LICENSE-APACHE"]);
  assert.deepEqual(parseList(""), []);
});

test("staging copies the binary and every extra under one directory", () => {
  const root = workspace();
  writeFileSync(join(root, "tool"), "#!/bin/sh\n", { mode: 0o755 });
  writeFileSync(join(root, "README.md"), "readme\n");
  mkdirSync(join(root, "completions"));
  writeFileSync(join(root, "completions", "tool.bash"), "complete\n");

  const staged = stage({
    binary: join(root, "tool"),
    directory: join(root, "dist"),
    extra: [join(root, "README.md"), join(root, "completions")],
    name: "tool-1.2.3-x",
  });

  assert.equal(staged.root, join(root, "dist") + "/tool-1.2.3-x");
  assert.equal(readFileSync(join(staged.root, "README.md"), "utf8"), "readme\n");
  assert.equal(readFileSync(join(staged.root, "completions", "tool.bash"), "utf8"), "complete\n");
  assert.equal(readFileSync(join(staged.root, "tool"), "utf8"), "#!/bin/sh\n");
  // An archive whose binary lost its executable bit installs and then fails to
  // run, which no later check in the release catches.
  assert.equal(statSync(join(staged.root, "tool")).mode & 0o111, 0o111);
});

test("a missing extra entry fails instead of shipping a short archive", () => {
  const root = workspace();
  writeFileSync(join(root, "tool"), "binary\n");
  assert.throws(
    () =>
      stage({
        binary: join(root, "tool"),
        directory: join(root, "dist"),
        extra: [join(root, "man")],
        name: "tool-1.2.3-x",
      }),
    /missing `extra` entry: .*man/,
  );
});

test("the command line stages the tree and writes the asset paths as outputs", () => {
  const root = workspace();
  writeFileSync(join(root, "Cargo.toml"), readFileSync(fixture("crate.toml"), "utf8"));
  writeFileSync(join(root, "README.md"), "readme\n");
  mkdirSync(join(root, "target"), { recursive: true });
  writeFileSync(join(root, "target", "tool"), "binary\n", { mode: 0o755 });
  const outputs = join(root, "outputs.txt");
  writeFileSync(outputs, "");

  const run = (env) =>
    spawnSync(process.execPath, [script], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_OUTPUT: outputs,
        INPUT_BINARY: "target/tool",
        INPUT_EXTRA: "README.md",
        INPUT_TAG: "tool-v1.2.3",
        INPUT_TARGET: "x86_64-unknown-linux-gnu",
        INPUT_VERSION_FILE: "Cargo.toml",
        ...env,
      },
    });

  const signed = run({ INPUT_SIGN: "true" });
  assert.equal(signed.status, 0, signed.stderr);
  const written = readFileSync(outputs, "utf8");
  assert.match(written, /^name=tool-1\.2\.3-x86_64-unknown-linux-gnu$/m);
  assert.match(written, /^version=1\.2\.3$/m);
  assert.match(written, /^directory=dist$/m);
  assert.match(written, /^archive=dist\/tool-1\.2\.3-x86_64-unknown-linux-gnu\.tar\.gz$/m);
  assert.match(written, /^checksum=dist\/.*\.tar\.gz\.sha256$/m);
  assert.match(written, /^bundle=dist\/.*\.tar\.gz\.sigstore\.json$/m);
  assert.equal(
    readFileSync(join(root, "dist/tool-1.2.3-x86_64-unknown-linux-gnu/tool"), "utf8"),
    "binary\n",
  );

  writeFileSync(outputs, "");
  const plain = run({ INPUT_CHECKSUM: "none" });
  assert.equal(plain.status, 0, plain.stderr);
  assert.match(readFileSync(outputs, "utf8"), /^checksum=$/m);

  const mismatched = run({ INPUT_TAG: "tool-v1.3.0" });
  assert.equal(mismatched.status, 1);
  assert.match(mismatched.stderr, /::error::package-binary: tag "tool-v1\.3\.0"/);

  assert.equal(run({ INPUT_CHECKSUM: "sha512" }).status, 1);
  assert.equal(run({ INPUT_BINARY: "target/absent" }).status, 1);
});
