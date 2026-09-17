// The decision — create, refresh, close, or nothing — is the behavior worth
// holding still, so every test drives it through a fake `gh` and asserts the
// arguments it would have run. The last test drives the command line itself
// through a stub on PATH, which covers the option form, the body on standard
// input, and the step outputs without a network or a repository.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import process from "node:process";
import { test } from "node:test";

import { openOrRefreshIssue } from "../open-or-refresh-issue.mjs";

const title = "chore(deps): dependency audit findings";
const label = "dependencies";
const body = "The scheduled audit reported advisories.\n";
const created = "https://github.com/acme/demo/issues/7";
const script = join(import.meta.dirname, "..", "open-or-refresh-issue.mjs");
const bodyFixture = join(import.meta.dirname, "fixtures", "issue-body.md");

// Answers the issue list with the given fixture and records every call, so a
// test asserts what would have reached GitHub.
function recorder(issues) {
  const calls = [];
  const io = {
    calls,
    log() {},
    readBody: () => body,
    runGh(args, options) {
      calls.push({ args, options });
      return args[1] === "list" ? JSON.stringify(issues) : `Created ${created}`;
    },
  };
  return { calls, io };
}

const issue = (number, fields = {}) => ({
  number,
  title,
  body: "",
  url: `https://github.com/acme/demo/issues/${number}`,
  ...fields,
});

test("the issue list is filtered by label and state, never by search syntax", () => {
  const { calls, io } = recorder([]);
  openOrRefreshIssue({ title, label, bodyFile: "audit-report.md" }, io);

  assert.deepEqual(calls[0], {
    args: [
      "issue",
      "list",
      "--state",
      "open",
      "--label",
      label,
      "--limit",
      "200",
      "--json",
      "number,title,body,url",
    ],
    options: undefined,
  });
});

test("nothing matching opens one issue, with the body on standard input", () => {
  const { calls, io } = recorder([issue(4, { title: `${title} again` })]);
  const result = openOrRefreshIssue({ title, label, bodyFile: "audit-report.md" }, io);

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], {
    args: ["issue", "create", "--title", title, "--label", label, "--body-file", "-"],
    options: { input: body },
  });
  assert.deepEqual(result, { action: "created", url: created });
});

test("the lowest open number is refreshed, and the title travels with it", () => {
  const { calls, io } = recorder([issue(91), issue(12), issue(7, { title: `${title} again` })]);
  const result = openOrRefreshIssue({ title, label, bodyFile: "audit-report.md" }, io);

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].args, ["issue", "edit", "12", "--title", title, "--body-file", "-"]);
  assert.deepEqual(result, { action: "refreshed", url: "https://github.com/acme/demo/issues/12" });
});

test("a marker recognizes a renamed issue and is written once", () => {
  const marker = "dependency-audit";
  const comment = `<!-- ${marker} -->`;
  const renamed = issue(31, {
    title: "The title this issue carried last quarter",
    body: `${comment}\n\nThe previous report.`,
  });

  const { calls, io } = recorder([renamed]);
  const result = openOrRefreshIssue({ title, label, marker, bodyFile: "audit-report.md" }, io);
  assert.deepEqual(calls[1].args, ["issue", "edit", "31", "--title", title, "--body-file", "-"]);
  assert.equal(calls[1].options.input, `${comment}\n\n${body}`);
  assert.equal(result.action, "refreshed");

  // A report built from the previous body already carries the marker.
  const repeated = recorder([renamed]);
  repeated.io.readBody = () => `${comment}\n\n${body}`;
  openOrRefreshIssue({ title, label, marker, bodyFile: "audit-report.md" }, repeated.io);
  assert.equal(repeated.calls[1].options.input, `${comment}\n\n${body}`);
});

test("a marker matches nothing when the body does not carry it", () => {
  const { calls, io } = recorder([issue(31)]);
  const result = openOrRefreshIssue(
    { title, label, marker: "dependency-audit", bodyFile: "audit-report.md" },
    io,
  );

  assert.equal(calls[1].args[1], "create");
  assert.equal(result.action, "created");
});

