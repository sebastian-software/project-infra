#!/usr/bin/env sh
# Offline proof that `install.sh` beside this file installs a release and, more
# importantly, refuses everything it should refuse. `curl`, `cosign`, and
# `uname` are replaced by stubs on a PATH that carries nothing else, so the run
# needs no network, no release, and no platform other than the one it fakes.
#
#   sh test-install.sh
#
# The stubs serve a fixture release built the way `package-binary` and
# `finish-release` publish one, so a change to an asset name shows up here
# before it reaches a user.
set -eu

here="$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)"
installer="${here}/install.sh"
[ -f "$installer" ] || {
  printf 'test-install: %s not found\n' "$installer" >&2
  exit 1
}

root="$(mktemp -d "${TMPDIR:-/tmp}/install-harness.XXXXXX")"
trap 'rm -rf "$root"' EXIT
trap 'exit 1' HUP INT TERM

repository="sebastian-software/example"
release="${root}/release"
fakes="${root}/fakes"
tools="${root}/tools"
home="${root}/home"
stage="${root}/stage"
curl_log="${root}/curl.log"
mkdir -p "$release" "$fakes" "$tools" "$home" "$stage"

# The installer may use only what it declares as a requirement, so PATH holds
# the stubs, these commands, and nothing else. `gzip` is there because GNU
# `tar` runs it as a separate process; `ldd` is deliberately absent, since a
# case adds it to test musl detection.
for name in awk chmod cp cut grep gzip mkdir mktemp mv rm sha256sum shasum tar; do
  found="$(command -v "$name" 2> /dev/null || true)"
  [ -z "$found" ] || ln -s "$found" "${tools}/${name}"
done

stub() {
  cat > "${fakes}/$1"
  chmod 755 "${fakes}/$1"
}

# Serves the fixture directory by asset name, which is the contract under test:
# an installer asking for a name the release does not publish gets the 404 a
# real release would answer with.
stub curl <<'STUB'
#!/bin/sh
set -eu
[ -z "${FAKE_CURL_LOG:-}" ] || printf '%s\n' "$*" >> "$FAKE_CURL_LOG"
url=''
output=''
head=false
while [ "$#" -gt 0 ]; do
  case "$1" in
    -o | --output)
      output="$2"
      shift 2
      ;;
    -w | --write-out)
      head=true
      shift 2
      ;;
    --connect-timeout | --max-time | --retry | --proto)
      shift 2
      ;;
    -*) shift ;;
    *)
      url="$1"
      shift
      ;;
  esac
done
case "$url" in
  https://github.com/*/releases/latest)
    [ "${FAKE_CURL_NO_LATEST:-0}" = 0 ] || exit 22
    [ "$head" = true ] || exit 22
    printf 'https://github.com/%s/releases/tag/%s' "$FAKE_CURL_REPO" "$FAKE_CURL_TAG"
    exit 0
    ;;
  https://github.com/*/releases/download/*) ;;
  *)
    printf 'fake curl: unexpected URL %s\n' "$url" >&2
    exit 6
    ;;
esac
asset="${url##*/}"
for pattern in ${FAKE_CURL_MISSING:-}; do
  case "$asset" in
    $pattern) exit 22 ;;
  esac
done
[ -n "$output" ] || {
  printf 'fake curl: no output file for %s\n' "$url" >&2
  exit 2
}
[ -f "${FAKE_CURL_ASSETS}/${asset}" ] || exit 22
cp "${FAKE_CURL_ASSETS}/${asset}" "$output"
STUB

stub uname <<'STUB'
#!/bin/sh
case "${1:-}" in
  -m) printf '%s\n' "${FAKE_UNAME_M:-x86_64}" ;;
  *) printf '%s\n' "${FAKE_UNAME_S:-Linux}" ;;
esac
STUB

