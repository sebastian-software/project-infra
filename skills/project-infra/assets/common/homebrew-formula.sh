#!/usr/bin/env sh
# Prints the Homebrew formula for one published release, so a tap can install
# the archives that release carries:
#
#   scripts/homebrew-formula.sh <tag> [SHA256SUMS] > example.rb
#
# The checksums are read from the release's own `SHA256SUMS`, which
# `finish-release` assembles from the per-asset `.sha256` files after it has
# asserted that every expected asset arrived. One download therefore replaces
# four, the formula cannot state a hash the release contradicts, and an archive
# the release does not carry stops the run instead of reaching the tap. Run it
# once the release is public and upload the output as a release asset;
# `brew install --build-from-source` and `brew test` belong in the tap, which
# is the repository that has Homebrew.
set -eu

# The tap file is `Formula/<name>.rb`, and Homebrew derives the class name from
# that file name: `foo-bar.rb` has to declare `class FooBar`.
FORMULA_NAME="example"

# `desc` is printed with the formula name in front of it, so it repeats neither
# the name nor a trailing period. `license` is emitted as written, because a
# dual-licensed project needs the Ruby form `any_of: ["MIT", "Apache-2.0"]`
# rather than a single SPDX expression string.
FORMULA_DESC="Manage project files from the command line"
FORMULA_HOMEPAGE="https://github.com/sebastian-software/example"
FORMULA_LICENSE='any_of: ["MIT", "Apache-2.0"]'

# The repository the release lives in, and the prefix in front of the version in
# its tags: `<component>-v` for a component tag, `v` for a plain one. The
# version is the tag without that prefix, so a tag from another product fails
# here instead of producing a formula for assets that do not exist.
FORMULA_REPOSITORY="sebastian-software/example"
FORMULA_TAG_PREFIX="example-v"

# The archive base name `package-binary` used: its `name` input, or the file
# name of the binary by default. With the version and the target triple it
# forms `<name>-<version>-<target>.tar.gz`, the same name an installer script
# and `cargo binstall` reconstruct.
FORMULA_ARCHIVE="example"

# The executable inside the archive, and the body of `def install`, one Ruby
# statement per line. Whatever `package-binary` was given in `extra` needs its
# own line here or it stays in the unpacked directory: completions and a man
# page are installed, the README and the licenses are not.
FORMULA_BINARY="example"
FORMULA_INSTALL='bin.install "example"'

# Runtime formulae the tool needs, space separated. A statically linked binary
# needs none; a tool that shells out to Git names `git`.
FORMULA_DEPENDS=""

tag="${1:-}"
sums="${2:-SHA256SUMS}"
if [ -z "$tag" ]; then
  echo "usage: $0 <tag> [sha256sums-file]" >&2
  exit 2
fi

case "$tag" in
  "$FORMULA_TAG_PREFIX"[0-9]*) version="${tag#"$FORMULA_TAG_PREFIX"}" ;;
  *)
    echo "$0: '$tag' is not a release tag of $FORMULA_NAME (expected ${FORMULA_TAG_PREFIX}<version>)" >&2
    exit 1
    ;;
esac

archive() {
  printf '%s-%s-%s.tar.gz' "$FORMULA_ARCHIVE" "$version" "$1"
}

# The record is found by asset name rather than by position, so the lookup does
# not depend on the order the checksums were assembled in. `sha256sum -b` marks
# a binary-mode record with `*` before the name.
checksum() {
  hash="$(awk -v file="$1" '
    $1 ~ /^[0-9a-f]+$/ {
      name = $2
      sub(/^\*/, "", name)
      if (name == file) {
        print $1
        exit
      }
    }
  ' "$sums")"
  if [ -z "$hash" ]; then
    echo "$0: $sums carries no checksum for $1" >&2
    exit 1
  fi
  printf '%s' "$hash"
}

# Homebrew covers exactly these four platforms, so a musl or Windows archive
# has no block to appear in. Every checksum is resolved before the first line is
# printed, which turns a missing archive into an error rather than half a
# formula.
macos_arm="$(archive aarch64-apple-darwin)"
macos_intel="$(archive x86_64-apple-darwin)"
linux_arm="$(archive aarch64-unknown-linux-gnu)"
linux_intel="$(archive x86_64-unknown-linux-gnu)"
macos_arm_sha="$(checksum "$macos_arm")"
macos_intel_sha="$(checksum "$macos_intel")"
linux_arm_sha="$(checksum "$linux_arm")"
linux_intel_sha="$(checksum "$linux_intel")"

download="https://github.com/${FORMULA_REPOSITORY}/releases/download/${tag}"
class="$(printf '%s\n' "$FORMULA_NAME" | awk -F '[-_]' '{
  for (part = 1; part <= NF; part++) printf "%s%s", toupper(substr($part, 1, 1)), substr($part, 2)
  print ""
}')"

# `version` is stated rather than left to Homebrew, which otherwise reads it out
# of whichever URL the current platform selects.
cat <<FORMULA
class ${class} < Formula
  desc "${FORMULA_DESC}"
  homepage "${FORMULA_HOMEPAGE}"
  version "${version}"
  license ${FORMULA_LICENSE}
FORMULA

if [ -n "$FORMULA_DEPENDS" ]; then
  echo
  for dependency in $FORMULA_DEPENDS; do
    printf '  depends_on "%s"\n' "$dependency"
  done
fi

# `on_arm` and `on_intel` nested in `on_macos` and `on_linux` are the documented
# way to vary `url` and `sha256` by system, and they name the two architectures
# exactly instead of serving one of them to whatever is not the other.
# `Hardware::CPU.arm?` is the form for `install` and `test`, where the blocks
# are not available.
cat <<FORMULA

  on_macos do
    on_arm do
      url "${download}/${macos_arm}"
      sha256 "${macos_arm_sha}"
    end

    on_intel do
      url "${download}/${macos_intel}"
      sha256 "${macos_intel_sha}"
    end
  end

  on_linux do
    on_arm do
      url "${download}/${linux_arm}"
      sha256 "${linux_arm_sha}"
    end

    on_intel do
      url "${download}/${linux_intel}"
      sha256 "${linux_intel_sha}"
    end
  end

  def install
FORMULA

printf '%s\n' "$FORMULA_INSTALL" | sed 's/^/    /'

# `--version` is the smallest test that proves the tap installed the release it
# advertises; a tool with a richer command line asserts real output instead.
cat <<FORMULA
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/${FORMULA_BINARY} --version")
  end
end
FORMULA
