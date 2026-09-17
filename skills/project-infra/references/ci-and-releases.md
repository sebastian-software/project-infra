# CI, releases, and dependency updates

Release conventions apply to artifacts the project versions and distributes.

## Keep CI reproducible and bounded

Share check implementations with the local gate. Pin external GitHub Actions
to full commit SHAs with readable version comments, set job timeouts, and grant
read access by default. Give publishing jobs the write permissions their
operations need. These choices make dependency changes reviewable and keep
failed or stalled jobs from consuming unbounded time.

Resolve a pinned SHA from the release tag rather than from a branch, so the pin
names a reviewed state:

```sh
git ls-remote https://github.com/<owner>/<repo> 'refs/tags/<tag>^{}'
```

Cancel superseded pull-request runs. Serialize publication when concurrent runs
could race, and let an active release finish. Use platform matrices for the
platforms the product supports.

## Use the organization's shared actions

Four composite actions carry publishing and platform behavior that repositories
would otherwise reimplement. Reference them by path and commit SHA; do not copy
them into a repository.

| Action              | Use it for                                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `publish-crates`    | Publishing a workspace's crates in dependency order, with an already-published check and index-propagation waits that make a re-run safe |
| `publish-npm`       | Publishing packages in order with provenance, deriving the dist-tag from the version so a candidate never lands on `latest`              |
| `napi-matrix`       | The organization's napi platform list and the derived sidecar, artifact, and binary names                                                |
| `check-action-pins` | Failing a workflow whose `uses:` entries are not full commit SHAs                                                                        |

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
permissions, cancellation of superseded runs, and such an aggregate gate.

## Share dependency policy

Extend `github>sebastian-software/renovate-config`, as in the
[renovate.json excerpt](../assets/ci/renovate.json). Keep general update timing,
grouping, and automerge policy in that shared preset. Consumers own only their
specific exceptions. This prevents repository copies from drifting apart.

Update compatibility-sensitive components together. Check that the shared preset
covers the selected lint configuration, linter, and type-aware backend. Improve
the preset or add a narrow consumer rule when a required relationship is missing.

## Automate versioned releases

Use Conventional Commits in the merge history and Release Please for version and
changelog updates. Validate squash PR titles when they become the release commit.
This connects the reviewed change to its release without maintaining version
bumps by hand.

Keep version ownership in the release configuration and the native manifests it
updates, including intentional lockstep relationships. Build from the intended
release commit and verify that the tag, manifests, and selected artifacts agree.

Use npm Trusted Publishing with OIDC where supported, and request provenance
for public packages. Document required publisher registration, credentials, and
check settings in a maintainer guide. Explain recovery from partial publication;
a failed post-publication check must not try to overwrite an immutable version.

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

When a release carries built artifacts, mark it `draft: true`. The tag and the
release then exist before anything is attached, so upload jobs have somewhere to
put their archives, checksums, and signatures while nothing public advertises
the version yet. Undraft only after a job has listed the release's assets and
asserted that the expected set is complete; registry publication follows that
gate, so no immutable registry version exists for a release the repository could
not finish. Pair the draft with `force-tag-creation`, which lets a rerun tag a
release that already exists instead of stopping. No shared action covers the
upload-and-verify shape yet: implement it as one upload job per platform
followed by a single gate job, and let the
[artifact checks](#verify-the-artifact-consumers-receive) decide what that gate
has to find.

A project moving toward a major version can carry a publication hold: a small
committed JSON file with `minimumMajor`, `publicationEnabled`, and `reason`,
read by both the release workflow and the publishing workflow. While the hold is
set, no release pull request opens and nothing publishes; once it is lifted,
`minimumMajor` rejects a version below the intended major. The hold and its
reason then stay reviewable in the repository instead of living in a disabled
workflow or a maintainer's memory.

Generated release notes are a commit list. When a release needs a narrative,
commit the curated text as its own file per version, put it above the generated
body in the draft before undrafting, and add the same text above the generated
entry in `CHANGELOG.md` in a separate `docs:` commit. Release Please prepends
new entries and does not rewrite existing ones, so the addition survives later
releases.

Run the action with a fine-grained personal access token or a GitHub App token.
GitHub starts no workflow runs for events created with the built-in
`GITHUB_TOKEN`, so a release pull request opened with it arrives with no checks
at all and a required check never reports. Writing the input as
`${{ secrets.RELEASE_PLEASE_TOKEN || secrets.GITHUB_TOKEN }}` degrades a fork or
a revoked secret to an unchecked release pull request instead of a failing
workflow. `GITHUB_TOKEN` alone suffices only where nothing has to run on that
pull request. The
[release workflow excerpt](../assets/ci/release-please/release.yml) shows that
token and the write permissions the job needs.

## Verify the artifact consumers receive

Packaging can omit files or break entry points even when source tests pass.
Exercise the installed artifact at the boundary the consumer uses.

| Artifact              | Check                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| npm package           | Install the packed tarball in a clean consumer; check exports, declarations, and promised module formats |
| Rust crate            | Run Cargo package verification and check intended public features and included files                     |
| Native Node package   | Check wrapper/native versions, platform selection, and loading a packaged binding                        |
| Downloaded CLI        | Smoke-test the binary and verify published checksums                                                     |
| Homebrew formula      | Validate the formula and install/test its referenced artifact                                            |
| Git-installed package | Verify the Git consumer path and keep required built files committed and current                         |

Use package validators where they cover the contract. Commit built output only
when the distribution path requires it. Scale validation to the product rather
than installing every package checker in every application.
