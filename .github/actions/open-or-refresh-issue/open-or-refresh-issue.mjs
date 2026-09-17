#!/usr/bin/env node
// A scheduled workflow has no pull request to report on, so its failures land
// nowhere: the run list is the only record, and a weekly cron turns one
// unfixed problem into a column of identical red runs. This keeps exactly one
// open issue per tracked condition — created on the first failure, refreshed
// in place on every later one, and closed with a comment once it clears.
//
// Recognition is `gh issue list` filtered by the label, then either an exact
// title match or, when `--marker` is given, an HTML comment this script writes
// at the top of the body. The marker is what survives a reworded title:
// without it a changed title opens a second issue and abandons the first.
//
// The body reaches `gh` on standard input rather than as an argument, so a
// report as long as an audit log cannot hit the command-line length limit.
//
// The `gh` invocation is a parameter, so the decision this makes — create,
// refresh, close, or nothing — is tested without a network or a repository.
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import process from "node:process";

const USAGE =
  "Usage: open-or-refresh-issue.mjs --title=<title> --label=<label> " +
  "(--body-file=<path> | --close-comment=<text>) [--marker=<id>]";

// One page of open issues carrying the label. A repository whose tracking
// label is past this many open issues has a different problem.
const LIST_LIMIT = "200";

const OPTIONS = new Map([
  ["title", "title"],
  ["label", "label"],
  ["body-file", "bodyFile"],
  ["close-comment", "closeComment"],
  ["marker", "marker"],
]);

function markerComment(marker) {
  return `<!-- ${marker} -->`;
}

// The marker ends up inside an HTML comment, so a value that could close or
// nest one would push the rest of the body back into view.
function checkMarker(marker) {
  if (/[<>\n]|--/.test(marker)) {
    throw new Error(`marker must not contain "<", ">", "--", or a newline: ${marker}`);
  }
}

// Prepending is idempotent: a refresh reads a body that already carries the
// marker only when the workflow builds its report from the previous one.
function composeBody(text, marker) {
  if (marker === "") return text;
  const comment = markerComment(marker);
  return text.startsWith(comment) ? text : `${comment}\n\n${text}`;
}

function matchingIssues(issues, title, marker) {
  if (!Array.isArray(issues)) {
    throw new TypeError("gh returned something other than a list of issues");
  }
  return (
    issues
      .filter((issue) => {
        if (issue === null || typeof issue !== "object" || !Number.isInteger(issue.number)) {
          return false;
        }
        return marker === ""
          ? issue.title === title
          : typeof issue.body === "string" && issue.body.includes(markerComment(marker));
      })
      // Lowest number first, so a duplicate opened by two runs at once does not
      // make the next refresh hop to a different issue. A close retires them all.
      .sort((first, second) => first.number - second.number)
  );
}

// Everything that reaches the network lives here; `openOrRefreshIssue` takes it
// as a parameter.
function gh(args, options = {}) {
  const result = spawnSync("gh", args, { encoding: "utf8", ...options });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? "");
    throw new Error(`gh ${args.slice(0, 2).join(" ")} exited with ${result.status ?? "a signal"}`);
  }
  return (result.stdout ?? "").trim();
}

export function openOrRefreshIssue(options, io = {}) {
  const runGh = io.runGh ?? gh;
  const readBody = io.readBody ?? ((path) => readFileSync(path, "utf8"));
  const log = io.log ?? ((line) => process.stdout.write(`${line}\n`));

  const { title = "", label = "", marker = "", bodyFile = "", closeComment = "" } = options;
  // Exactly one of the two modes: a body opens or refreshes, a comment closes.
  if (title === "" || label === "" || (bodyFile === "") === (closeComment === "")) {
    throw new Error(USAGE);
  }
  checkMarker(marker);

  // The label is a server-side filter, so an unrelated issue that happens to
  // carry the same title is never touched.
  const listed = runGh([
    "issue",
    "list",
    "--state",
    "open",
    "--label",
    label,
    "--limit",
    LIST_LIMIT,
    "--json",
    "number,title,body,url",
  ]);
  const matches = matchingIssues(JSON.parse(listed), title, marker);

  if (closeComment !== "") {
    for (const issue of matches) {
      runGh(["issue", "close", String(issue.number), "--comment", closeComment]);
    }
    if (matches.length === 0) {
      log(`No open issue labeled "${label}" matched; nothing to close.`);
      return { action: "none", url: "" };
    }
    log(`Closed ${matches.length} tracking issue(s), starting at #${matches[0].number}.`);
    return { action: "closed", url: matches[0].url ?? "" };
  }

  const body = composeBody(readBody(bodyFile), marker);
  const existing = matches[0];
  if (existing !== undefined) {
    // The title travels with every refresh. When the marker is what matched, a
    // reworded title has to reach the issue, or it keeps the first one forever.
    runGh(["issue", "edit", String(existing.number), "--title", title, "--body-file", "-"], {
      input: body,
    });
    log(`Refreshed issue #${existing.number}.`);
    return { action: "refreshed", url: existing.url ?? "" };
  }

  const created = runGh(
    ["issue", "create", "--title", title, "--label", label, "--body-file", "-"],
    { input: body },
  );
  const url = /https:\/\/\S+/.exec(created)?.[0] ?? "";
  log(`Created ${url === "" ? "the tracking issue" : url}.`);
  return { action: "created", url };
}

// Only the `--name=value` form, because an input that is legitimately empty
// would otherwise swallow the argument after it.
function parseArguments(argv) {
  const options = {};
  for (const argument of argv) {
    const separator = argument.indexOf("=");
    if (!argument.startsWith("--") || separator === -1) {
      throw new Error(`expected --name=value, found "${argument}"\n${USAGE}`);
    }
    const name = argument.slice(2, separator);
    const key = OPTIONS.get(name);
    if (key === undefined) throw new Error(`unknown option "--${name}"\n${USAGE}`);
    options[key] = argument.slice(separator + 1).trim();
  }
  return options;
}

function main(argv) {
  try {
    const result = openOrRefreshIssue(parseArguments(argv));
    // Both values are a single line, so the plain `key=value` form is safe.
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `action=${result.action}\nissue-url=${result.url}\n`,
      );
    }
    return 0;
  } catch (error) {
    process.stderr.write(`open-or-refresh-issue: ${error.message}\n`);
    return 1;
  }
}

if (process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
