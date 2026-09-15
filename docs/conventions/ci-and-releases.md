# CI, releases, and dependency updates

Applies to repositories with CI or dependency automation. Release conventions
apply only to artifacts the project actually versions and distributes.

## A small, dependable CI gate

**Default:** share check implementations with the local gate, pin external
GitHub Actions to full commit SHAs with readable version comments, set job
timeouts, and grant read access by default. Give publishing jobs only the write
permissions their concrete operations need. Let the dependency updater maintain
action pins.

Cancel superseded pull-request runs. Serialize publication where concurrent
runs could race; do not cancel a release halfway through publishing its targets.
Use a platform matrix only for platforms the product supports.

Evidence: [harness-relay CI](https://github.com/sebastian-software/harness-relay/blob/fbc04ab1bd762c0050b97f29f07def0eb0f87773/.github/workflows/ci.yml),
[Palamedes concurrency](https://github.com/sebastian-software/palamedes/blob/29d30ce85d49087cdef37f05c0554c76c1d6402c/.github/workflows/ci.yml),
[harness-relay publication](https://github.com/sebastian-software/harness-relay/blob/fbc04ab1bd762c0050b97f29f07def0eb0f87773/.github/workflows/publish.yml).

Preserve the required check names configured in branch protection. If the
workflow splits into jobs, provide a stable aggregate check that runs even when
dependencies fail and verifies their results. Decide explicitly which skipped
jobs are acceptable; an aggregate must not report success merely because no
command ran.

Evidence: [OxLint Package / Required check](https://github.com/sebastian-software/oxlint-config-setup/blob/31f09d70759f0928ca586838b521f6810c0e5d16/.github/workflows/package.yml).

repo-template's surveyed CI still uses action tags and a simpler combined job.
Use the stronger consumer patterns above when modernizing it. The template is
an input to these standards, not their automatic authority.

Evidence: [template CI at the surveyed commit](https://github.com/sebastian-software/repo-template/blob/9b862953d9d6dbe7bd940bef1d1f06bd4a0e1714/.github/workflows/ci.yml).

## Dependency updates have a shared owner

**Default:** extend `github>sebastian-software/renovate-config`. Keep general
release-age rules, grouping, and automerge policy in that repository. Consumer
configuration should contain only the project's actual exceptions. Do not
reproduce the preset's current package lists in this documentation.

Keep compatibility-sensitive components together: for example the selected
OxLint configuration/backend combination or lockstep Palamedes packages. Check
whether the inherited preset covers the actual names before adding a narrow
consumer rule or improving the shared preset. The surveyed OXC group alone does
not include every component of the newer lint configuration's compatibility
matrix.

Evidence: [shared Renovate preset](https://github.com/sebastian-software/renovate-config/blob/4737b50bc049c3c0d1c9f80d12beef06fd1e0a06/default.json),
[OxLint compatibility contract](https://github.com/sebastian-software/oxlint-config-setup/blob/31f09d70759f0928ca586838b521f6810c0e5d16/package.json).

The legacy `:standards` preset updates the old metadata and managed-file system.
Do not add it to a new project-infra consumer. Existing consumers remove it only
as part of the [explicit ownership migration](../rfcs/0004-migration-and-ecosystem.md).

## Versioned products use Release Please

**Default:** use Conventional Commits in the merge history and Release Please
to prepare version and changelog changes for versioned products. Validate squash
PR titles where they become the release commit. Keep version ownership in native
manifests and the release configuration, including intentional lockstep updates
across language boundaries.

Release Please is already used in 19 of the 28 public source snapshots. Its
presence does not determine whether a project publishes npm packages, crates,
binaries, containers, or only GitHub releases.

Evidence: [Ferromark release configuration](https://github.com/sebastian-software/ferromark/blob/dea120198145497cf4e1bec88b2d865cc050b7c3/release-please-config.json),
[harness-relay release workflow](https://github.com/sebastian-software/harness-relay/blob/fbc04ab1bd762c0050b97f29f07def0eb0f87773/.github/workflows/publish.yml),
[Dalo PR title check](https://github.com/sebastian-software/dalo/blob/4fdef503716b16fb911767a252daca0e38b67adf/.github/workflows/pr-title.yml).

Build and publish from the intended release commit; verify that tag, manifest
versions, and selected artifacts agree. Use npm Trusted Publishing with OIDC
when the target supports it, and request provenance for public packages.
Use narrowly scoped credentials for channels that require them.

In a maintainer guide, document the external setup: trusted-publisher registration,
required credentials, and required check settings. Describe how to recover from
partial publication. A failed verification after publication must not retry an
immutable package version as though it had never been published.

Evidence: [OxLint release operations](https://github.com/sebastian-software/oxlint-config-setup/blob/31f09d70759f0928ca586838b521f6810c0e5d16/docs/release-automation.md),
[mdtheme release workflow](https://github.com/sebastian-software/mdtheme/blob/cfae631c2387b8460ebe5e7bd92556d17ac80dd7/.github/workflows/publish.yml).

## Verify the artifact consumers receive

Source tests are necessary where behavior warrants them, but a successful source
build alone does not prove that an exported package or downloaded binary works.

| Artifact              | Required adoption check                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| npm package           | Pack it and install the tarball in a clean consumer; check public exports, declarations, and promised module formats |
| Rust crate            | Run Cargo's package verification and check intended public features and included files                               |
| Native Node package   | Check wrapper/native versions, platform package selection, and loading an actual packaged binding                    |
| Downloaded CLI        | Smoke-test the release binary and verify its published checksums                                                     |
| Homebrew formula      | Validate the formula and install/test the referenced artifact before publication                                     |
| Git-installed package | Verify the Git consumer path and ensure required built files are committed and current                               |

Scale the checks to the contract. Use existing package tools such as publint and
Are the Types Wrong where they cover that contract; do not add every validator
to every app. Committed `dist` is an exception for a real Git-consumption path,
not the default for packages published from CI.

Evidence: [xlsx-format package checks](https://github.com/sebastian-software/xlsx-format/blob/baf4978421a441fa8034527c5737a491930d7344/package.json),
[OxLint clean consumers](https://github.com/sebastian-software/oxlint-config-setup/blob/31f09d70759f0928ca586838b521f6810c0e5d16/.github/workflows/package.yml),
[Ferromark publication](https://github.com/sebastian-software/ferromark/blob/dea120198145497cf4e1bec88b2d865cc050b7c3/.github/workflows/publish.yml),
[Ferramenta package gate](https://github.com/sebastian-software/ferramenta/blob/6351af77d033b7a9d80ad0f6478b583626fba5ea/package.json),
[theme build contract](https://github.com/sebastian-software/sebastian-theme/blob/39b0432a958c23fbd4b6ae8a263ab07178a7150f/package.json),
[Homebrew update validation](https://github.com/sebastian-software/homebrew-tap/blob/4705f32336b2e74d8be7d0e8914c0989cef6d29f/.github/workflows/update-mdtheme.yml).
