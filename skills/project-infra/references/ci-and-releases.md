# CI, releases, and dependency updates

Release conventions apply to artifacts the project versions and distributes.

## Keep CI reproducible and bounded

Share check implementations with the local gate. Pin external GitHub Actions
to full commit SHAs with readable version comments, set job timeouts, and grant
read access by default. Give publishing jobs the write permissions their
operations need. These choices make dependency changes reviewable and keep
failed or stalled jobs from consuming unbounded time.

Cancel superseded pull-request runs. Serialize publication when concurrent runs
could race, and let an active release finish. Use platform matrices for the
platforms the product supports.

Preserve the required check names configured in branch protection. When splitting
checks into jobs, provide a stable aggregate that runs after failures and
examines each required result. Handle skipped jobs explicitly so omitted work
cannot accidentally produce a passing gate.

## Share dependency policy

Extend `github>sebastian-software/renovate-config`. Keep general update timing,
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

Keep version ownership in native manifests and release configuration, including
intentional lockstep relationships. Build from the intended release commit and
verify that the tag, manifests, and selected artifacts agree.

Use npm Trusted Publishing with OIDC where supported, and request provenance
for public packages. Document required publisher registration, credentials, and
check settings in a maintainer guide. Explain recovery from partial publication;
a failed post-publication check must not try to overwrite an immutable version.

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
