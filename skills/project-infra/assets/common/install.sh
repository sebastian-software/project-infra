#!/usr/bin/env sh
# Install a released binary from GitHub Releases: no toolchain, no package
# manager, and no elevated privileges. The script downloads exactly the assets
# the `package-binary` and `finish-release` actions attach to a release, and
# verifies every one of them before it replaces anything:
#
#   <tool>-<version>-<target>.tar.gz                one top-level directory
#                                                   named like the archive
#   SHA256SUMS                                      the release-wide checksums,
#   <tool>-<version>-<target>.tar.gz.sha256         or this archive's own
#   <tool>-<version>-<target>.tar.gz.sigstore.json  the keyless signature
#
# Usage:
#   sh install.sh [--version X.Y.Z] [--bin-dir PATH]
#   INSTALL_VERIFY=required sh install.sh   # stop unless the signature verifies
#
# The archive name is the one `package-binary` derives by default; a release
# that sets that action's `name` input renames the assets here too.
#
# Every failure before the final rename leaves the installed binary untouched.
# `test-install.sh` beside this file exercises those failures offline.
set -eu

# Adapt these to the project. They are read from the environment so that the
# harness can run this exact file against a fixture release; keep that form and
# the harness keeps working on the project's copy. `tag_prefix` is `v` for a
# repository that releases one product and `<tool>-v` for a component of a
# repository that releases several.
tool="${INSTALL_TOOL:-example}"
repository="${INSTALL_REPOSITORY:-sebastian-software/example}"
tag_prefix="${INSTALL_TAG_PREFIX:-v}"

# The keyless certificate's identity is the workflow that produced the archive,
# so the pattern names that workflow and the branch it runs on. A pattern that
# stops at `/.github/workflows/` accepts a bundle any workflow in the repository
# could have signed.
workflow_identity="^https://github\.com/${repository}/\.github/workflows/publish\.yml@refs/heads/main$"
oidc_issuer="https://token.actions.githubusercontent.com"

releases="https://github.com/${repository}/releases"
verify="${INSTALL_VERIFY:-auto}"
# `~/.local/bin` is a user-owned directory, which is why nothing here elevates:
# an installer running under `sudo` would write a root-owned binary and run
# downloaded code as root to smoke-test it.
bin_dir="${HOME:?HOME must be set}/.local/bin"
version=""
staged=""

fail() {
  printf '%s: %s\n' "$tool" "$*" >&2
  exit 1
}

note() {
  printf '%s: %s\n' "$tool" "$*" >&2
}

usage() {
  printf 'Usage: install.sh [--version X.Y.Z] [--bin-dir PATH]\n\n'
  printf '  --version   release to install; the newest release by default\n'
  printf '  --bin-dir   installation directory (default %s)\n' "$bin_dir"
  printf '\nINSTALL_VERIFY=required fails unless cosign verifies the signature.\n'
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --version | --bin-dir)
      [ "$#" -ge 2 ] || fail "$1 requires a value"
      case "$1" in
        --version) version="$2" ;;
        --bin-dir) bin_dir="$2" ;;
      esac
      shift 2
      ;;
    --help)
      usage
      exit 0
      ;;
    *) fail "unknown argument: $1" ;;
  esac
done

[ -n "$bin_dir" ] || fail 'the installation directory must not be empty'
case "$verify" in
  auto | required) ;;
  *) fail "INSTALL_VERIFY must be auto or required, not \"$verify\"" ;;
esac

# The version reaches a URL and a file name, so it is matched against the
# release format before it is used: a value carrying `/` or `..` would
# otherwise select a path of the caller's choosing.
is_version() {
  printf '%s\n' "$1" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+([-+][0-9A-Za-z.-]+)?$'
}

if [ -n "$version" ]; then
  is_version "$version" || fail "expected a release version such as 1.2.3, not \"$version\""
fi

