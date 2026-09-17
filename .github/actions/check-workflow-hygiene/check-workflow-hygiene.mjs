#!/usr/bin/env node
// Four properties keep a workflow bounded and predictable, and only the pin
// rule had a check until now: every job stops at a timeout, the workflow states
// the token scope it grants, a workflow that pull requests trigger cancels the
// runs it supersedes, and a repository that splits its checks across jobs keeps
// one aggregate gate job under a stable name for branch protection.
//
// The scan is line-based on purpose: this runs in a job that only checks the
// repository out, with no dependency install, so it cannot pull in a YAML
// parser. It reads the shape the organization's formatter produces — two-space
// indentation — so a job is a key at exactly two spaces under `jobs:` and a
// job's own settings sit at exactly four. That indentation is part of the rule
// rather than an approximation of it: a deeper `timeout-minutes:` bounds a
// single step and leaves the job itself unbounded.
//
// What the scan cannot see: a property that arrives through a reusable workflow
// or a YAML anchor, a trigger list spread over several lines, and whether a
// timeout is long enough or a permission set minimal. Those stay review
// questions.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import process from "node:process";

const ALL_RULES = ["timeouts", "permissions", "concurrency"];
const DEFAULT_GATE_WORKFLOW = "check.yml";

const TOP_LEVEL_KEY = /^(?<key>[A-Za-z_][\w-]*|"[^"]+"|'[^']+')\s*:(?<value>.*)$/;
const JOB_KEY = /^ {2}(?<name>[A-Za-z_][\w.-]*)\s*:\s*(?:#.*)?$/;
const JOB_FIELD = /^ {4}(?<key>[A-Za-z_][\w-]*)\s*:(?<value>.*)$/;
const PULL_REQUEST_ENTRY = /^ {2}(?:-\s*)?["']?pull_request\b/;
const LIST_ITEM = /^ {5,}-\s*\S/;
const BLANK_OR_COMMENT = /^\s*(?:#.*)?$/;

function unquote(value) {
  return value.replaceAll(/^['"]|['"]$/g, "");
}

// A YAML comment runs to the end of the line, so everything from an unquoted
// `#` on is prose and must not be read as part of the value.
function withoutComment(value) {
  const comment = value.search(/(^|\s)#/);
  return (comment === -1 ? value : value.slice(0, comment)).trim();
}

function yamlFiles(target) {
  if (statSync(target).isFile()) {
    return /\.ya?ml$/.test(target) ? [target] : [];
  }
  const files = [];
  const pending = [target];
  while (pending.length > 0) {
    const current = pending.pop();
    const entry = statSync(current);
    if (entry.isDirectory()) {
      for (const name of readdirSync(current)) pending.push(join(current, name));
    } else if (entry.isFile() && /\.ya?ml$/.test(current)) {
      files.push(current);
    }
  }
  return files.sort();
}

// Splits a workflow into what the rules ask about: its top-level keys with the
// lines below each one, and the jobs under `jobs:` with their own lines.
function readWorkflow(text) {
  const top = new Map();
  const jobs = [];
  let section = null;
  let job = null;

  for (const [index, line] of text.split("\n").entries()) {
    const number = index + 1;
    const key = TOP_LEVEL_KEY.exec(line);
    if (key) {
      const name = unquote(key.groups.key);
      section = top.get(name) ?? {
        name,
        line: number,
        value: withoutComment(key.groups.value),
        body: [],
      };
      top.set(name, section);
      job = null;
      continue;
    }
    if (section === null) continue;
    section.body.push({ number, line });
    if (section.name !== "jobs") continue;

    const start = JOB_KEY.exec(line);
    if (start) {
      job = { name: start.groups.name, line: number, body: [] };
      jobs.push(job);
    } else if (job !== null) {
      job.body.push({ number, line });
    }
  }

  return { top, jobs };
}

// The settings a job carries itself, as opposed to those of its steps.
function jobFields(job) {
  const fields = new Map();
  for (const [position, entry] of job.body.entries()) {
    const field = JOB_FIELD.exec(entry.line);
    const name = field === null ? "" : unquote(field.groups.key);
    if (field === null || fields.has(name)) continue;
    fields.set(name, { line: entry.number, value: withoutComment(field.groups.value), position });
  }
  return fields;
}

// True when the field has its value on its own line (`needs: [a, b]`) or is
// followed by the list items that belong to it.
function hasValueOrItems(job, field) {
  if (field.value.length > 0) return true;
  for (const entry of job.body.slice(field.position + 1)) {
    if (BLANK_OR_COMMENT.test(entry.line)) continue;
    if (!/^ {5,}/.test(entry.line)) return false;
    if (LIST_ITEM.test(entry.line)) return true;
  }
  return false;
}

function finding(file, line, scope, rule, message) {
  return `${file}:${line}: ${rule}: ${scope}: ${message}`;
}

function timeoutProblems(file, workflow) {
  const problems = [];
  for (const job of workflow.jobs) {
    const fields = jobFields(job);
    // A job that calls a reusable workflow is exempt: GitHub rejects
    // `timeout-minutes` on it, and the called workflow carries its own.
    if (fields.has("uses") || fields.has("timeout-minutes")) continue;
    const message = 'no job-level "timeout-minutes:"; a stalled job runs to the six-hour default';
    problems.push(finding(file, job.line, `job "${job.name}"`, "timeouts", message));
  }
  return problems;
}

function permissionProblems(file, workflow) {
  if (workflow.top.has("permissions")) return [];
  const line = workflow.top.get("jobs")?.line ?? 1;
  const message = 'no top-level "permissions:" block; the token scope is left implicit';
  return [finding(file, line, "workflow", "permissions", message)];
}

function concurrencyProblems(file, workflow) {
  // YAML 1.1 readers take the unquoted key `on` for the boolean true, which is
  // how a formatter can end up writing `"on":`; both spell the same trigger.
  const trigger = workflow.top.get("on") ?? workflow.top.get("true");
  const pullRequest =
    trigger !== undefined &&
    (/\bpull_request\b/.test(trigger.value) ||
      trigger.body.some((entry) => PULL_REQUEST_ENTRY.test(entry.line)));
  if (!pullRequest || workflow.top.has("concurrency")) return [];
  const message = 'a "pull_request" trigger without a top-level "concurrency:" block';
  return [finding(file, trigger.line, "workflow", "concurrency", message)];
}

// Only for a repository that splits its checks across jobs: the aggregate job
// is what branch protection requires, so it has to run after a failure and name
// the jobs it examines.
function gateProblems(gate, jobName, workflowName) {
  const scope = `job "${jobName}"`;
  const absent = "the gate workflow is not among the scanned files";
  if (gate === undefined) return [finding(workflowName, 1, "workflow", "gate", absent)];

  const job = gate.workflow.jobs.find((entry) => entry.name === jobName);
  if (job === undefined) {
    const line = gate.workflow.top.get("jobs")?.line ?? 1;
    const message = "no such job; branch protection then has no stable name to require";
    return [finding(gate.file, line, scope, "gate", message)];
  }

  const fields = jobFields(job);
  const problems = [];
  const note = (message) => problems.push(finding(gate.file, job.line, scope, "gate", message));
  const needs = fields.get("needs");
  if (needs === undefined || !hasValueOrItems(job, needs)) {
    note('no "needs:" list, so it gates nothing');
  }
  const condition = fields.get("if");
  if (condition === undefined || !condition.value.includes("always()")) {
    note('not "if: always()", so a failed job skips the gate instead of failing it');
  }
  return problems;
}

export function checkWorkflowHygiene(targets, options = {}) {
  const rules = options.rules ?? ALL_RULES;
  if (rules.length === 0 || rules.some((rule) => !ALL_RULES.includes(rule))) {
    throw new Error(`rules must be a non-empty subset of ${ALL_RULES.join(",")}`);
  }
  const gateJob = options.gateJob ?? "";
  const gateWorkflow = options.gateWorkflow ?? DEFAULT_GATE_WORKFLOW;
  const files = targets.flatMap((target) => yamlFiles(target));
  const problems = [];
  let checked = 0;
  let gate;

  for (const path of files) {
    const file = relative(process.cwd(), path) || path;
    const workflow = readWorkflow(readFileSync(path, "utf8"));
    checked += workflow.jobs.length;
    if (rules.includes("timeouts")) problems.push(...timeoutProblems(file, workflow));
    if (rules.includes("permissions")) problems.push(...permissionProblems(file, workflow));
    if (rules.includes("concurrency")) problems.push(...concurrencyProblems(file, workflow));
    if (basename(path) === gateWorkflow) gate = { file, workflow };
  }
  if (gateJob.length > 0) problems.push(...gateProblems(gate, gateJob, gateWorkflow));

  return { checked, files, problems, rules: gateJob.length > 0 ? [...rules, "gate"] : rules };
}

function report(result, targets) {
  if (result.files.length === 0) {
    process.stderr.write(`No YAML files found in ${targets.join(", ")}\n`);
    return 2;
  }
  const scope = `${result.files.length} files; rules: ${result.rules.join(", ")}`;
  if (result.problems.length > 0) {
    for (const problem of result.problems) process.stderr.write(`  ${problem}\n`);
    process.stderr.write(
      `Workflow hygiene failed (${result.problems.length} findings in ${scope})\n`,
    );
    return 1;
  }
  process.stdout.write(`Workflow hygiene verified (${result.checked} jobs in ${scope})\n`);
  return 0;
}

// `--name value` and `--name=value` both work; everything else is a path.
function parseArguments(argv) {
  const options = {
    rules: ALL_RULES,
    gateJob: "",
    gateWorkflow: DEFAULT_GATE_WORKFLOW,
    targets: [],
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith("--")) {
      options.targets.push(argv[index]);
      continue;
    }
    const separator = argv[index].indexOf("=");
    const name = separator === -1 ? argv[index].slice(2) : argv[index].slice(2, separator);
    const given = separator === -1 ? argv[index + 1] : argv[index].slice(separator + 1);
    if (separator === -1) index += 1;
    const value = (given ?? "").trim();
    if (name === "rules")
      options.rules = value
        .split(",")
        .map((rule) => rule.trim())
        .filter(Boolean);
    else if (name === "gate-job") options.gateJob = value;
    else if (name === "gate-workflow") options.gateWorkflow = value || DEFAULT_GATE_WORKFLOW;
    else throw new Error(`unknown option "--${name}"`);
  }
  if (options.targets.length === 0) options.targets.push(".github/workflows");
  return options;
}

function main(argv) {
  let targets = argv;
  try {
    const options = parseArguments(argv);
    targets = options.targets;
    return report(checkWorkflowHygiene(targets, options), targets);
  } catch (error) {
    process.stderr.write(`Failed to scan ${targets.join(", ")}: ${error.message}\n`);
    return 2;
  }
}

if (process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