stub cosign <<'STUB'
#!/bin/sh
printf '%s\n' "$*" >> "${FAKE_COSIGN_LOG:-/dev/null}"
exit "${FAKE_COSIGN_STATUS:-0}"
STUB

# One fixture release, named exactly as `package-binary` names its assets and
# checksummed the way `finish-release` assembles `SHA256SUMS`.
publish() {
  publish_version="$1"
  publish_reports="$2"
  publish_package="example-${publish_version}-${3}"
  rm -rf "${root}/build"
  mkdir -p "${root}/build/${publish_package}"
  printf '#!/bin/sh\necho "example %s"\n' "$publish_reports" \
    > "${root}/build/${publish_package}/example"
  chmod 755 "${root}/build/${publish_package}/example"
  tar -C "${root}/build" -czf "${release}/${publish_package}.tar.gz" "$publish_package"
  (
    cd "$release"
    sha256sum "${publish_package}.tar.gz" > "${publish_package}.tar.gz.sha256"
    cat ./*.tar.gz.sha256 > SHA256SUMS
  )
  printf '{}\n' > "${release}/${publish_package}.tar.gz.sigstore.json"
}

publish 1.2.3 1.2.3 x86_64-unknown-linux-gnu

reset() {
  prefix=v
  latest=example-v1.2.3
  missing=''
  no_latest=0
  uname_s=Linux
  uname_m=x86_64
  verify=auto
  cosign_log=/dev/null
  cosign_status=0
  path="${fakes}:${tools}"
  : > "$curl_log"
}

attempt() {
  attempt_bin="$1"
  attempt_out="$2"
  shift 2
  env -i PATH="$path" HOME="$home" TMPDIR="$stage" \
    INSTALL_TOOL=example INSTALL_REPOSITORY="$repository" \
    INSTALL_TAG_PREFIX="$prefix" INSTALL_VERIFY="$verify" \
    FAKE_CURL_ASSETS="$release" FAKE_CURL_LOG="$curl_log" \
    FAKE_CURL_MISSING="$missing" FAKE_CURL_NO_LATEST="$no_latest" \
    FAKE_CURL_REPO="$repository" FAKE_CURL_TAG="$latest" \
    FAKE_UNAME_S="$uname_s" FAKE_UNAME_M="$uname_m" \
    FAKE_COSIGN_LOG="$cosign_log" FAKE_COSIGN_STATUS="$cosign_status" \
    /bin/sh "$installer" --bin-dir "$attempt_bin" "$@" > "$attempt_out" 2>&1
}

fresh_bin() {
  mkdir -p "${root}/bin-$1"
  printf 'previous\n' > "${root}/bin-$1/example"
  chmod 755 "${root}/bin-$1/example"
  printf '%s\n' "${root}/bin-$1"
}

failures=0
passed=0
report=''

# Every check states what would be wrong if it failed, so a failing run reads as
# a list of symptoms rather than of commands.
check() {
  check_description="$1"
  shift
  if "$@"; then
    return 0
  fi
  printf '    %s\n' "$check_description" >&2
  failures=$((failures + 1))
  report=fail
}

# Nothing may survive a run: neither the staging directory the installer
# creates under TMPDIR nor the temporary file it stages in the target directory
# before the rename.
no_leftovers() {
  set -- "${stage}"/example-install.*
  [ ! -e "$1" ]
}

# A failed run leaves the installation that was already there, and leaves no
# half-written replacement beside it.
untouched() {
  [ "$(cat "$1/example")" = previous ] || return 1
  set -- "$1"/.example.*
  [ ! -e "$1" ]
}

case_begin() {
  reset
  report=''
  current="$1"
}

case_end() {
  if [ -z "$report" ]; then
    passed=$((passed + 1))
    printf 'ok %s\n' "$current"
  else
    printf 'not ok %s\n' "$current" >&2
    [ -z "${output:-}" ] || sed -n '1,20p' "$output" >&2
  fi
}

# --- the newest release, resolved through the releases/latest redirect -------
case_begin 'installs the newest release'
prefix=example-v
bin="$(fresh_bin latest)"
output="${root}/out-latest"
check 'the install failed' attempt "$bin" "$output"
check 'the binary was not installed' test -x "${bin}/example"
check 'the installed binary is the fixture' \
  sh -c '[ "$("$1/example")" = "example 1.2.3" ]' sh "$bin"
check 'the redirect of releases/latest was not used' \
  grep -q 'https://github.com/sebastian-software/example/releases/latest' "$curl_log"
check 'the API was called instead of the redirect' \
  sh -c '! grep -q api.github.com "$1"' sh "$curl_log"
check 'the component tag prefix was not applied' \
  grep -q 'releases/download/example-v1.2.3/example-1.2.3-x86_64-unknown-linux-gnu.tar.gz' "$curl_log"
check 'the PATH hint is missing' grep -q 'is not on PATH' "$output"
check 'staging was left behind' no_leftovers
case_end

# --- an explicit version -----------------------------------------------------
case_begin 'installs a requested version'
bin="$(fresh_bin versioned)"
output="${root}/out-versioned"
check 'the install failed' attempt "$bin" "$output" --version 1.2.3
check 'the binary was not installed' test -x "${bin}/example"
check 'the tag was not built from the prefix' \
  grep -q 'releases/download/v1.2.3/' "$curl_log"
check 'the release-wide checksum list was not preferred' \
  grep -q 'releases/download/v1.2.3/SHA256SUMS' "$curl_log"
check 'staging was left behind' no_leftovers
case_end

# --- the per-asset checksum as the fallback ----------------------------------
case_begin 'falls back to the per-asset checksum'
missing=SHA256SUMS
bin="$(fresh_bin fallback)"
output="${root}/out-fallback"
check 'the install failed' attempt "$bin" "$output" --version 1.2.3
check 'the binary was not installed' test -x "${bin}/example"
check 'the per-asset checksum was not fetched' \
  grep -q 'example-1.2.3-x86_64-unknown-linux-gnu.tar.gz.sha256' "$curl_log"
case_end

# --- a corrupted download ----------------------------------------------------
case_begin 'refuses an archive whose checksum does not match'
bin="$(fresh_bin mismatch)"
output="${root}/out-mismatch"
cp "${release}/example-1.2.3-x86_64-unknown-linux-gnu.tar.gz" "${root}/pristine.tar.gz"
printf 'corruption' >> "${release}/example-1.2.3-x86_64-unknown-linux-gnu.tar.gz"
if attempt "$bin" "$output" --version 1.2.3; then
  check 'a corrupted archive was installed' false
fi
check 'the failure does not name the checksum' grep -q 'checksum mismatch' "$output"
check 'the previous installation was replaced' untouched "$bin"
check 'staging was left behind' no_leftovers
cp "${root}/pristine.tar.gz" "${release}/example-1.2.3-x86_64-unknown-linux-gnu.tar.gz"
case_end

# --- a release without a checksum for this archive ---------------------------
case_begin 'refuses an archive the release does not checksum'
missing='SHA256SUMS *.sha256'
bin="$(fresh_bin nosum)"
output="${root}/out-nosum"
if attempt "$bin" "$output" --version 1.2.3; then
  check 'an unchecksummed archive was installed' false
fi
check 'the failure does not name the missing checksum' grep -q 'no checksum' "$output"
check 'the previous installation was replaced' untouched "$bin"
case_end

# --- a checksum list that names other archives only --------------------------
case_begin 'refuses a checksum list without this archive'
missing='*.sha256'
bin="$(fresh_bin othersum)"
output="${root}/out-othersum"
printf '%064d  example-9.9.9-aarch64-apple-darwin.tar.gz\n' 0 > "${release}/SHA256SUMS"
if attempt "$bin" "$output" --version 1.2.3; then
  check 'an unchecksummed archive was installed' false
fi
check 'the failure does not name the archive' grep -q 'do not name' "$output"
check 'the previous installation was replaced' untouched "$bin"
(cd "$release" && cat ./*.tar.gz.sha256 > SHA256SUMS)
case_end

# --- a download that fails ---------------------------------------------------
case_begin 'refuses when the archive cannot be downloaded'
missing='*.tar.gz'
bin="$(fresh_bin download)"
output="${root}/out-download"
if attempt "$bin" "$output" --version 1.2.3; then
  check 'a missing archive was installed' false
fi
check 'the failure does not name the download' grep -q 'could not download' "$output"
check 'the previous installation was replaced' untouched "$bin"
check 'staging was left behind' no_leftovers
case_end

# --- an archive that carries another version ---------------------------------
case_begin 'refuses an archive that reports another version'
bin="$(fresh_bin wrongversion)"
output="${root}/out-wrongversion"
publish 1.2.3 9.9.9 x86_64-unknown-linux-gnu
if attempt "$bin" "$output" --version 1.2.3; then
  check 'an archive of another version was installed' false
fi
check 'the failure does not name the reported version' grep -q '9.9.9' "$output"
check 'the previous installation was replaced' untouched "$bin"
publish 1.2.3 1.2.3 x86_64-unknown-linux-gnu
case_end

# --- a version that is a path ------------------------------------------------
case_begin 'refuses a version that is a path'
bin="$(fresh_bin traversal)"
output="${root}/out-traversal"
if attempt "$bin" "$output" --version ../../../etc/passwd; then
  check 'a path was accepted as a version' false
fi
check 'the failure does not name the version format' grep -q 'release version' "$output"
check 'a download was attempted' sh -c '[ ! -s "$1" ]' sh "$curl_log"
check 'the previous installation was replaced' untouched "$bin"
case_end

# --- a platform without a release --------------------------------------------
case_begin 'refuses an unsupported platform'
uname_s=FreeBSD
bin="$(fresh_bin platform)"
output="${root}/out-platform"
if attempt "$bin" "$output" --version 1.2.3; then
  check 'an unsupported platform was accepted' false
fi
check 'the failure does not name the supported systems' grep -q 'Linux and macOS' "$output"
check 'a download was attempted' sh -c '[ ! -s "$1" ]' sh "$curl_log"
check 'the previous installation was replaced' untouched "$bin"
case_end

# --- the target the platform resolves to -------------------------------------
case_begin 'names the target the platform resolves to'
printf '#!/bin/sh\necho "musl libc (x86_64)"\n' > "${tools}/ldd"
chmod 755 "${tools}/ldd"
bin="$(fresh_bin target)"
output="${root}/out-target"
if attempt "$bin" "$output" --version 1.2.3; then
  check 'a musl target resolved to a published archive' false
fi
check 'musl was not detected' grep -q 'example-1.2.3-x86_64-unknown-linux-musl.tar.gz' "$curl_log"
rm -f "${tools}/ldd"
: > "$curl_log"
uname_s=Darwin
uname_m=arm64
if attempt "$bin" "$output" --version 1.2.3; then
  check 'a darwin target resolved to a published archive' false
fi
check 'the darwin target is wrong' grep -q 'example-1.2.3-aarch64-apple-darwin.tar.gz' "$curl_log"
check 'the previous installation was replaced' untouched "$bin"
case_end

# --- a release of another component ------------------------------------------
case_begin 'refuses the newest release of another component'
prefix=example-v
latest=other-v2.0.0
bin="$(fresh_bin component)"
output="${root}/out-component"
if attempt "$bin" "$output"; then
  check "another component's release was installed" false
fi
check 'the failure does not name the foreign tag' grep -q 'other-v2.0.0' "$output"
check 'an archive was downloaded' sh -c '! grep -q releases/download "$1"' sh "$curl_log"
case_end

# --- a release page that does not answer -------------------------------------
case_begin 'refuses when the newest release cannot be resolved'
no_latest=1
bin="$(fresh_bin unresolved)"
output="${root}/out-unresolved"
if attempt "$bin" "$output"; then
  check 'an unresolved release was installed' false
fi
check 'the failure does not ask for a version' grep -q 'pass --version' "$output"
check 'the previous installation was replaced' untouched "$bin"
case_end

# --- the signature -----------------------------------------------------------
case_begin 'verifies the signature when cosign is installed'
cosign_log="${root}/cosign.log"
: > "$cosign_log"
bin="$(fresh_bin signed)"
output="${root}/out-signed"
check 'the install failed' attempt "$bin" "$output" --version 1.2.3
check 'cosign was not called' grep -q 'verify-blob' "$cosign_log"
check 'the workflow identity was not pinned' \
  grep -qF -- 'workflows/publish\.yml@refs/heads/main$' "$cosign_log"
check 'the issuer was not pinned' \
  grep -q 'token.actions.githubusercontent.com' "$cosign_log"
case_end

case_begin 'refuses a signature that does not verify'
cosign_log="${root}/cosign.log"
bin="$(fresh_bin badsig)"
output="${root}/out-badsig"
cosign_status=1
if attempt "$bin" "$output" --version 1.2.3; then
  check 'an unverified archive was installed' false
fi
check 'the failure does not name the signature' grep -q 'signature' "$output"
check 'the previous installation was replaced' untouched "$bin"
case_end

case_begin 'requires cosign when INSTALL_VERIFY=required'
verify=required
path="${tools}:${fakes}"
rm -f "${tools}/cosign"
bin="$(fresh_bin required)"
output="${root}/out-required"
mv "${fakes}/cosign" "${root}/cosign-stub"
if attempt "$bin" "$output" --version 1.2.3; then
  check 'a required verification ran without cosign' false
fi
mv "${root}/cosign-stub" "${fakes}/cosign"
check 'the failure does not name cosign' grep -q 'cosign' "$output"
check 'a download was attempted' sh -c '[ ! -s "$1" ]' sh "$curl_log"
check 'the previous installation was replaced' untouched "$bin"
case_end

# --- an archive that would write outside its own directory -------------------
case_begin 'refuses an archive containing a link'
bin="$(fresh_bin link)"
output="${root}/out-link"
package=example-1.2.3-x86_64-unknown-linux-gnu
rm -rf "${root}/evil"
mkdir -p "${root}/evil/${package}"
ln -s /etc/passwd "${root}/evil/${package}/example"
tar -C "${root}/evil" -czf "${release}/${package}.tar.gz" "$package"
(cd "$release" && sha256sum "${package}.tar.gz" > "${package}.tar.gz.sha256" && cat ./*.tar.gz.sha256 > SHA256SUMS)
if attempt "$bin" "$output" --version 1.2.3; then
  check 'an archive of links was installed' false
fi
check 'the failure does not name the link' grep -q 'link' "$output"
check 'the previous installation was replaced' untouched "$bin"
publish 1.2.3 1.2.3 x86_64-unknown-linux-gnu
case_end

# --- the rename that fails ---------------------------------------------------
case_begin 'leaves nothing behind when the replacement fails'
mkdir -p "${root}/nomv"
printf '#!/bin/sh\nexit 1\n' > "${root}/nomv/mv"
chmod 755 "${root}/nomv/mv"
path="${root}/nomv:${fakes}:${tools}"
bin="$(fresh_bin rename)"
output="${root}/out-rename"
if attempt "$bin" "$output" --version 1.2.3; then
  check 'a failed rename reported success' false
fi
check 'the previous installation was replaced' untouched "$bin"
check 'staging was left behind' no_leftovers
case_end

if [ "$failures" -gt 0 ]; then
  printf '\n%s checks failed\n' "$failures" >&2
  exit 1
fi
printf '\n%s cases passed\n' "$passed"
