// Fixtures under `fixtures/` are workflows written to trip exactly one rule
// each, so a finding's rule, job, and line can be asserted without a real
// repository around them.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";

import { checkWorkflowHygiene } from "../check-workflow-hygiene.mjs";

const fixtures = join(import.meta.dirname, "fixtures");
const script = join(import.meta.dirname, "..", "check-workflow-hygiene.mjs");
const fixture = (name) => join(fixtures, name);

// The line a fixture's job key sits on, so a line number is checked against the
// file instead of against a number copied into the test.
function lineOf(name, text) {
  const lines = readFileSync(fixture(name), "utf8").split("\n");
  return lines.indexOf(text) + 1;
}

test("a workflow that satisfies every rule, gate included, reports nothing", () => {
  const result = checkWorkflowHygiene([fixture("passing.yml")], {
    gateJob: "gate",
    gateWorkflow: "passing.yml",
  });
  assert.deepEqual(result.problems, []);
  assert.equal(result.checked, 3);
  assert.deepEqual(result.rules, ["timeouts", "permissions", "concurrency", "gate"]);
});

test("a job without a job-level timeout is named with its line", () => {
  const { problems } = checkWorkflowHygiene([fixture("missing-timeout.yml")]);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /missing-timeout\.yml:\d+: timeouts: job "unbounded": /);
  const line = lineOf("missing-timeout.yml", "  unbounded:");
  assert.ok(problems[0].includes(`missing-timeout.yml:${line}:`), problems[0]);
});

test("a job that calls a reusable workflow is exempt from the timeout rule", () => {
  const { problems, checked } = checkWorkflowHygiene([fixture("reusable-job.yml")]);
  assert.deepEqual(problems, []);
  assert.equal(checked, 2);
});

test("a workflow without a top-level permissions block is reported once", () => {
  const { problems } = checkWorkflowHygiene([fixture("missing-permissions.yml")]);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /missing-permissions\.yml:\d+: permissions: workflow: /);
});

test("a pull-request trigger without a concurrency block is reported", () => {
  const { problems } = checkWorkflowHygiene([fixture("pull-request-no-concurrency.yml")]);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /concurrency: workflow: /);
  const line = lineOf("pull-request-no-concurrency.yml", "on:");
  assert.ok(problems[0].includes(`pull-request-no-concurrency.yml:${line}:`), problems[0]);
});

test("the flow form of on: declares the same pull-request trigger", () => {
  const { problems } = checkWorkflowHygiene([fixture("flow-triggers.yml")]);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /flow-triggers\.yml:\d+: concurrency: workflow: /);
});

test("the gate rule stays off until a gate job is named", () => {
  assert.deepEqual(checkWorkflowHygiene([fixture("no-gate.yml")]).problems, []);
  const { problems } = checkWorkflowHygiene([fixture("no-gate.yml")], {
    gateJob: "gate",
    gateWorkflow: "no-gate.yml",
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /gate: job "gate": no such job/);
});

test("a gate job reports a missing needs list and a missing always() condition", () => {
  const { problems } = checkWorkflowHygiene([fixture("weak-gate.yml")], {
    gateJob: "gate",
    gateWorkflow: "weak-gate.yml",
  });
  assert.equal(problems.length, 2);
  assert.match(problems[0], /gate: job "gate": no "needs:" list/);
  assert.match(problems[1], /gate: job "gate": not "if: always\(\)"/);
});

test("a gate workflow missing from the scanned paths is a finding, not a pass", () => {
  const { problems } = checkWorkflowHygiene([fixture("no-gate.yml")], { gateJob: "gate" });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /check\.yml:1: gate: workflow: the gate workflow is not among/);
});

test("rules selects the subset to apply", () => {
  const { problems, rules } = checkWorkflowHygiene([fixture("missing-timeout.yml")], {
    rules: ["permissions", "concurrency"],
  });
  assert.deepEqual(problems, []);
  assert.deepEqual(rules, ["permissions", "concurrency"]);
  assert.throws(
    () => checkWorkflowHygiene([fixture("passing.yml")], { rules: ["timeout"] }),
    /non-empty subset/,
  );
});

test("a directory is scanned recursively and every finding names its file", () => {
  const { problems, files } = checkWorkflowHygiene([fixtures]);
  assert.equal(files.length, 8);
  assert.ok(problems.length >= 3);
  for (const problem of problems) {
    assert.match(problem, /fixtures\/[a-z-]+\.yml:\d+: (timeouts|permissions|concurrency): /);
  }
});

test("the command line exits 1 on a finding and 0 on a clean scan", () => {
  const run = (...argv) => spawnSync(process.execPath, [script, ...argv], { encoding: "utf8" });

  const failed = run("--rules=timeouts", fixture("missing-timeout.yml"));
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /Workflow hygiene failed \(1 findings in 1 files; rules: timeouts\)/);

  const passed = run(
    "--gate-job",
    "gate",
    "--gate-workflow",
    "passing.yml",
    fixture("passing.yml"),
  );
  assert.equal(passed.status, 0);
  assert.match(passed.stdout, /Workflow hygiene verified \(3 jobs in 1 files; rules: .*gate\)/);

  assert.equal(run("--unknown=1", fixtures).status, 2);
});
