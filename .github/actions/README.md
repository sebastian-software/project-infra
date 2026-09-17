# Shared composite actions

Six composite actions that the organization's release and check workflows would
otherwise reimplement: crates.io retry loops, napi platform matrices, the
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

| Input               | Default  | Meaning                                                       |
| ------------------- | -------- | ------------------------------------------------------------- |
| `packages`          | `.`      | Ordered package directories, sidecars before the main package |
| `dist-tag`          | `""`     | Empty derives it from the version                             |
| `access`            | `public` | npm access level for a first publish                          |
| `provenance`        | `true`   | Attach a provenance attestation                               |
| `token`             | `""`     | Fallback npm token; empty means Trusted Publishing            |
| `working-directory` | `.`      | Where the npm commands run                                    |

Output `dist-tag` carries what was used.

The dist-tag is derived from the version of the **last** package in the list —
the main package: `1.2.3` publishes to `latest`, `1.2.3-rc.1` to `rc`,
`1.2.3-next.4` to `next`, and a numeric prerelease (`1.2.3-1`) to `next`. A
release candidate therefore never lands on `latest` by omission.

The job needs `permissions: id-token: write` for provenance and for Trusted
Publishing, and npm 11.5.1 or newer — `npm install --global npm@latest` after
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