# A musl system announces itself through its loader, directly or through the
# version banner of its `ldd`; the GNU target is the fallback because glibc has
# no equally stable marker. A glibc binary on a musl system fails to start, and
# the smoke run below is what would otherwise report it.
linux_libc() {
  if command -v ldd > /dev/null 2>&1 && ldd --version 2>&1 | grep -qi musl; then
    printf musl
  elif [ -e /lib/ld-musl-x86_64.so.1 ] || [ -e /lib/ld-musl-aarch64.so.1 ]; then
    printf musl
  else
    printf gnu
  fi
}

case "$(uname -s)" in
  Linux) system="unknown-linux-$(linux_libc)" ;;
  Darwin) system=apple-darwin ;;
  *) fail 'this installer covers Linux and macOS; download the Windows archive from the releases page' ;;
esac
case "$(uname -m)" in
  x86_64 | amd64) architecture=x86_64 ;;
  aarch64 | arm64) architecture=aarch64 ;;
  *) fail "unsupported CPU architecture: $(uname -m)" ;;
esac
target="${architecture}-${system}"

for required_command in curl tar mktemp; do
  command -v "$required_command" > /dev/null 2>&1 || fail "required command not found: $required_command"
done
# macOS ships `shasum`, Linux ships `sha256sum`; the records are identical.
if command -v sha256sum > /dev/null 2>&1; then
  sha256() { sha256sum "$1"; }
elif command -v shasum > /dev/null 2>&1; then
  sha256() { shasum -a 256 "$1"; }
else
  fail 'SHA-256 verification needs sha256sum or shasum'
fi
if [ "$verify" = required ] && ! command -v cosign > /dev/null 2>&1; then
  fail 'INSTALL_VERIFY=required needs cosign on PATH; see https://docs.sigstore.dev/'
fi

fetch() {
  curl --proto '=https' --tlsv1.2 -fsSL \
    --connect-timeout 10 --max-time 300 --retry 2 -o "$2" "$1"
}

# The newest release is resolved through the redirect of the repository's
# `releases/latest` page, which lands on `releases/tag/<tag>` and therefore
# names the tag with its prefix. The REST API answers the same question, but
# unauthenticated calls are rate limited per source address — a shared CI or
# NAT address spends that budget on other callers — and the tag then has to be
# read out of JSON. The asset redirect `releases/latest/download/<asset>` is no
# help either: the asset name contains the version this step is resolving.
latest_tag() {
  curl --proto '=https' --tlsv1.2 -fsSLI --connect-timeout 10 --max-time 60 \
    -o /dev/null -w '%{url_effective}' "${releases}/latest" 2> /dev/null || true
}

if [ -z "$version" ]; then
  resolved="$(latest_tag)"
  case "$resolved" in
    */releases/tag/*) tag="${resolved##*/}" ;;
    *) fail "could not resolve the newest release; pass --version" ;;
  esac
  # `releases/latest` is the newest release of the repository, which in a
  # repository releasing several components can belong to another one. The
  # prefix is what tells them apart, so a tag that is not this tool's asks for
  # an explicit version instead of downloading the wrong product.
  case "$tag" in
    "${tag_prefix}"*) version="${tag#"${tag_prefix}"}" ;;
    *) fail "the newest release is ${tag}, which is not a ${tag_prefix}* release; pass --version" ;;
  esac
  is_version "$version" || fail "the newest release tag ${tag} does not carry a version"
else
  tag="${tag_prefix}${version}"
fi

package="${tool}-${version}-${target}"
archive="${package}.tar.gz"
download="${releases}/download/${tag}"

