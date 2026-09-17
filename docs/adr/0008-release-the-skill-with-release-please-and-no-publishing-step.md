# ADR-0008: Release the skill with Release Please and no publishing step

- Status: accepted
- Date: 2026-09-17

## Context

The skill has no registry. Consumers install it with the Skills CLI reading
this repository, and the
[installation guide](../installation.md) records that a standard install
follows the default branch while an explicitly selected ref keeps tracking that
ref. Every merge to `main` therefore reaches consumers at their next update,
unannounced.

Nothing in the repository tells a consumer what changed. `skills-lock.json`
stores source information and a content hash, and the installation guide notes
that the hash is not a fetchable Git commit, so it identifies a state without
describing it. The decision the consumer faces is not whether the files differ
but whether the changed instructions are worth a fresh agent session, because
installing an update does not apply it.

Most commits in this repository are `docs:`. Release Please bumps a version for
`feat`, `fix`, and breaking changes only, so a repository whose product is
written instructions can adopt the tool and then never produce a release.

## Decision

Adopt Release Please for the version, the changelog, the tag, and the GitHub
Release. Do not add a publishing job; the release workflow runs the release step
alone.

Use `release-type: simple` with the root package. The repository has no native
manifest, and the installation guide states that a consuming project needs no
`package.json` for this workflow, so introducing one here to hold a version
would contradict that.

Scope the version to the distributed package rather than the repository. A
change under `skills/project-infra/` is what a consumer installs and is
committed as `feat` or `fix`. A change to the ADRs, RFCs, contribution guide,
installation guide, README, checks, or workflows stays outside the installed
package and is committed as `docs`, `ci`, `chore`, `refactor`, or `revert`,
which produce no release. A pull request title check enforces the vocabulary,
because the squashed title becomes the commit Release Please reads.

Start the manifest at `0.1.0` for the state trialled today and set
`bootstrap-sha` to the commit that state ends at, so the first changelog begins
with the first change made after this decision. Remove `bootstrap-sha` once the
first generated release pull request is merged.

## Alternatives considered

- Publishing to npm would give versioned artifacts, but the Skills CLI installs
  from Git, so the package would be a second distribution channel that no
  documented workflow uses.
- Maintaining `CHANGELOG.md` by hand needs no configuration and is the thing
  contributors forget; the release history would then describe the changes
  someone remembered to write down.
- Tagging every merge to `main` would make each state referenceable without a
  tool, but a version that moves for a typo in an ADR tells a consumer nothing
  about whether their installed instructions changed.
- Configuring `changelog-sections` so that `docs` releases as well would keep
  the current commit vocabulary. It also makes repository-only edits bump the
  number that consumers read as the instruction version.

## Consequences

A consumer can read what changed before spending a session on it, and can pin a
tag instead of following the default branch. The default branch stays
installable and remains the documented path.

Releases happen when the installed package changes, so a stretch of repository
maintenance produces none. A version therefore does not identify a repository
state, only a package state; the Git history continues to identify the former.

The commit vocabulary now carries release meaning. Placing a skill change under
`docs` withholds a release that consumers should see, and the title check cannot
detect that, because it reads the type and not the diff. Reviewing the type
against the changed paths belongs to pull request review.

## References

- [Contribution guide](../../CONTRIBUTING.md)
- [Installation guide](../installation.md)
- [CI and release conventions](../../skills/project-infra/references/ci-and-releases.md)
- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- [Manifest-driven Release Please](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md)
