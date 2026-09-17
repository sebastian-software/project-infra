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

# The shared action checks that every `uses:` names a full commit SHA. Running
# it here holds this repository to the rule it publishes.
echo "==> Action pins in this repository's workflows"
node .github/actions/check-action-pins/check-action-pins.mjs .github/workflows .github/actions

echo "==> Shell configuration excerpts"
for script in $(find skills -name '*.sh'); do
  sh -n "$script"
done
echo "Shell check passed."

echo "All checks passed."