test("a close comment retires every match and reports the first", () => {
  const closeComment = "The scheduled audit came back clean.";
  const { calls, io } = recorder([
    issue(91),
    issue(12),
    issue(7, { title: `${title} again` }),
    issue(3),
  ]);
  const result = openOrRefreshIssue({ title, label, closeComment }, io);

  assert.deepEqual(
    calls.slice(1).map(({ args }) => args),
    [
      ["issue", "close", "3", "--comment", closeComment],
      ["issue", "close", "12", "--comment", closeComment],
      ["issue", "close", "91", "--comment", closeComment],
    ],
  );
  assert.deepEqual(result, { action: "closed", url: "https://github.com/acme/demo/issues/3" });
});

test("a close with nothing open is reported as none, not as a failure", () => {
  const { calls, io } = recorder([issue(7, { title: `${title} again` })]);
  const result = openOrRefreshIssue({ title, label, closeComment: "Clean." }, io);

  assert.equal(calls.length, 1);
  assert.deepEqual(result, { action: "none", url: "" });
});

test("a missing title or label, or anything but one mode, is rejected before any call", () => {
  const { calls, io } = recorder([]);
  const reject = (options) =>
    assert.throws(() => openOrRefreshIssue(options, io), /^Error: Usage:/);

  reject({ label, bodyFile: "audit-report.md" });
  reject({ title, bodyFile: "audit-report.md" });
  reject({ title, label });
  reject({ title, label, bodyFile: "audit-report.md", closeComment: "Clean." });
  assert.deepEqual(calls, []);
});

test("a marker that would break out of the HTML comment is rejected", () => {
  const { calls, io } = recorder([]);
  for (const marker of ["audit --> visible", "<script>", "two\nlines"]) {
    assert.throws(
      () => openOrRefreshIssue({ title, label, marker, bodyFile: "audit-report.md" }, io),
      /marker must not contain/,
    );
  }
  assert.deepEqual(calls, []);
});

test("the command line reads --name=value, pipes the body, and writes the outputs", () => {
  const workspace = mkdtempSync(join(tmpdir(), "open-or-refresh-issue-"));
  const paths = {
    gh: join(workspace, "gh"),
    issues: join(workspace, "issues.json"),
    stdin: join(workspace, "stdin.md"),
    output: join(workspace, "github-output.txt"),
  };

  writeFileSync(
    paths.gh,
    [
      "#!/bin/sh",
      "# Stands in for the GitHub CLI: answers `issue list` from a fixture and",
      "# keeps what `issue create` receives on standard input.",
      'case "$2" in',
      '  list) cat "$GH_ISSUES" ;;',
      `  create) cat > "$GH_STDIN"; echo "Created ${created}" ;;`,
      "  *) cat > /dev/null ;;",
      "esac",
      "",
    ].join("\n"),
  );
  chmodSync(paths.gh, 0o755);
  writeFileSync(paths.issues, "[]\n");
  writeFileSync(paths.output, "");

  const run = (...argv) =>
    spawnSync(process.execPath, [script, ...argv], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${workspace}${delimiter}${process.env.PATH}`,
        GH_ISSUES: paths.issues,
        GH_STDIN: paths.stdin,
        GITHUB_OUTPUT: paths.output,
      },
    });

  const opened = run(
    `--title=${title}`,
    `--label=${label}`,
    `--body-file=${bodyFixture}`,
    "--marker=dependency-audit",
    "--close-comment=",
  );
  assert.equal(opened.status, 0, opened.stderr);
  assert.equal(
    readFileSync(paths.stdin, "utf8"),
    `<!-- dependency-audit -->\n\n${readFileSync(bodyFixture, "utf8")}`,
  );
  assert.equal(readFileSync(paths.output, "utf8"), `action=created\nissue-url=${created}\n`);

  const unknown = run("--unknown=1");
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /unknown option "--unknown"/);

  const spaced = run("--title", title);
  assert.equal(spaced.status, 1);
  assert.match(spaced.stderr, /expected --name=value/);
});
