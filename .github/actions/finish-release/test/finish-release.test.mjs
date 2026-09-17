// `fixtures/release-*.json` are what `gh release view --json assets,isDraft`
// writes, and `fixtures/sums/` holds the per-asset checksums the combined list
// is assembled from, so the comparison and the assembly are checked against the
// shapes the action actually reads.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";

import { assembleSums, assetProblems, checksumRecord, parseExpected } from "../finish-release.mjs";

const fixtures = join(import.meta.dirname, "fixtures");
const script = join(import.meta.dirname, "..", "finish-release.mjs");
const fixture = (name) => join(fixtures, name);

const archives = [
  "tool-1.2.3-x86_64-unknown-linux-gnu.tar.gz",
  "tool-1.2.3-aarch64-apple-darwin.tar.gz",
];
const expectedNames = archives.flatMap((name) => [name, `${name}.sha256`]).join("\n");

test("expected reads a list of names or a single count", () => {
  assert.deepEqual(parseExpected("a.tar.gz\nb.tar.gz"), {
    kind: "names",
    names: ["a.tar.gz", "b.tar.gz"],
  });
  assert.deepEqual(parseExpected(" 12 "), { count: 12, kind: "count" });
  assert.deepEqual(parseExpected("# linux\na.tar.gz"), { kind: "names", names: ["a.tar.gz"] });
  assert.throws(() => parseExpected("  \n\n"), /`expected` input is empty/);
  assert.throws(() => parseExpected("# only a comment"), /`expected` input is empty/);
});

test("a missing asset is named, and an extra asset is not a problem", () => {
  const expected = parseExpected(expectedNames);
  assert.deepEqual(assetProblems(expected, [...archives, `${archives[0]}.sha256`]), [
    `missing asset: ${archives[1]}.sha256`,
  ]);
  assert.deepEqual(
    assetProblems(expected, [...archives.flatMap((n) => [n, `${n}.sha256`]), "install.sh"]),
    [],
  );
});

test("the count form asserts a minimum", () => {
  const expected = parseExpected("4");
  assert.deepEqual(assetProblems(expected, ["a", "b", "c", "d", "e"]), []);
  assert.deepEqual(assetProblems(expected, ["a", "b", "c"]), [
    "the release carries 3 assets, fewer than the expected 4",
  ]);
});

test("a checksum has to describe the asset it is named after", () => {
  const hash = "a".repeat(64);
  assert.deepEqual(checksumRecord("tool.tar.gz.sha256", `${hash}  tool.tar.gz\n`), {
    file: "tool.tar.gz",
    hash,
  });
  assert.deepEqual(checksumRecord("tool.tar.gz.sha256", `${hash} *tool.tar.gz`), {
    file: "tool.tar.gz",
    hash,
  });
  assert.throws(
    () => checksumRecord("tool.tar.gz.sha256", `${hash}  other.tar.gz\n`),
    /the record names other\.tar\.gz, not tool\.tar\.gz/,
  );
  assert.throws(
    () => checksumRecord("tool.tar.gz.sha256", "not-a-hash tool.tar.gz\n"),
    /not a SHA-256 record/,
  );
});

test("SHA256SUMS is assembled in name order, in the format sha256sum -c reads", () => {
  const sums = assembleSums([
    { name: `${archives[0]}.sha256`, text: `${"2".repeat(64)}  ${archives[0]}\n` },
    { name: `${archives[1]}.sha256`, text: `${"1".repeat(64)}  ${archives[1]}\n` },
  ]);
  assert.equal(sums, `${"1".repeat(64)}  ${archives[1]}\n${"2".repeat(64)}  ${archives[0]}\n`);
  assert.throws(() => assembleSums([]), /no checksum files/);
});

test("verify exits 1 on an incomplete release and writes the asset list when complete", () => {
  const root = mkdtempSync(join(tmpdir(), "finish-release-"));
  const outputs = join(root, "outputs.txt");
  writeFileSync(outputs, "");

  const run = (release, expected) =>
    spawnSync(process.execPath, [script, "verify", fixture(release)], {
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_OUTPUT: outputs,
        INPUT_EXPECTED: expected,
        TAG: "tool-v1.2.3",
      },
    });

  const incomplete = run("release-incomplete.json", expectedNames);
  assert.equal(incomplete.status, 1);
  assert.match(incomplete.stderr, /missing asset: tool-1\.2\.3-aarch64-apple-darwin\.tar\.gz/);
  assert.match(
    incomplete.stderr,
    /::error::tool-v1\.2\.3 does not carry the expected 4 named assets/,
  );
  assert.equal(readFileSync(outputs, "utf8"), "");

  const complete = run("release-complete.json", expectedNames);
  assert.equal(complete.status, 0, complete.stderr);
  assert.match(complete.stdout, /tool-v1\.2\.3: 5 assets, the expected set is complete\./);
  const written = readFileSync(outputs, "utf8");
  assert.ok(written.startsWith("assets=["), written);
  assert.deepEqual(JSON.parse(written.slice("assets=".length)).length, 5);

  assert.equal(run("release-complete.json", "6").status, 1);
  assert.equal(spawnSync(process.execPath, [script, "list"], { encoding: "utf8" }).status, 2);
});

test("sums writes one file over the downloaded checksums", () => {
  const root = mkdtempSync(join(tmpdir(), "finish-release-"));
  const output = join(root, "SHA256SUMS");
  const result = spawnSync(process.execPath, [script, "sums", fixture("sums"), output], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    readFileSync(output, "utf8"),
    `${"1".repeat(64)}  ${archives[1]}\n${"2".repeat(64)}  ${archives[0]}\n`,
  );
});
