# Shared composite actions

Eight composite actions that the organization's release and check workflows
would otherwise reimplement: crates.io retry loops, napi platform matrices,
release-asset packaging and the gate that publishes a draft release, the
lifecycle of a tracking issue, an action-pin checker, and a workflow-hygiene
checker. They are ordinary actions in this repository, so consumers reference
them by path and commit SHA:

```yaml
- uses: sebastian-software/project-infra/.github/actions/publish-crates@<sha> # v0.0.0
```

Resolve the SHA from a release tag, so the pin names a reviewed state and not
whatever `main` is today:

```sh
git ls-remote https://github.com/sebastian-software/project-infra 'refs/tags/<tag>^{}'
```

Renovate moves the pin like any other action pin. A tag is not a pin, and
`@main` is not a pin either.

These actions arrived from `sebastian-software/standards`, whose successor this
repository is. Until the first release tag exists here, a consumer resolves the
SHA from `main` and replaces it with a tag's SHA afterwards. The older
references in that repository keep working until it is retired, so a consumer
moves its pins once rather than twice.

## `publish-crates`

Publishes a workspace's crates to crates.io in dependency order.

| Input               | Default | Meaning                                                               |
| ------------------- | ------- | --------------------------------------------------------------------- |
| `crates`            | —       | Ordered crate list, leaves first. Newline- or space-separated         |
| `token`             | `""`    | Fallback crates.io token; empty means Trusted Publishing              |
| `retry-delay`       | `30`    | Seconds before the single retry of a failed publish                   |
| `index-timeout`     | `300`   | Seconds to wait for a published version to appear in the sparse index |
| `working-directory` | `.`     | Where the cargo commands run                                          |

The job needs `permissions: id-token: write` for the OIDC exchange
(`rust-lang/crates-io-auth-action`). Trusted Publishing has to be enabled **per
crate** on crates.io and cannot cover a first-ever publish, because the crate
does not exist yet; pass `token: ${{ secrets.CARGO_REGISTRY_TOKEN }}` until it
is enabled, then delete the input. The choice is explicit rather than a
`continue-on-error` fallback, so a run cannot silently fall back to a
long-lived secret that was supposed to be gone.

Four properties make a re-run safe:

- A crate whose version is already in the sparse index is skipped, so a partial
  publish can be re-run without `crate already exists` errors. The index path is
  the lowercased crate name, which is the only path crates.io serves.
- An index lookup that fails — a transport error or anything but 200 and 404 —
  fails the job instead of being read as "not published yet". Guessing there is
  what turns a re-run into a publish attempt for a version that already exists.
- A failed `cargo publish` is retried once after `retry-delay`, which is what
  index propagation of the previous crate needs.
- After each publish the action waits for the version to appear in the index
  before starting the next crate, so the dependent crate resolves.

Run the [package verification script](../../skills/project-infra/assets/rust/scripts/verify-packages.sh)
in the check workflow before a release reaches this action. It tests and
installs the packaged archives, so a file missing from `include` fails a pull
request instead of a version that is already on crates.io and can only be
yanked.

## `publish-npm`

Publishes one or more packages with provenance, in the given order.

| Input                     | Default  | Meaning                                                               |
| ------------------------- | -------- | --------------------------------------------------------------------- |
| `packages`                | `.`      | Ordered package directories or packed tarballs, sidecars first        |
| `dist-tag`                | `""`     | Empty derives it from the version                                     |
| `access`                  | `public` | npm access level for a first publish                                  |
| `provenance`              | `true`   | Attach a provenance attestation                                       |
| `token`                   | `""`     | Fallback npm token; empty means Trusted Publishing                    |
| `preflight-first-publish` | `true`   | Fail before the loop on a package name that was never published       |
| `verify`                  | `true`   | Poll the registry after the loop until every version resolves         |
| `verify-timeout`          | `120`    | Seconds to keep polling for a version, up to 1800                     |
| `dry-run`                 | `false`  | Rehearse the release with `npm publish --dry-run` and publish nothing |
| `working-directory`       | `.`      | Where the npm commands run                                            |

Output `dist-tag` carries what was used.

The dist-tag is derived from the version of the **last** package in the list —
the main package: `1.2.3` publishes to `latest`, `1.2.3-rc.1` to `rc`,
`1.2.3-next.4` to `next`, and a numeric prerelease (`1.2.3-1`) to `next`. A
release candidate therefore never lands on `latest` by omission, and an explicit
`dist-tag: latest` for a prerelease version is refused, because that tag is what
an installer takes by default.

Four properties keep a release from arriving in part, and make the re-run after
one safe:

