#!/usr/bin/env sh
# Verifies the crates a release publishes in the form a consumer receives:
# Cargo's package archive, not the workspace sources. Pass the published crates
# in publish order, leaves first, and `--install <crate>` for each crate whose
# binary should also be installed from its archive and answer `--version`.
#
#   scripts/verify-packages.sh --install example-cli example-core example-cli
#
# Run it from the workspace root against a committed tree; `cargo package`
# refuses to archive an uncommitted change.
set -eu

binaries=""
while [ "${1:-}" = "--install" ]; do
  shift
  binaries="${binaries} ${1:?--install needs a crate name}"
  shift
done

if [ "$#" -eq 0 ]; then
  echo "usage: $0 [--install <crate>]... <crate>..." >&2
  exit 2
fi

crates=$*
target="${CARGO_TARGET_DIR:-target}"
case "$target" in /*) ;; *) target="${PWD}/${target}" ;; esac
# Packaged crates carry the workspace member names with different sources, so
# they build in their own target directory.
packaged_target="${target}/packaged"

root="$(mktemp -d)"
trap 'rm -rf "$root"' EXIT

# Where `cargo package` puts a crate's unpacked archive.
package_dir() {
  version="$(cargo pkgid -p "$1")"
  version="${version##*#}"
  version="${version##*@}"
  printf '%s/package/%s-%s' "$target" "$1" "$version"
}

# One invocation for the whole set: packaging crate by crate would look for
# each unpublished sibling on crates.io instead of resolving it locally.
set --
for crate in $crates; do
  set -- "$@" -p "$crate"
done
cargo package --locked "$@"

verified=""
for crate in $crates; do
  directory="$(package_dir "$crate")"

  # Publish order is dependency order, so a crate's siblings are the ones
  # already packaged here. Pointing them at their archives builds the packaged
  # sources against the packaged siblings and never against the workspace copy.
  # A patch rewrites the archive's lockfile, which is why these commands use
  # `--offline` where the packaging step above uses `--locked`.
  set --
  for sibling in $verified; do
    set -- "$@" --config "patch.crates-io.${sibling}.path=\"$(package_dir "$sibling")\""
  done

  cargo test --offline --manifest-path "${directory}/Cargo.toml" \
    --target-dir "$packaged_target" "$@"

  case " $binaries " in
    *" $crate "*)
      cargo install --path "$directory" --root "$root" \
        --target-dir "$packaged_target" --offline "$@"
      ;;
  esac

  verified="${verified} ${crate}"
done

# An installed binary that cannot start makes every other check irrelevant.
for binary in "${root}/bin/"*; do
  if [ -x "$binary" ]; then "$binary" --version; fi
done

echo "Packaged crates passed:$crates."
