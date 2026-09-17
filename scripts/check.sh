#!/usr/bin/env sh
# Complete local gate for this repository. The CI workflow runs this same
# script, so a contributor can reproduce a failure without reading a workflow.
#
# Requires Node.js 22.20.0 or newer and Python 3.11 or newer. Checks are
# read-only; run `npx oxfmt@0.68.0 .` to apply formatting.
set -eu

OXFMT_VERSION=0.68.0

echo "==> Formatting (Markdown, JSON, YAML, TypeScript)"
npx --yes "oxfmt@${OXFMT_VERSION}" --check .

echo "==> Documentation links, package boundaries, and skill metadata"
node scripts/check-docs.mjs

# oxfmt does not parse TOML, so the configuration excerpts are checked here.
echo "==> TOML configuration excerpts"
python3 - <<'PY'
import pathlib
import sys
import tomllib

failed = False
files = sorted(pathlib.Path("skills").rglob("*.toml"))
for path in files:
    try:
        tomllib.loads(path.read_text())
    except tomllib.TOMLDecodeError as error:
        print(f"  {path}: {error}", file=sys.stderr)
        failed = True

if failed:
    sys.exit(1)
print(f"TOML check passed: {len(files)} files.")
PY

# The shared actions check that every `uses:` names a full commit SHA and that
# every workflow carries a timeout, an explicit token scope, and cancellation of
# superseded runs. Running them here holds this repository to the rules it
# publishes.
echo "==> Action pins in this repository's workflows"
node .github/actions/check-action-pins/check-action-pins.mjs .github/workflows .github/actions

# The gate rule stays off: this repository runs its checks in the single `check`
# job, which is itself the name branch protection requires, so there is no
# aggregate job to find.
echo "==> Workflow hygiene in this repository's workflows"
node .github/actions/check-workflow-hygiene/check-workflow-hygiene.mjs .github/workflows

# The hygiene rules are code, so they carry fixtures. Node runs them; nothing is
# installed.
echo "==> Workflow hygiene action tests"
node --test --test-reporter=dot ".github/actions/check-workflow-hygiene/test/*.test.mjs"
echo "Workflow hygiene tests passed."

# Git hook excerpts carry no suffix, so the hook directory is matched by path.
echo "==> Shell configuration excerpts"
for script in $(find skills -type f \( -name '*.sh' -o -path '*/githooks/*' \)); do
  sh -n "$script"
done
echo "Shell check passed."

echo "All checks passed."
