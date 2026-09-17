# ADR-0008: Succeed the standards repository

- Status: accepted
- Date: 2026-09-17

## Context

`sebastian-software/standards` holds four different things: a CLI with its own
tests, a migration system built from a version stamp and numbered changelogs,
reference material for several stacks, and four composite actions. Only the
middle part is what [ADR-0002](0002-apply-current-conventions-through-an-agent.md)
replaced. The rest keeps its value regardless of how a repository is brought up
to date.

[ADR-0007](0007-consolidate-shared-infrastructure-into-this-repository.md)
recorded that the actions have to move, which left open what happens to
everything else. Two repositories describing the same conventions is the
duplication this project set out to remove, and
[ADR-0001](0001-create-project-infra-as-a-separate-repository.md) treated the
overlap as a transition without naming its end.

## Decision

This repository is the successor to `sebastian-software/standards`. That
repository is retired rather than maintained in parallel. Content moves here
when it has value on its own; content that only existed to serve the migration
machinery is dropped with it.

| Area                                                                                      | Where it goes                                                      |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Composite actions                                                                         | Here, as executable behavior a workflow references                 |
| Release blueprint and its configurations                                                  | Here, as guidance in the CI reference and excerpts under `assets/` |
| Repository scaffolding templates                                                          | Here, as the source a new repository starts from                   |
| Stack reference configurations                                                            | Here as excerpts, reduced to what a project adapts                 |
| Onboarding procedure                                                                      | Here, rewritten for this repository's workflow                     |
| The CLI, its tests, the version stamp, the numbered changelogs, the agent prompt pipeline | Dropped                                                            |
| Lint configuration packages, README tooling and their documentation                       | Stay with the packages that own them                               |

The move is incremental and each step leaves consumers working. A reference in
a consuming repository keeps resolving against the old address until that
repository has another reason to change its workflow, so pins move once.

Both repositories are MIT licensed to the same holder, and this repository
offers Apache 2.0 as an additional option under
[ADR-0006](0006-dual-license-under-apache-2-0-and-mit.md). Moved content carries
that choice.

The composite actions are the first step and are done. Their address in the CI
reference now names this repository.

## Alternatives considered

- **Keeping `standards` as a provider for the actions alone.** It preserves a
  repository, its release process and its dependency updates for four files,
  and keeps a second place that appears to define organization conventions.
- **Moving everything at once.** The publishing path of at least one product
  depends on those actions. A single cut-over would put every consumer's
  release on one change.
- **Leaving the reference material where it is.** A reader would have to know
  which of two repositories is current, which is the question this decision
  exists to answer.

## Consequences

One repository defines the conventions and carries the behavior that applies
them, with one tag over both. The duplication ends, and the reference material
gets the review it has not had since the machinery around it stopped being the
plan.

Dropping the CLI drops the mechanical guarantees it provided, byte-exact
synchronization and a stamped version among them. That is the trade
[ADR-0002](0002-apply-current-conventions-through-an-agent.md) already accepted;
retiring the CLI makes it real rather than adding it.

This repository now holds executable code that runs in other repositories' CI.
Its own gate runs the pin checker against its own workflows, and a change to an
action is reviewed as behavior rather than as documentation.

Until a release tag exists here, a consumer of a moved action resolves its SHA
from `main`. The retirement is not finished while any consumer still resolves a
reference against the old repository.

## References

- [Retiring the standards repository](../rfcs/0003-retiring-the-standards-repository.md)
- [Consolidation decision](0007-consolidate-shared-infrastructure-into-this-repository.md)
- [The shared actions](../../.github/actions/README.md)
