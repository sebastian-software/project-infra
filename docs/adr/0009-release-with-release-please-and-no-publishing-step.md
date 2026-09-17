# ADR-0009: Release with Release Please and no publishing step

- Status: accepted
- Date: 2026-09-17

## Context

[ADR-0007](0007-consolidate-shared-infrastructure-into-this-repository.md)
made this repository the monorepo for shared infrastructure that has no reason
to release on its own schedule, and decided that one tag covers the skill, its
references, the composite actions, and shared task definitions together. Its
consumption table then names a tag three times: an action is pinned by a SHA
resolved from a release tag, a task definition through an include pinned to a
tag, and the skill through the Skills CLI pinned to a tag.

No tag exists.
[ADR-0008](0008-succeed-the-standards-repository.md) records the gap it leaves:
until a release tag exists here, a consumer of a moved action resolves its SHA
from `main`, and the retirement of the predecessor repository is not finished
while any consumer still resolves against it.

Consumers of the skill have the same problem in a quieter form. A standard
install follows the default branch, as the
[installation guide](../installation.md) records, so every merge reaches them
unannounced. `skills-lock.json` stores a content hash that the same guide notes
is not a fetchable Git commit, so it identifies a state without describing it.
The decision a consumer faces is not whether the files differ but whether the
changed instructions are worth a fresh agent session, because installing an
update does not apply it.

Most commits in this repository are `docs:`. Release Please bumps a version for
`feat`, `fix`, and breaking changes only, so a repository whose product is
largely written instructions can adopt the tool and then never produce a
release.

## Decision

Adopt Release Please for the version, the changelog, the tag, and the GitHub
Release. Do not add a publishing job; the release workflow runs the release step
alone. Nothing here goes to a registry, and ADR-0007 already decided that
consumption stays native per ecosystem.

Use `release-type: simple` with the root package, the one tag ADR-0007 calls
for. The repository has no native manifest, and the installation guide states
that a consuming project needs no `package.json` for this workflow, so
introducing one here to hold a version would contradict that.

Scope the version to what a consumer takes from this repository by tag, not to
the repository as a whole:

| Path                    | Taken by                            | Commit type   |
| ----------------------- | ----------------------------------- | ------------- |
| `skills/project-infra/` | The Skills CLI                      | `feat`, `fix` |
| `.github/actions/`      | `uses:` by SHA, resolved from a tag | `feat`, `fix` |
| Shared task definitions | A remote include pinned to a tag    | `feat`, `fix` |
| Everything else         | Nobody outside this repository      | no release    |

Records, guides, the README, `scripts/`, and this repository's own workflows are
read by contributors here and are committed as `docs`, `ci`, `chore`,
`refactor`, or `revert`, which produce no release. A pull request title check
enforces the vocabulary, because the squashed title becomes the commit Release
Please reads.

Start the manifest at `0.1.0` for the skill-only state that preceded the
composite actions, and set `bootstrap-sha` to the commit that state ends at, so
the first release covers the actions takeover rather than recording it as
already shipped. Remove `bootstrap-sha` once the first generated release pull
request is merged.

## Alternatives considered

- Publishing to npm would give versioned artifacts, but ADR-0007 decided
  against a single distribution mechanism, and neither the Skills CLI nor a
  `uses:` reference reads a registry.
- Scoping the version to the skill alone would track the piece that changes
  most. It would also leave a composite action released only by coincidence,
  which is the tag ADR-0008 is waiting for.
- Maintaining `CHANGELOG.md` by hand needs no configuration and is the thing
  contributors forget; the release history would then describe the changes
  someone remembered to write down.
- Tagging every merge to `main` would make each state referenceable without a
  tool, but a version that moves for a typo in an ADR tells a consumer nothing
  about whether what they installed changed.
- Configuring `changelog-sections` so that `docs` releases as well would keep
  the current commit vocabulary. It also makes repository-only edits bump the
  number that consumers read as the version of what they pinned.

## Consequences

The first release gives ADR-0008 the tag it is waiting for, so a consumer of a
moved action can resolve its SHA from a reviewed release rather than from
`main`. Skill consumers can read what changed before spending a session on it,
and can pin a tag instead of following the default branch. The default branch
stays installable and remains the documented path.

Releases happen when consumer-facing content changes, so a stretch of records
and guide work produces none. A version therefore does not identify a repository
state, only the state of what this repository hands out; the Git history
continues to identify the former.

The commit vocabulary now carries release meaning. Placing a skill or action
change under `docs` withholds a release that consumers should see, and the title
check cannot detect that, because it reads the type and not the diff. Reviewing
the type against the changed paths belongs to pull request review.

Adding a further consumer-facing path later extends the table above rather than
the release mechanism, which already covers the whole repository at one version.

## References

- [Contribution guide](../../CONTRIBUTING.md)
- [Installation guide](../installation.md)
- [The shared actions](../../.github/actions/README.md)
- [CI and release conventions](../../skills/project-infra/references/ci-and-releases.md)
- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- [Manifest-driven Release Please](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md)