- Every package name is looked up before anything is published, and a name with
  no published version fails the job. Trusted Publishing mints a token only for
  a package that already exists, so a newly added sidecar would otherwise fail
  on its own upload, after its siblings are on the registry. Publish such a
  package once with a token, register its trusted publisher, and the preflight
  passes from then on. It is skipped when `token` is set, because a token can
  create a package name, and a dry run reports it as a warning instead of a
  failure, so a new package can still be rehearsed.
- A package whose exact version the registry already serves is skipped, so the
  re-run after a partial release publishes what is missing instead of failing on
  a version that can only be deprecated, never replaced.
- A registry read that is neither 200 nor 404 — another status, or a transport
  failure that outlives three attempts — fails the job instead of counting as
  "not published yet". That is the rule `publish-crates` follows for the sparse
  index, and guessing there is what turns a re-run into an attempt to overwrite
  an existing version.
- `verify` then polls every listed package until the registry serves it, 15
  seconds apart and for at most `verify-timeout` seconds. npm acknowledges a
  publish before every read replica carries it, and without this a release that
  arrived in part leaves a green job behind. The failure names the missing
  versions and publishes nothing further: what did go out stays, and the re-run
  skips it.

npm resolves a publish argument as a registry spec before it considers a path:
`tool` names the package `tool` on the registry, and `npm/darwin-arm64` is the
GitHub shorthand `owner/repo`. Every entry that is not already `.`, `./…`, `../…`
or absolute is therefore prefixed with `./`, which is the one shape that names
the checkout. A `.tgz` entry publishes a packed archive — what a pnpm workspace
releases, because packing resolves a `workspace:*` sidecar reference to a
version — and its name and version are read out of the archive, so the dist-tag,
the skip and the verification cover a packed release too.

`dry-run: true` rehearses the whole path: `npm publish --dry-run` per package,
the preflight in warning mode, and no verification, since nothing was published.
A `workflow_dispatch` whose `dry-run` input defaults to `true` is a release
rehearsal that cannot publish by accident.

The registry reads go to `https://registry.npmjs.org`, or to
`npm_config_registry` when the job sets it. The job needs
`permissions: id-token: write` for provenance and for Trusted Publishing, and
npm 11.5.1 or newer — `npm install --global npm@latest` after
`actions/setup-node`. Publishing runs through `npm publish` even in pnpm
repositories, because pnpm does not implement npm's Trusted Publishing exchange.

## `napi-matrix`

Emits the org-wide `@napi-rs/cli` 3 platform list as a job matrix, so a
repository declares its platforms in one place instead of in a workflow, a
build script and eight sidecar manifests.

| Input       | Default | Meaning                                   |
| ----------- | ------- | ----------------------------------------- |
| `package`   | —       | The main npm package name, scope included |
| `platforms` | `""`    | Platform ids to include; empty means all  |
| `exclude`   | `""`    | Platform ids to drop                      |

Outputs: `matrix` (JSON with an `include` array, for
`strategy: matrix: ${{ fromJSON(...) }}`), `platform-ids` (space-separated, for
shell loops) and `sidecars` (JSON array of sidecar package names).

| Platform id        | Rust target                  | Runner             | os     | cpu   | libc  |
| ------------------ | ---------------------------- | ------------------ | ------ | ----- | ----- |
| `linux-x64-gnu`    | `x86_64-unknown-linux-gnu`   | `ubuntu-latest`    | linux  | x64   | glibc |
| `linux-arm64-gnu`  | `aarch64-unknown-linux-gnu`  | `ubuntu-24.04-arm` | linux  | arm64 | glibc |
| `linux-x64-musl`   | `x86_64-unknown-linux-musl`  | `ubuntu-latest`    | linux  | x64   | musl  |
| `linux-arm64-musl` | `aarch64-unknown-linux-musl` | `ubuntu-latest`    | linux  | arm64 | musl  |
| `darwin-arm64`     | `aarch64-apple-darwin`       | `macos-latest`     | darwin | arm64 | —     |
| `darwin-x64`       | `x86_64-apple-darwin`        | `macos-15-intel`   | darwin | x64   | —     |
| `win32-x64-msvc`   | `x86_64-pc-windows-msvc`     | `windows-latest`   | win32  | x64   | —     |
| `win32-arm64-msvc` | `aarch64-pc-windows-msvc`    | `windows-11-arm`   | win32  | arm64 | —     |

The two musl entries carry `native: false`: their runner is not a musl host, so
the job installs the musl toolchain and cross-compiles. Everything else builds
natively on the listed runner.

