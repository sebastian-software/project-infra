#!/usr/bin/env node
// Holds every shipped native artifact under a recorded byte ceiling, so a
// dependency that links a data table or a second runtime into the binary fails
// the build instead of reaching consumers as a larger download on each of the
// platforms. Run it after the build, from the repository root, as a CI step in
// the lane that produced the artifacts: pass the ids to check, or no argument
// to check every budget.
//
// The gate is a ceiling with headroom rather than a comparison against the
// baseline, because sizes move with toolchain patch releases and linkers, and
// an exact comparison would report growth that is not there. `baseline` is the
// measured size of a published artifact, `maxBytes` the deliberate ceiling
// above it. Raising a ceiling is an edit whose reason belongs in the commit
// message; that edit is what this check is for.

import { statSync } from "node:fs";

// One entry per artifact this repository publishes. `id` selects it on the
// command line, which is the platform id when the artifacts are per-platform.
const BUDGETS = [
  {
    id: "linux-x64-gnu",
    label: "linux-x64-gnu addon",
    path: "npm/linux-x64-gnu/tool.linux-x64-gnu.node",
    baseline: { label: "tool-linux-x64-gnu@1.4.0", bytes: 7_057_176 },
    maxBytes: 7_800_000,
  },
  {
    id: "linux-x64-musl",
    label: "linux-x64-musl addon",
    // A statically linked musl build carries what the glibc build resolves at
    // load time, so it gets its own baseline instead of a shared ceiling.
    path: "npm/linux-x64-musl/tool.linux-x64-musl.node",
    baseline: { label: "tool-linux-x64-musl@1.4.0", bytes: 7_412_040 },
    maxBytes: 8_200_000,
  },
];

const selected = selectBudgets(process.argv.slice(2));
let failed = false;

for (const budget of selected) {
  const size = measure(budget.path);
  if (size === undefined) {
    failed = true;
    console.error(`${budget.label}: no artifact at ${budget.path}; build it before this check.`);
    continue;
  }

  const headroom = budget.maxBytes - size;
  const delta = size - budget.baseline.bytes;
  const comparison = `${mb(Math.abs(delta))} ${delta < 0 ? "below" : "above"} baseline ${budget.baseline.label}`;

  if (headroom < 0) {
    failed = true;
    console.error(
      `${budget.label}: ${bytes(size)} exceeds its budget of ${bytes(budget.maxBytes)} by ${mb(-headroom)}; ${comparison}.\n` +
        `  Shrink the artifact, or raise maxBytes for ${budget.id} and say why.`,
    );
    continue;
  }

  const used = ((size / budget.maxBytes) * 100).toFixed(1);
  console.log(
    `${budget.label}: ${bytes(size)} of ${bytes(budget.maxBytes)}, ${used} % used and ${mb(headroom)} to spare; ${comparison}.`,
  );
}

process.exit(failed ? 1 : 0);

/** Every budget, or the named ones; an unknown id is a typo, not an empty run. */
function selectBudgets(ids) {
  if (ids.length === 0) return BUDGETS;
  const unknown = ids.filter((id) => !BUDGETS.some((budget) => budget.id === id));
  if (unknown.length > 0) {
    console.error(`No budget is defined for ${unknown.join(", ")}.`);
    process.exit(1);
  }
  return BUDGETS.filter((budget) => ids.includes(budget.id));
}

/** Undefined for a missing artifact, so a skipped build cannot pass the check. */
function measure(filePath) {
  try {
    const stats = statSync(filePath);
    return stats.isFile() ? stats.size : undefined;
  } catch {
    return undefined;
  }
}

/** Both forms for a measured size, so a report can be compared and quoted. */
function bytes(value) {
  return `${mb(value)} (${value.toLocaleString("en-US")} B)`;
}

function mb(value) {
  return `${(value / 1_000_000).toFixed(2)} MB`;
}
