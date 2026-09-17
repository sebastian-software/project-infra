#!/usr/bin/env sh
# Keeps the files that carry `unsafe` Rust enumerated and reviewed. The
# `unsafe_code` lint in Cargo is the gate the compiler enforces; this script
# holds the exception list to the tree, so a file that starts carrying `unsafe`
# and an entry whose file no longer carries any both fail.
#
# Run it from the repository root. The list is repository-owned: one path per
# line, whitespace, then the reason that file needs unsafe code. Blank lines and
# `#` comments are ignored. Pass the list as the first argument or in
# UNSAFE_ALLOWLIST; the default is unsafe-allowlist.txt in the repository root.
#
# A carrier is any tracked *.rs file containing the word `unsafe`. The match is
# textual and deliberately simple, so a comment using the bare word counts as
# one: reword the comment, or list the file with that as its reason.
set -eu

list=${1:-${UNSAFE_ALLOWLIST:-unsafe-allowlist.txt}}
[ -f "$list" ] || { echo "No unsafe allowlist at $list" >&2; exit 1; }
IFS='
'

# The first field of every entry, and every tracked Rust file with the keyword.
allowed=$(sed 's/#.*//' "$list" | awk 'NF { print $1 }')
carriers=$(git grep -l -w unsafe -- '*.rs' || true)
failed=0

for file in $carriers; do
  if ! printf '%s\n' "$allowed" | grep -qxF "$file"; then
    echo "unsafe keyword in a file that is not on the list: $file" >&2
    failed=1
  fi
done

for file in $allowed; do
  if ! printf '%s\n' "$carriers" | grep -qxF "$file"; then
    echo "stale entry, no unsafe keyword in: $file" >&2
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo "Every use of unsafe belongs to a file listed in $list, with its reason." >&2
  exit 1
fi

echo "Unsafe audit passed: $(printf '%s\n' "$allowed" | grep -c . || true) listed carriers."