Naming is derived, never written down twice (decision D7 of the family audit):

- sidecar package — `<package>-<id>`, which keeps a scoped package's sidecars
  in its own scope (`@acme/tool` → `@acme/tool-darwin-arm64`);
- addon file — `<binary>.<id>.node`, the `@napi-rs/cli` default, where
  `<binary>` is the package name without its scope;
- CI artifact — `native-<id>`.

## `open-or-refresh-issue`

Keeps one open issue per tracked condition: opens it on the first failing run,
refreshes it in place on every later one, and closes it with a comment once the
condition clears. A scheduled workflow has no pull request to report on, so
without this its failures exist only in the run list.

| Input           | Default               | Meaning                                                        |
| --------------- | --------------------- | -------------------------------------------------------------- |
| `title`         | —                     | Issue title, written on every create and refresh               |
| `label`         | —                     | Label that scopes the search and is applied on create          |
| `body-file`     | `""`                  | Report that becomes the body; this is the open-or-refresh mode |
| `close-comment` | `""`                  | Comment to close every match with; this is the other mode      |
| `marker`        | `""`                  | Identifier written into an HTML comment at the top of the body |
| `token`         | `${{ github.token }}` | Token the GitHub CLI authenticates with                        |

Outputs: `issue-url` (empty when nothing matched) and `action`, one of
`created`, `refreshed`, `closed`, and `none`.

```yaml
- uses: sebastian-software/project-infra/.github/actions/open-or-refresh-issue@<sha> # v0.0.0
  with:
    title: "chore(deps): dependency audit findings"
    label: dependencies
    marker: dependency-audit
    body-file: issue-body.md
```

The job needs `permissions: issues: write`. Give it to the reporting job alone,
not to the job that ran the failing work. Exactly one of `body-file` and
`close-comment` is given; passing both or neither fails the step rather than
guessing which was meant.

Which issue counts as the same one is the whole point:

- the search is `gh issue list --state open --label <label>`, so an unrelated
  issue that happens to share the title is never touched. The label has to
  exist in the repository already — `gh` fails instead of creating it;
- without `marker`, a match is an exact title, and a reworded title therefore
  opens a second issue and abandons the first;
- with `marker`, a match is the comment `<!-- <marker> -->` that the action
  writes at the top of the body, and the title is rewritten on the issue it
  finds. That is what makes the title safe to change. A marker containing `<`,
  `>`, `--`, or a newline is rejected, because it would end the comment and put
  the identifier in view;
- when several match, the lowest issue number wins, so a duplicate opened by
  two runs at once cannot make the next refresh hop between issues. A
  `close-comment` retires every match, not only that one.

The body reaches `gh` on standard input, so a report as long as an audit log
cannot hit the command-line length limit. The repository comes from
`github.repository` rather than from a git remote, so the reporting job needs
no checkout.

## `check-action-pins`

Fails when a `uses:` names anything but a full 40-character commit SHA with the
version in a trailing comment.

| Input   | Default             | Meaning                                                   |
| ------- | ------------------- | --------------------------------------------------------- |
| `paths` | `.github/workflows` | Files and directories to scan; directories recursively    |
| `allow` | `""`                | Newline-separated `uses` values that are exempt, verbatim |

```yaml
- uses: sebastian-software/project-infra/.github/actions/check-action-pins@<sha> # v0.0.0
  with:
    paths: |
      .github/workflows
      .github/actions
```

A moved tag changes what CI executes with the job's token, which is why the
rule is a SHA and not a tag. Two consequences the generalized version keeps:

- a `docker://` reference must name an immutable `@sha256:` digest — an image
  tag moves exactly like a git tag, so exempting it is a hole;
- the version comment is required, because a bare SHA is unreviewable.

Local `./…` references are exempt: they are part of the checkout. The scan is
line-based, so it needs no dependency install in the job, and it recognizes the
block (`- uses: x`), flow (`- { uses: x }`) and quoted (`"uses": x`) forms; a
`uses` key in a shape it cannot classify is reported rather than skipped.

A key counts only where YAML can have one — at the start of a line, or after a
`{` or `,` inside a flow mapping — so `run: grep 'uses:' ci.yml` and a comment
mentioning the word are not steps. The one shape the line-based scan cannot
tell apart is a `run:` block that writes YAML containing a `uses` key at the
start of its own line. Use `allow` for that, and for a reference that genuinely
cannot be a SHA; every entry belongs in a review.

## `check-workflow-hygiene`

Fails when a job can run unbounded, a workflow leaves its token scope implicit,
a pull-request workflow keeps superseded runs going, or the aggregate gate job
branch protection requires is missing or ineffective.

