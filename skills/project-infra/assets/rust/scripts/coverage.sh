#!/usr/bin/env sh
# Coverage gate for a Rust workspace: measure once, report, then enforce.
# Requires the toolchain from rust-toolchain.toml with the llvm-tools-preview
# component, and cargo-llvm-cov at the version mise.toml pins.
#
# The floors live in the committed `coverage-floor` file, one
# `<scope> = <percent>` entry per line, `#` starting a comment:
#
#   rust = 85                  # this gate's floor for the whole report
#   node = 80                  # another gate reads its own key, such as vitest
#   crates/example-cli/ = 75   # a key with a slash bounds part of the report
#
# A key without a slash names one gate's whole report, so each gate takes the
# key it owns and leaves the others alone; `rust` is the one this script needs.
# A key with a slash is matched against the source paths in the report, which
# is how a crate carries a higher floor than the workspace around it. Exit 1 is
# a missed floor, exit 2 a floor file this script cannot read.
set -eu

floor_file="coverage-floor"
report="target/lcov.info"

# Paths the published number should not speak for, such as generated sources
# and fixture or benchmark members. This drops them from the report; dropping a
# member from the instrumented run itself is `--exclude <crate>` on the command
# below.
ignore_regex='crates/example-bench/'

if [ ! -s "$floor_file" ]; then
  echo "$0: $floor_file states the coverage floors and is missing or empty" >&2
  exit 2
fi

set -- --workspace --all-features --locked --lcov --output-path "$report"
if [ -n "$ignore_regex" ]; then
  set -- "$@" --ignore-filename-regex "$ignore_regex"
fi

# One instrumented run. Every floor below is derived from the report it writes,
# so no scope is measured by a second run of the test suite.
cargo llvm-cov "$@"

# Every floor is read out of the report that now exists, and a missed one
# becomes this script's exit status only after the numbers have been printed,
# so a failing run still carries them and the artifact the workflow uploads.
status=0
summary="$(
  awk '
    function measure(label, hit, found, min,   value, verdict) {
      if (found == 0) {
        printf "- %s: no measurable lines, floor %s%%\n", label, min
        return 1
      }
      value = hit * 100 / found
      # The tolerance keeps coverage that sits exactly on the floor from
      # failing on the last binary digit of the division.
      verdict = (value + 1e-9 >= min + 0) ? "PASS" : "FAIL"
      printf "- %s: %.2f%% of %d lines, floor %s%% %s\n", label, value, found, min, verdict
      return verdict == "FAIL" ? 1 : 0
    }

    # The floor file is read first, the lcov report second.
    FNR == NR {
      sub(/#.*/, "")
      gsub(/[ \t\r]/, "")
      if ($0 == "") next
      separator = index($0, "=")
      key = separator ? substr($0, 1, separator - 1) : ""
      value = separator ? substr($0, separator + 1) : ""
      if (key == "" || value !~ /^[0-9]+(\.[0-9]+)?$/) {
        print FILENAME ": " $0 " is not <scope> = <percent>" > "/dev/stderr"
        invalid = 1
        next
      }
      if (key == "rust") { workspace = value; next }
      if (index(key, "/") == 0) next
      if (!(key in floor)) scope[++scopes] = key
      floor[key] = value
      next
    }

    /^SF:/ { file = substr($0, 4); next }
    /^LF:/ {
      lines = substr($0, 4) + 0
      found += lines
      for (i = 1; i <= scopes; i++) if (index(file, scope[i])) scope_found[scope[i]] += lines
      next
    }
    /^LH:/ {
      lines = substr($0, 4) + 0
      hit += lines
      for (i = 1; i <= scopes; i++) if (index(file, scope[i])) scope_hit[scope[i]] += lines
      next
    }

    END {
      if (invalid) exit 2
      if (workspace == "") {
        print "coverage-floor: no rust entry, so nothing states the floor" > "/dev/stderr"
        exit 2
      }
      missed = measure("workspace", hit, found, workspace)
      # A scope that matches no file in the report is a floor guarding nothing,
      # so it fails here instead of passing forever.
      for (i = 1; i <= scopes; i++)
        missed += measure(scope[i], scope_hit[scope[i]], scope_found[scope[i]], floor[scope[i]])
      if (missed) exit 1
    }
  ' "$floor_file" "$report"
)" || status=$?

if [ -n "$summary" ]; then
  printf '%s\n' "$summary"
  # GitHub renders the job summary as Markdown, so the measured numbers arrive
  # as a list and stay readable on the run that just failed the floor.
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    printf '%s\n' "$summary" >> "$GITHUB_STEP_SUMMARY"
  fi
fi

exit "$status"
