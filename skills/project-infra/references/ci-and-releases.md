# CI, releases, and dependency updates

Release conventions apply to artifacts the project versions and distributes.

## Keep CI reproducible and bounded

Share check implementations with the local gate, and pin the CLI tools a job
installs in `mise.toml` so the workflow and that gate resolve the same versions.
Pin external GitHub Actions to full commit SHAs with readable version comments,
set job timeouts, and grant read access by default. Give publishing jobs the
write permissions their operations need. These choices make dependency changes
reviewable and keep failed or stalled jobs from consuming unbounded time.

Resolve a pinned SHA from the release tag rather than from a branch, so the pin
names a reviewed state:

```sh
git ls-remote https://github.com/<owner>/<repo> 'refs/tags/<tag>^{}'
```

Cancel superseded pull-request runs. Serialize publication when concurrent runs
could race, and let an active release finish. Use platform matrices for the
platforms the product supports. The shared `check-workflow-hygiene` action
verifies the job timeouts, the explicit permission block, and that
cancellation, so an omission fails the workflow's own run.

A gate that measures a number reports it before enforcing it. A coverage job
writes the measured percentage and the floor to the run summary and uploads its
report as an artifact, and fails on the floor only afterwards, because the run
that failed is the one whose numbers someone has to act on; a gate that exits
first leaves that run with a red mark and nothing to read. Keep the floor in a
committed file the gate reads, so raising it is a reviewed diff and every
restatement stays
[derived from that one source](common.md#test-what-two-places-must-agree-on).
The repository's own CI enforces it: an external coverage service adds an
account, a token, and a second home for the number without ever failing a run,
so it is not part of the gate. The
[coverage script](../assets/rust/scripts/coverage.sh) and the `coverage` job in
the [workflow excerpt](../assets/ci/check.yml) carry that order.

## Use the organization's shared actions

Nine composite actions carry publishing, platform, release-asset, reporting,
and workflow-checking behavior that repositories would otherwise reimplement.
Reference them by path and commit SHA; do not copy them into a repository.

| Action                   | Use it for                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `publish-crates`         | Publishing a workspace's crates in dependency order, with an already-published check and index-propagation waits that make a re-run safe                                              |
| `publish-npm`            | Publishing packages in order with provenance, deriving the dist-tag from the version so a candidate never lands on `latest`                                                           |
| `napi-matrix`            | The organization's napi platform list and the derived sidecar, artifact, and binary names                                                                                             |
| `verify-musl-native`     | Building one musl platform package in an Alpine container and loading its addon in an Alpine Node runtime, on a runner whose architecture matches the target                          |
| `package-binary`         | Staging a built binary into `<name>-<version>-<target>.tar.gz` with its checksum and optional Sigstore bundle, after checking that tag, manifest version, and HEAD agree              |
| `finish-release`         | Asserting that a draft release carries every expected asset, assembling `SHA256SUMS`, and publishing it, so an incomplete release stays a draft                                       |
| `open-or-refresh-issue`  | Reporting a run that has no pull request into one tracking issue: opened once, refreshed in place afterwards, and closed with a comment once the condition clears                     |
| `check-action-pins`      | Failing a workflow whose `uses:` entries are not full commit SHAs                                                                                                                     |
| `check-workflow-hygiene` | Failing a workflow whose jobs carry no timeout, whose token scope stays implicit, that leaves superseded pull-request runs going, or whose aggregate gate job is missing or skippable |

They live in
[sebastian-software/project-infra](https://github.com/sebastian-software/project-infra/tree/main/.github/actions),
whose README documents each input:

```yaml
- uses: sebastian-software/project-infra/.github/actions/publish-crates@<sha> # v0.0.0
```

A repository still pinned to `sebastian-software/standards` keeps working until
that repository is retired. Move such a pin when the project has other reasons
to change its workflow, not on its own.

Both publish actions authenticate through Trusted Publishing and need
`permissions: id-token: write`. A first-ever publish cannot use it, because the
package does not exist yet; pass a token input until it is enabled, then remove
it. Prefer improving a shared action over adding a repository-local copy.

Preserve the required check names configured in branch protection. When splitting
checks into jobs, provide a stable aggregate that runs after failures and
examines each required result. Handle skipped jobs explicitly so omitted work
cannot accidentally produce a passing gate.

The [workflow excerpt](../assets/ci/check.yml) shows pinned actions, read-only
permissions, cancellation of superseded runs, both workflow checkers in one job,
and such an aggregate gate.

## Share dependency policy

Extend `github>sebastian-software/renovate-config` and leave everything that
holds in more than one repository to that preset: update timing and the
release-age cooldown, the commit type that lets a dependency update reach a
release, grouping for components that have to move together, automerge policy,
the digest pinning that [reproducible CI](#keep-ci-reproducible-and-bounded)
requires, lockfile maintenance, the default range strategy, and a custom manager
for a Git revision that every repository pins at the same file name. Both
`packageRules` and `customManagers` merge a preset's entries with the consumer's
instead of replacing them, so a rule that turns up in a second repository
belongs in the preset. Name the source as `github>`: the `local>` form resolves
against whichever platform the running bot is connected to, so the same line
names a different source under a different host.

Improve the preset when a required relationship is missing — a lint
configuration and its linter, a runtime and its bindings, a compiler and its
type-aware backend all break when one of them moves alone — instead of adding a
consumer rule that the next repository has to work out again. A project that
needs a shared setting before the preset carries it sets that one line locally
and drops it once the preset does.

The consumer file then holds only what follows from this repository's layout.
Two exceptions recur: a path whose dependencies are frozen because the tests
compare against them, and the manifests of published libraries, whose
requirements stay ranges so an application can resolve one shared version rather
than the exact one this repository last saw. Give each rule a `description`,
because the file is strict JSON with no comments and that text is what the pull
request and the next reader get. The
[renovate.json excerpt](../assets/ci/renovate.json) shows both shapes. Where the
package manager applies a release-age gate of its own, keep its exemptions
aligned with the preset's, or an update branch cannot install the version its
own pull request proposes.

An updater moves only a version it can find. A dependency in a native manifest
is found by the manager that owns the file; a version written anywhere else
stays put until something is configured to read it, and the pin then means
frozen rather than current. Decide which one it is per pin, and record the
decision where the pin lives.

| Pin                                                    | What moves it                                                                                                                                                                                                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A tool version in `mise.toml`                          | The `mise` manager, which is enabled by default, resolves a `github:` tool against that repository's releases and reads `version_prefix` as a version filter. Refreshing the committed `mise.lock` runs mise, which a self-hosted bot has to be allowed to do |
| The `version:` input of `jdx/mise-action`              | The `github-actions` manager, which reads the version inputs of the actions it knows, this one included                                                                                                                                                       |
| A Git revision in `mdtheme.yaml` or a generator script | A custom manager pairing the revision with the branch it follows. The file names are identical across repositories, so that rule belongs in the shared preset                                                                                                 |
| A tool version inside a workflow run step              | Nothing. Install the tool through `mise.toml` instead, or carry the version in a `*_VERSION` environment variable annotated with `# renovate:`, which Renovate's `customManagers:githubActionsVersions` preset reads                                          |

A pin that no manager reaches and that nobody has agreed to move by hand goes
stale without reporting it. Name such a pin in the contributor guide, beside the
command that regenerates what it feeds.

### Audit dependencies on a schedule

An advisory is published against a version that is already in the lockfile, so
it arrives without a commit and no pull request runs. Run the dependency policy
check weekly as well: `cargo deny check` for Cargo and
`pnpm audit --prod --audit-level high` for npm. `--prod` keeps the report to the
dependencies a consumer installs, and `high` is the level that gets acted on;
below it the weekly report reopens forever and stops being read.

Keep one advisory source per ecosystem. `cargo deny check` reports advisories
along with licenses, bans, and sources, so a second advisory-only lane over the
same graph raises every finding twice and makes one fix wait for two checks.

A scheduled run has no pull request to report on, and a failure that appears
only in the run list is not read. Report it into a single tracking issue through
the [`open-or-refresh-issue` action](#use-the-organizations-shared-actions),
which opens the issue on the first failing run, refreshes that same issue
afterwards instead of adding another, and closes it with a comment once the
audit comes back clean. Scope `issues: write` to the reporting job and leave the
jobs that run the resolvers read-only. The
[audit workflow excerpt](../assets/ci/audit.yml) shows both ecosystems, the
captured reports, and that job.

## Automate versioned releases

Use Conventional Commits in the merge history and Release Please for version and
changelog updates. This connects the reviewed change to its release without
maintaining version bumps by hand.

Validate the pull request title wherever a squash merge turns it into the
release commit: a title that does not parse as a Conventional Commit produces
no version bump and no changelog entry, and nothing else reports the loss. Take
the accepted types from the release configuration — every type its
`changelog-sections` names, visible and hidden, plus `revert` — because a type
the configuration does not name is parsed and then dropped without a changelog
line, while the generic default list of a title-checking action rejects a type
the project added and accepts types it never renders. A repository that
rebase-merges puts every commit subject on the release branch, so it validates
each non-merge subject against the same list, not only the title. The
[PR title excerpt](../assets/ci/pr-title.yml) shows that check and its type
list.

Keep version ownership in the release configuration and the native manifests it
updates, including intentional lockstep relationships. Build from the intended
release commit and verify that the tag, manifests, and selected artifacts agree.

Use npm Trusted Publishing with OIDC where supported, and request provenance
for public packages. Document required publisher registration, credentials, and
check settings in a maintainer guide. Explain recovery from partial publication;
a failed post-publication check must not try to overwrite an immutable version.
Make that recovery a re-run of the same workflow: publishing skips a version the
registry already serves, so the second run ships only what is missing. Verify
the release against the registry afterwards — `publish-npm` does it through its
`verify` input — because npm acknowledges a publish before every replica serves
it, and a release that arrived in part otherwise leaves a green job behind.

### Configure Release Please

`release-please-config.json` describes every versioned artifact in the
repository, and `.release-please-manifest.json` records what each one last
released. Start from the excerpt matching the repository's shape and remove what
the project does not have.

| Excerpt                                                                              | Shape                                                             |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| [rust-crate.json](../assets/ci/release-please/rust-crate.json)                       | One published crate under a component tag                         |
| [rust-workspace.json](../assets/ci/release-please/rust-workspace.json)               | A workspace whose members share one inherited version             |
| [rust-with-npm-wrapper.json](../assets/ci/release-please/rust-with-npm-wrapper.json) | A crate whose npm wrapper and platform sidecars carry its version |
| [node-linked.json](../assets/ci/release-please/node-linked.json)                     | Two npm packages released as a single version                     |

`include-component-in-tag` decides whether a tag reads `<component>-v<version>`
or `v<version>`, and `tag-separator` sets what stands between them. Use a
component tag whenever the repository can ever hold a second versioned artifact:
such a tag stays unambiguous when the second one arrives, while a plain
`v<version>` history cannot be disambiguated later without invalidating existing
pins. Below `1.0.0`, `bump-minor-pre-major` keeps a breaking change from
declaring 1.0, and `bump-patch-for-minor-pre-major` keeps a feature a patch
while the interface is still moving.

A release strategy updates only the manifests it owns: `rust` rewrites
`Cargo.toml` and the `Cargo.lock` entries of its packages, `node` rewrites
`package.json` and its lockfile. Every other file carrying the version belongs
in `extra-files`, or the release commit ships a repository that contradicts its
own tag. A lockfile outside the strategy's reach is the omission that hurts
first: a wrapper's `package-lock.json` or a second workspace's `Cargo.lock`
stays stale and fails the next `npm ci` or `--locked` build on the release
commit itself. Reach a nested field with the `json` or `toml` updater and an
explicit `jsonpath`, a family of platform sidecar manifests with `glob: true`,
and documentation with the `generic` updater, which replaces the version on a
line marked `x-release-please-version` or inside an
`x-release-please-start-version` block.

No part of a release run reports the file a configuration forgot. The
[release-set check](../assets/common/check-release-set.mjs) reads the
configuration and the manifest, scans the tracked tree, and reports a
`package.json`, `Cargo.toml`, lockfile entry, or version annotation that no
updater writes, a covered version that contradicts its component's manifest
entry, and an updater whose file or field does not exist. Run it from the gate
of any repository that carries `extra-files`, and pass `--ignore <path>` for a
fixture crate or a configuration excerpt that has a version of its own.
Agreement that belongs to one repository — a publish matrix, the platform
sidecars an `optionalDependencies` list names, a publication hold — stays in
that repository's own checks.

A Cargo workspace inheriting `version.workspace = true` has no per-package
version for the `rust` strategy to rewrite. Use the `simple` strategy with a
`version-file`, then list `[workspace.package]`, every intra-workspace
dependency that pins a version, and every `Cargo.lock` package entry, including
a separate lockfile such as `fuzz/Cargo.lock`, as `toml` extra files.

`versioning: prerelease` with `prerelease-type: rc` holds a line on candidates:
each release proposes the next `X.Y.Z-rc.N`, and a breaking change raises the
candidate instead of promoting it. Leaving the series is therefore explicit.
Land the transition with a `Release-As: X.Y.Z` footer on the commit that should
become the stable release, and keep using that footer afterwards until the
prerelease settings are removed from the configuration.

Rehearse a configuration change before it opens a release pull request. The
release-please library runs offline against the repository's own files and a
synthetic commit history: it selects the next version, applies every updater to
in-memory copies, and hands the candidate to the native tools —
`cargo metadata --locked` over the generated manifests and lockfile,
`pnpm install --lockfile-only` expected to leave the lockfile unchanged. A
forgotten updater or a lockfile the release cannot keep current then fails in a
scratch directory instead of on the tagged commit. The library is a development
dependency and the driver script belongs to the repository; this skill carries
no excerpt for it.

When a release carries built artifacts, mark it `draft: true`. The tag and the
release then exist before anything is attached, so upload jobs have somewhere to
put their archives, checksums, and signatures while nothing public advertises
the version yet. Undraft only after a job has listed the release's assets and
asserted that the expected set is complete; registry publication follows that
gate, so no immutable registry version exists for a release the repository could
not finish. Pair the draft with `force-tag-creation`, which lets a rerun tag a
release that already exists instead of stopping. The shared `package-binary`
action covers the per-platform half: it checks that the tag, the manifest
version, and `HEAD` agree before attaching `<name>-<version>-<target>.tar.gz`
with its `.sha256` and an optional Sigstore bundle. `finish-release` is the
single gate job: it asserts the expected asset set, assembles one `SHA256SUMS`,
and undrafts, so the
[artifact checks](#verify-the-artifact-consumers-receive) decide what that gate
has to find. The [installer template](../assets/common/install.sh) consumes
exactly that set of assets under exactly those names, and the
[offline harness](../assets/common/test-install.sh) beside it proves its
refusals against a fixture release rather than a published one.
The [publish-binaries excerpt](../assets/ci/publish-binaries.yml)
wires both into a matrix whose `workflow_dispatch` input resumes a failed
publish by tag. A Rust CLI adds `[package.metadata.binstall]` pointing at the
same archive names, so `cargo binstall` resolves the release's archives instead
of building from source.

A project moving toward a major version can carry a publication hold: a small
committed JSON file with `minimumMajor`, `publicationEnabled`, and `reason`,
read by both the release workflow and the publishing workflow. While the hold is
set, no release pull request opens and nothing publishes; once it is lifted,
`minimumMajor` rejects a version below the intended major. The hold and its
reason then stay reviewable in the repository instead of living in a disabled
workflow or a maintainer's memory.

Feed a Homebrew tap from the release rather than from the product repository.
Once `finish-release` has published the release, the `homebrew` job of the
[publish-binaries excerpt](../assets/ci/publish-binaries.yml) generates the
formula from the release's own `SHA256SUMS` and uploads it as another asset,
and the tap pulls that asset on its own schedule or when a maintainer
dispatches it. The product repository then holds no token for another
repository: pushing the update from here would put a long-lived
cross-repository secret in the workflow that publishes the release, and it
would give the formula checksums from a second computation that can disagree
with the ones the release published. What it costs is latency, because the tap
updates at its polling interval instead of inside the release run. A product
that needs the tap current within minutes, and already holds a token that can
write it, can send a `repository_dispatch` to the tap once the release is
public; that path needs a downgrade guard comparing the version in the tap's
current formula with the one being released, because re-running an older tag
otherwise moves the tap backwards. The
[formula generator](../assets/common/homebrew-formula.sh) takes the formula
name, description, homepage, license, repository, tag prefix, archive name, and
install lines as variables, and prints `on_macos` and `on_linux` blocks with
nested `on_arm` and `on_intel` for the four archives Homebrew can install.
`brew install --build-from-source` and `brew test` belong in the tap, which is
the repository that has Homebrew; the product repository checks only that the
generated formula names assets and checksums the release carries, which is what
reading `SHA256SUMS` gives it.

Generated release notes are a commit list. When a release needs a narrative,
commit the curated text as its own file per version, put it above the generated
body in the draft before undrafting, and add the same text above the generated
entry in `CHANGELOG.md` in a separate `docs:` commit. Release Please prepends
new entries and does not rewrite existing ones, so the addition survives later
releases.

Run the action with a fine-grained personal access token or a GitHub App token.
GitHub starts no workflow runs for events created with the built-in
`GITHUB_TOKEN`, so a release pull request opened with it arrives with no checks
at all and a required check never reports. Name that secret alone. Writing the
input as `${{ secrets.RELEASE_PLEASE_TOKEN || secrets.GITHUB_TOKEN }}` turns a
missing, expired, or revoked secret into an unchecked release pull request on a
green workflow, which is the failure the token exists to prevent and is now
invisible. Without the fallback the same situation fails the release job, where
it is read and fixed. `GITHUB_TOKEN` alone suffices only where nothing has to
run on that pull request; write it directly there rather than as a fallback, so
the workflow states which case it is in. The
[release workflow excerpt](../assets/ci/release-please/release.yml) shows that
token and the write permissions the job needs.

## Measure performance against the merge base

Where a project measures performance in CI, compare the merge base and the pull
request's head in the same job, on the same runner, with the same toolchain. A
number another run recorded is not evidence: runner hardware, kernel, and the
neighbors sharing the machine change between runs, so a stored baseline drifts
on its own and the drift is attributed to whichever pull request is open when it
surfaces, which costs a round of investigation and says nothing about that
change. Check out the full history,
resolve the revision with `git merge-base`, and add it as a `git worktree`
beside the checkout, so one job builds both binaries and measures them back to
back. Comparing against the tip of the base branch instead charges the branch
for everything merged since it started.

Keep an elapsed-time lane informative rather than blocking. Publish both
measurements and their ratio into `$GITHUB_STEP_SUMMARY`, where a reviewer reads
them beside the diff, and let the job pass whatever the ratio says: wall time on
a shared runner carries filesystem, scheduling, and neighbor noise that no
sample count removes, so a threshold on it fails changes that are not slower and
passes changes that are. What may gate is a deterministic measurement — an
instruction count from a Callgrind run over a fixed fixture, or a ratio guard
with a margin well beyond the spread the lane has been observed to produce
across real pull requests. Land the harness first, watch it for a while, and let
it start failing only once that spread is known. A path-filtered lane also has
no run on a pull request that touches nothing it measures, and a required check
that never reports blocks the merge, so keep the lane out of branch protection
and out of the aggregate gate.

Whatever the lane measures, let it fail when it measures nothing. A benchmark
binary whose state directory was restored from another commit can load no
baseline, print no measurement, and still exit zero, so the lane reports success
for a run that established nothing; assert that both sides produced numbers. The
[comparison workflow excerpt](../assets/ci/bench-compare.yml) shows the
worktree, the two builds, the bencher output format that gives the table one
line per benchmark, and that guard.

Trace every figure a README or a site publishes to a committed report. A number
in prose otherwise has no owner: the run behind it has expired, nobody reruns it
to refute it, and it ages into a claim about a version the project no longer
ships. Commit the report, register the figure against it, and check the pair in
the ordinary gate. The
[published-number check](../assets/common/check-published-numbers.mjs) reads a
claim map that names, per figure, the report file, the path to the value inside
it, the tolerance a rounded claim may keep, and the documents that print it. It
fails when a document has dropped the figure, when the report no longer carries
the value, and when the two have drifted apart, so refreshing a report forces
the copy edit that belongs with it. Its optional sweep catches the other
direction: a figure added to a document that the map never registered.

Bound what ships with a budget instead of a comparison: the size of a released
binary, of a published bundle, and of a generated index, and the duration of a
build. These are deterministic per build, so unlike a timing lane a budget can
block a pull request, and the growth worth catching is abrupt — a dependency
that bakes a data table into every platform's artifact costs megabytes, not
percent. Set the budget as a ceiling rather than a comparison against the last
build, because exact sizes move with toolchain patch releases, linkers, and
platforms, and record and raise it the way
[a site's budgets](documentation.md#publish-the-site) are recorded and raised.

## Verify the artifact consumers receive

Packaging can omit files or break entry points even when source tests pass.
Exercise the installed artifact at the boundary the consumer uses.

| Artifact              | Check                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm package           | [Pack and install in a clean consumer](node.md#verify-the-development-and-consumer-paths): archive against `files`, every entry point, each export condition  |
| Rust crate            | Package, then [test and install the packaged result](rust.md#share-the-local-and-ci-checks); verify the [API contract](rust.md#share-the-local-and-ci-checks) |
| Native Node package   | Wrapper and sidecar versions, platform selection, a packed binding in a [clean consumer](node.md#verify-the-development-and-consumer-paths), a musl host load |
| CLI on npm            | [Install the packed wrapper in a clean consumer](#distribute-a-cli-through-npm): platform resolution, the launch version check, and the binary's `--version`  |
| Downloaded CLI        | Verify and smoke-test the archive with the [installer template](../assets/common/install.sh) and its [offline harness](../assets/common/test-install.sh)      |
| Homebrew formula      | Check that the generated formula names assets and checksums the release carries; `brew install --build-from-source` and `brew test` run in the tap            |
| Git-installed package | Verify the Git consumer path and keep required built files committed and current                                                                              |

Use package validators where they cover the contract. Commit built output only
when the distribution path requires it. Scale validation to the product rather
than installing every package checker in every application.

## Distribute a CLI through npm

An npm wrapper lets a project install a Rust CLI with the package manager it
already runs and pin the version in `package.json`, which a global install
channel cannot do. Two models bring the binary to that consumer, and they
differ in what the consumer's machine still has to do after the install.

Platform packages publish the binary in one package per platform, each
declaring its `os`, `cpu`, and on Linux `libc`, and the wrapper lists them in
`optionalDependencies`. The package manager installs only the matching one, and
the wrapper's `bin` is a launcher that resolves that package and executes the
binary it carries. Nothing is fetched, unpacked, or written after installation,
so an offline machine, a registry mirror, and an install with lifecycle scripts
disabled all work, and the lockfile covers the binary itself. The costs are one
published package per platform per release, each name needing a first publish
before Trusted Publishing can take it over, and one Node process in front of
every invocation. The
[launcher excerpt](../assets/node/cli-launcher.mjs) carries the resolution, the
version check, and the spawn.

Downloading on first run publishes one package instead. The launcher resolves
the target, downloads `<name>-<version>-<target>.tar.gz` and its `.sha256` from
the release of its own version, verifies the checksum before anything is
executed, and caches the binary per version and target, moving it into place
with an atomic rename so a concurrent run cannot execute a partial file. The
release becomes a runtime dependency of the installed package: the first run
needs network and proxy access to the release host, and a machine that reaches
only its registry mirror never gets a binary at all. The wrapper also owns
download retries, proxy handling, and the cache: code that the other model does
not have, running on the consumer's machine.

Choose platform packages for a CLI that must install offline, behind a mirror,
or into an image that disables lifecycle scripts. Choose the download model for
a single small binary with a public release and a simple publishing job, where
one package per release is the smaller thing to maintain.

Both models hold the same invariants:

- The wrapper's version is the crate's version, and every platform package is
  pinned to exactly that version. Anything else advertises a CLI the release
  never built. The
  [version check excerpt](../assets/node/scripts/check-cli-version.mjs) compares
  the manifests; run it in the check job and as the wrapper's `prepublishOnly`
  script, which is the last point before the version is immutable.
- Linux resolution separates glibc from musl. The diagnostic report's
  `header.glibcVersionRuntime` exists only on a glibc runtime, so
  `process.report.getReport()` decides it without spawning `ldd`. A musl
  consumer sent to the gnu build fails in the dynamic loader instead, with a
  message that names no package.
- The launcher runs a binary of its own version and reports a mismatch as one:
  the platform model compares the resolved package's version before spawning,
  and the download model requests the release of its own version rather than
  the latest one. A binary from another version is otherwise read as a bug in
  the CLI.
- CI installs the packed wrapper in an empty consumer and runs the real binary
  once for every published platform, as the
  [artifact checks](#verify-the-artifact-consumers-receive) require. For the
  download model that smoke belongs after the release assets exist and before
  `npm publish`, because it downloads what a consumer's machine will fetch.

Name a platform package `<wrapper package>-<platform id>`, using the platform
ids that the [`napi-matrix` action](#use-the-organizations-shared-actions)
derives: `linux-x64-gnu`, `linux-arm64-gnu`, `linux-x64-musl`,
`linux-arm64-musl`, `darwin-arm64`, `darwin-x64`, `win32-x64-msvc`, and
`win32-arm64-msvc`. One vocabulary then covers a CLI's platform packages and a
library's napi sidecars, so a repository that ships both derives every package
name from the same matrix instead of writing the list down twice.

Carry the version into the wrapper manifest, its lockfile, and every platform
manifest from the release configuration, as the
[rust-with-npm-wrapper.json excerpt](../assets/ci/release-please/rust-with-npm-wrapper.json)
shows. Publish the platform packages before the wrapper, because its optional
dependencies have to exist before it can install; that is the order the
[`publish-npm` action](#use-the-organizations-shared-actions) takes them in.