umask 077
# A private directory created by `mktemp`: a predictable path lets another
# local account plant a symlink that `curl -o` would follow with this user's
# permissions.
work="$(mktemp -d "${TMPDIR:-/tmp}/${tool}-install.XXXXXX")" || fail 'could not create a staging directory'
cleanup() {
  [ -z "$staged" ] || rm -f "$staged"
  rm -rf "$work"
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM

printf 'Installing %s %s for %s\n' "$tool" "$version" "$target"
fetch "${download}/${archive}" "${work}/${archive}" ||
  fail "could not download ${archive} from ${tag}"

# `SHA256SUMS` first, because it is the list the release publishes for every
# archive; the per-asset file is the fallback for a release that attaches only
# the single checksum.
if fetch "${download}/SHA256SUMS" "${work}/sums"; then
  :
elif fetch "${download}/${archive}.sha256" "${work}/sums"; then
  :
else
  fail "${tag} publishes no checksum for ${archive}"
fi

# The record is selected by name rather than passed to `sha256sum -c`, which
# would report every other target's archive as missing. A `*` marks a record
# written in binary mode.
expected="$(awk -v name="$archive" '{ sub(/^[*]/, "", $2) } $2 == name { print $1; exit }' "${work}/sums")"
printf '%s\n' "$expected" | grep -Eq '^[0-9a-fA-F]{64}$' ||
  fail "the published checksums do not name ${archive}"
actual="$(sha256 "${work}/${archive}" | cut -d ' ' -f 1)"
[ "$actual" = "$expected" ] || fail "checksum mismatch for ${archive}"

if command -v cosign > /dev/null 2>&1; then
  if fetch "${download}/${archive}.sigstore.json" "${work}/${archive}.sigstore.json"; then
    cosign verify-blob "${work}/${archive}" \
      --bundle "${work}/${archive}.sigstore.json" \
      --certificate-identity-regexp "$workflow_identity" \
      --certificate-oidc-issuer "$oidc_issuer" ||
      fail "the signature of ${archive} does not verify against the publishing workflow"
  elif [ "$verify" = required ]; then
    fail "${tag} carries no signature for ${archive} and INSTALL_VERIFY=required"
  else
    note "no signature published for ${archive}; the checksum was verified"
  fi
else
  note 'cosign is not installed; the checksum was verified but the signature was not'
  note 'run again with INSTALL_VERIFY=required once cosign is available to require it'
fi

# Every entry belongs under the single top-level directory the packaging action
# creates. That one rule rejects an absolute path, a `..` component, and an
# archive that would scatter files into the working directory.
tar -tzf "${work}/${archive}" > "${work}/entries"
while IFS= read -r entry; do
  case "$entry" in
    "$package" | "$package"/ | "$package"/?*) ;;
    *) fail "unexpected entry in ${archive}: ${entry}" ;;
  esac
done < "${work}/entries"
# `tar -tv` prints the entry type as the first character of the mode, so a link
# is visible before extraction. A symlink in the archive points wherever the
# archive says, and the copy below would follow it.
if tar -tvzf "${work}/${archive}" | grep -q '^[lh]'; then
  fail "${archive} contains a link where only regular files are expected"
fi
tar -xzf "${work}/${archive}" -C "$work"

binary="${work}/${package}/${tool}"
[ -f "$binary" ] && [ ! -L "$binary" ] || fail "${archive} does not contain ${tool}"
chmod 755 "$binary"
# The smoke run is the last check before the replacement and covers the two
# things nothing else can see: a binary that cannot run here at all — the wrong
# libc or CPU behind a correct-looking target — and an archive whose contents
# do not match the version in its name.
reported="$("$binary" --version 2>&1)" ||
  fail "the downloaded binary does not run on this machine; build from source instead"
case "$reported" in
  *"$version"*) ;;
  *) fail "the archive of ${tag} reports \"${reported}\" instead of ${version}" ;;
esac

mkdir -p "$bin_dir" || fail "could not create ${bin_dir}"
[ -w "$bin_dir" ] || fail "${bin_dir} is not writable; pass --bin-dir"
# Staged next to the destination and renamed over it: `mv` within one file
# system is atomic, so a concurrent run of the tool sees either version and
# never a half-written file. A failure before the rename leaves the previous
# installation in place.
staged="$(mktemp "${bin_dir}/.${tool}.XXXXXX")" || fail "could not stage in ${bin_dir}"
cp "$binary" "$staged"
chmod 755 "$staged"
mv -f "$staged" "${bin_dir}/${tool}"
staged=""

printf 'Installed %s to %s/%s\n' "$reported" "$bin_dir" "$tool"
case ":${PATH}:" in
  *":${bin_dir}:"*) ;;
  *) note "${bin_dir} is not on PATH; add it with export PATH=\"${bin_dir}:\$PATH\"" ;;
esac