| Input           | Default                            | Meaning                                                     |
| --------------- | ---------------------------------- | ----------------------------------------------------------- |
| `paths`         | `.github/workflows`                | Files and directories to scan; directories recursively      |
| `rules`         | `timeouts,permissions,concurrency` | Comma-separated subset of the three workflow rules to apply |
| `gate-job`      | `""`                               | Name of the aggregate job; empty leaves the gate rule off   |
| `gate-workflow` | `check.yml`                        | File name of the workflow that holds the gate job           |

```yaml
- uses: sebastian-software/project-infra/.github/actions/check-workflow-hygiene@<sha> # v0.0.0
  with:
    gate-job: gate
```

The four rules:

- `timeouts` — every job carries `timeout-minutes:`, so a hung job stops
  instead of holding a runner until GitHub's six-hour default expires;
- `permissions` — the workflow has a top-level `permissions:` block, so the
  token scope it grants is a decision in the file rather than whatever the
  repository default happens to be;
- `concurrency` — a workflow triggered by `pull_request`, in either the block
  or the flow form of `on:`, has a top-level `concurrency:` block, so a new
  push cancels the run it supersedes;
- `gate` — off until `gate-job` names a job. The workflow named by
  `gate-workflow` then has to contain that job with a `needs:` list and
  `if: always()`: without the condition a failed job leaves the gate skipped,
  and branch protection reads a skipped required check as satisfied.

A job that calls a reusable workflow (`uses:` at job level) is exempt from the
`timeouts` rule, because GitHub rejects `timeout-minutes` there; the called
workflow carries its own timeouts. A repository that runs its checks in one job
leaves `gate-job` empty: that job is already the stable required name.

The scan is line-based, so it needs no dependency install in the job, and it
reads the two-space indentation the organization's formatter produces. The
indentation is part of the rule: a job is a key at exactly two spaces under
`jobs:`, and a job's own settings sit at exactly four, so a step-level
`timeout-minutes:` is not mistaken for one that bounds the job.

What the scan cannot see: a property inherited through a reusable workflow or a
YAML anchor, a trigger list spread across several lines, and whether a timeout
is long enough or a permission set minimal. Those stay review questions.

## `package-binary`

Packages one matrix job's binary into `<name>-<version>-<target>.tar.gz` and
attaches it, its checksum, and its signature to the GitHub release of a tag.
The consumer owns the matrix and the build; this action owns everything between
the built file and the release.

| Input          | Default               | Meaning                                                          |
| -------------- | --------------------- | ---------------------------------------------------------------- |
| `tag`          | —                     | Release tag this build belongs to                                |
| `binary`       | —                     | Path to the built executable, with or without `.exe`             |
| `target`       | —                     | Rust target triple, used in the archive name                     |
| `name`         | `""`                  | Archive base name; empty derives `<binary>-<version>-<target>`   |
| `version-file` | `Cargo.toml`          | File the version is read from                                    |
| `extra`        | `""`                  | Newline-separated files and directories to include               |
| `checksum`     | `per-asset`           | `per-asset` writes `<archive>.sha256`; `none` writes no checksum |
| `sign`         | `false`               | `true` writes `<archive>.sigstore.json`                          |
| `release`      | `true`                | Upload the assets to the release of `tag`                        |
| `directory`    | `dist`                | Where the staged tree and the archive are written                |
| `token`        | `${{ github.token }}` | Token for the `gh release upload` call                           |

Outputs: `archive`, `checksum` (empty when `checksum` is `none`), `bundle`
(empty unless `sign`), `name`, and `version`.

```yaml
- uses: sebastian-software/project-infra/.github/actions/package-binary@<sha> # v0.0.0
  with:
    tag: ${{ inputs.tag || needs.release-please.outputs.tag_name }}
    target: ${{ matrix.target }}
    binary: target/${{ matrix.target }}/release/tool
    sign: true
```

The job needs `contents: write` to upload and `id-token: write` when it signs.
The [publish-binaries excerpt](../../skills/project-infra/assets/ci/publish-binaries.yml)
wires it into a matrix with the gate below.

Three properties make the archive match what the release claims:

- The version is read from the manifest in the checkout, not from the tag, and
  the tag has to end with it at a separator — `tool-v1.2.3`, `v1.2.3`, and
  `1.2.3` name version 1.2.3 while `v1.12.3` does not name 12.3. A workspace
  member inheriting `version.workspace = true` resolves to the workspace's
  version, and `version-file` also reads a `package.json` or a plain version
  file.
