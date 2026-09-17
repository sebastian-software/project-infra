#!/usr/bin/env sh
# Renders the tool-family membership block into the READMEs that package
# registries publish, and verifies them in the gate:
#
#   scripts/readme-family.sh            # check, exits non-zero on drift
#   scripts/readme-family.sh --write    # regenerate the blocks in place
#
# The block comes from the family registry, which owns the member list, the
# one-line jobs, and the links, so nothing between the `ferramenta-family`
# markers is edited here. The root README is deliberately absent from the list
# below: it receives the same block from the family theme that mdtheme composes,
# and a second pass would render it twice.
#
# Node and pnpm are prerequisites of this check alone, and the generator is
# fetched over the network, so run it in its own CI job rather than adding a
# package manager to a job that otherwise needs none.
set -eu

# A commit, never a branch or a tag: a floating ref renders whatever the
# registry holds at that moment, so a run would bless a different block than the
# one it blessed yesterday and drift would land unreviewed. Bump this together
# with the family theme pin in mdtheme.yaml and rerun with `--write`.
FAMILY_GENERATOR_REVISION="05fadd21d86b69bb15179ef4461bef6b3b531f88"

# This project's name in the registry. The generator uses it to mark the member
# the reader is already looking at and to describe the siblings.
FAMILY_TOOL="example"

# One `path:variant` entry per published README, relative to the repository
# root. `registry` is the plain-Markdown variant for crates.io and npm;
# `github` is the grouped-table variant, which needs HTML to render.
FAMILY_READMES="crates/example/README.md:registry
packages/example/README.md:registry"

# `&path:` selects the generator package inside the family repository. Without
# it the package manager fetches the repository root and finds no binary.
generator="github:sebastian-software/ferramenta#${FAMILY_GENERATOR_REVISION}&path:/packages/family"

mode="${1:---check}"
case "$mode" in
  --check | --write) ;;
  *)
    echo "usage: $0 [--check|--write]" >&2
    exit 2
    ;;
esac

# The paths are repository-relative, so the script runs from the root wherever
# it is invoked.
cd "$(dirname "$0")/.."

# Every README is rendered before the script fails, so one run reports every
# block that drifted instead of only the first.
status=0
for entry in $FAMILY_READMES; do
  pnpm dlx "$generator" \
    --current "$FAMILY_TOOL" --variant "${entry##*:}" "$mode" "${entry%:*}" || status=1
done

exit "$status"
