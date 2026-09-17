#!/usr/bin/env sh
# Diffs each crate's public API against its committed snapshot, so a pull
# request shows the surface itself and not only a compatibility verdict. Pass
# the crate names, and `--write` to regenerate the snapshots in the change that
# alters the API. `PUBLIC_API_TOOLCHAIN` and `PUBLIC_API_DIR` override the
# nightly toolchain cargo-public-api reads and the snapshot directory.
set -eu

toolchain="${PUBLIC_API_TOOLCHAIN:-nightly}"
directory="${PUBLIC_API_DIR:-api-snapshots}"

write=0
if [ "${1:-}" = "--write" ]; then
  write=1
  shift
fi

if [ "$#" -eq 0 ]; then
  echo "usage: $0 [--write] <crate>..." >&2
  exit 2
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

for crate in "$@"; do
  # `--simplified` drops the blanket and auto-trait implementations that follow
  # from the items already listed.
  cargo "+${toolchain}" public-api --package "$crate" --all-features \
    --simplified --color never > "${work}/${crate}.txt"

  if [ "$write" -eq 1 ]; then
    mkdir -p "$directory"
    cp "${work}/${crate}.txt" "${directory}/${crate}.txt"
    continue
  fi

  # Sorting both sides keeps a reordering inside rustdoc's output from failing
  # the check on its own.
  LC_ALL=C sort "${directory}/${crate}.txt" > "${work}/${crate}.expected.txt"
  LC_ALL=C sort "${work}/${crate}.txt" -o "${work}/${crate}.txt"
  diff -u "${work}/${crate}.expected.txt" "${work}/${crate}.txt"
done