- `HEAD` has to be the commit the tag names, which fails a job that checked out
  a branch instead of the tag and would otherwise attach newer sources to an
  existing version.
- An `extra` entry that does not exist fails the job. A missing completion file
  or license is otherwise a short archive that nothing downstream reports.

`checksum: per-asset` writes `<archive>.sha256` beside the archive, which is
what one download needs to verify itself. There is no combined mode here: the
release-wide `SHA256SUMS` is assembled once by `finish-release` from those
files, so the release's checksum layout is decided in one place instead of in
every matrix job.

The archive holds one top-level directory named like the archive itself, so an
extraction never scatters files and `bin-dir` stays derivable for
`cargo binstall`. Every platform gets `.tar.gz`, Windows included: the runner
images carry `tar`, and one format keeps the download name single-valued for an
installer script and for `[package.metadata.binstall]`. Each entry of `extra`
keeps its own name inside the archive, so a directory such as `completions`
arrives as a directory.

A re-run is safe in both directions: the staged tree is removed before it is
rebuilt, so a reused workspace cannot leak a previous attempt into the archive,
and the upload uses `--clobber`, so a leg that failed after a partial upload
replaces its own assets instead of stopping on them.

`sign: true` installs cosign and runs `cosign sign-blob --yes --bundle`, which
writes a Sigstore bundle carrying the signature, the short-lived certificate,
and the transparency-log entry. The certificate's identity is the workflow that
built the archive, so a consumer verifies provenance with one more download and
no API call:

```sh
cosign verify-blob --bundle tool-1.2.3-<target>.tar.gz.sigstore.json \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp '^https://github\.com/<owner>/<repo>/\.github/workflows/' \
  tool-1.2.3-<target>.tar.gz
```

That is the reason for a bundle rather than `actions/attest-build-provenance`:
an attestation lives with the repository and is verified through
`gh attestation verify`, which needs the `gh` CLI and an authenticated API call,
while an installer script already fetching the archive can fetch one more file.
A repository that wants both can add the attestation action beside this one.

## `finish-release`

The gate between a draft release and a public one: it asserts that the release
carries the assets the matrix was supposed to upload, assembles one
`SHA256SUMS`, and undrafts. Run it once, after the matrix.

| Input      | Default               | Meaning                                                 |
| ---------- | --------------------- | ------------------------------------------------------- |
| `tag`      | —                     | Release tag to check and publish                        |
| `expected` | —                     | Asset names, one per line, or a single integer count    |
| `sums`     | `false`               | Assemble and upload `SHA256SUMS`                        |
| `undraft`  | `true`                | Run `gh release edit --draft=false` after the assertion |
| `token`    | `${{ github.token }}` | Token for the `gh release` calls                        |

Output `assets` carries the JSON list of asset names found on the release.

```yaml
- uses: sebastian-software/project-infra/.github/actions/finish-release@<sha> # v0.0.0
  with:
    tag: ${{ inputs.tag || needs.release-please.outputs.tag_name }}
    sums: true
    expected: |
      tool-1.2.3-x86_64-unknown-linux-gnu.tar.gz
      tool-1.2.3-x86_64-unknown-linux-gnu.tar.gz.sha256
```

The job needs `contents: write`. A matrix reports success per leg, which says
that each job ran — not that each asset arrived: an upload can fail after the
build, a leg can be skipped by a condition, and a re-run can produce an asset
under a name nothing else reads. What a user downloads is the release, so the
release's own asset list is what gets asserted, and a missing asset fails the
job while the release stays a draft.

The name form is the strict one: it also catches a target that uploaded under
the wrong name, which an integer count cannot see. The count is a minimum, and
extra assets are never a problem — a release can also carry an installer
script, a generated formula, or the `SHA256SUMS` of a previous run. A line
starting with `#` is a comment, so a list of a dozen names stays grouped by
target. `SHA256SUMS` itself does not belong in the list; this action uploads it
after the check.

The order is the point. `sums: true` downloads every `*.sha256` asset and
assembles them into one `SHA256SUMS` in the format `sha256sum -c` reads, sorted
by file name, after the completeness check, so the combined list never
describes a partial release and cannot disagree with the per-asset files it was
built from. A checksum whose record names a different file than its own asset
fails the job rather than shipping a line that verifies nothing. Undrafting is
last: registry publishing jobs take `needs:` on this job, so no immutable
registry version exists for a release the repository could not finish.

Re-running is the recovery path. `gh release edit --draft=false` on a release
that is already public succeeds, and `SHA256SUMS` is uploaded with `--clobber`,
so a dispatch that resumes a failed publish by tag takes the same path as the
first run.
