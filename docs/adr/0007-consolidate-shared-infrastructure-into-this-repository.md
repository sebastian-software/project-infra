# ADR-0007: Consolidate shared infrastructure into this repository

- Status: accepted
- Date: 2026-09-17

## Context

The organization's shared infrastructure is spread across repositories that
release on their own schedules. Composite actions, configuration blueprints and
the conventions that explain them each sit somewhere else, so a change that
spans two of them needs two releases, two reviews and a compatibility claim
between the resulting versions. Nobody maintains that claim.

The instructions in this repository already describe infrastructure that lives
elsewhere. An agent reading them cannot reach the actions they imply, so it
writes a local copy of behavior the organization had already solved once.

## Decision

Treat this repository as the monorepo for shared infrastructure that has no
reason to release on its own schedule: the skill, its references, configuration
excerpts, the composite actions, and shared task definitions. One tag covers
them together, so a change and the guidance that explains it ship as one
reviewed unit.

Consumption stays native per ecosystem. A single mechanism would have to copy
files, because Rust has no configuration inheritance, and copying with drift
detection is the machinery this project replaced.

| What                               | How a consumer takes it                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| Composite actions                  | `uses:` by path and commit SHA, resolved from a release tag |
| Task definitions                   | mise, through a remote include pinned to a tag              |
| The skill and its references       | The Skills CLI, pinned to a tag                             |
| Rust and small configuration files | The agent adapts an excerpt into the project                |
| Large Node configuration packages  | Their own npm packages, extended locally                    |

Configuration excerpts stay templates that an agent adapts. They are not
published paths for a consumer to reference. A referenced excerpt would become a
contract, where every edit is a breaking change for someone else's build, and
would make an agent directory a build dependency.

Packages with their own release cadence and their own compatibility matrix stay
separate, including the lint configuration packages and the README tooling. This
decision covers what would otherwise have no home of its own.

## Alternatives considered

- **One mechanism for everything.** Delivering configuration through the skill
  package works: the installer copies every file, a consumer can extend an
  installed `tsconfig.json`, and a tag pins the whole set. It was rejected
  because it makes the agent directory a build dependency, puts a third-party
  installer in the CI path, and hands a Rust-only repository Node configuration
  it never uses.
- **Keeping the actions where they are.** Their current home is the system this
  project replaces. Leaving them there keeps a repository alive for four files
  and preserves the cross-version claim this decision removes.
- **Publishing the actions as a package.** Actions are consumed by repository
  path, so publishing adds a step without adding a capability.

## Consequences

One tag covers guidance and behavior together, and a consumer can pin every path
to the same release. The repository now holds executable code, so its own gate
has to cover more than documentation.

Consumers use several mechanisms rather than one. Each is the one its ecosystem
already documents, so the cost is a longer setup description rather than a
custom protocol.

The actions have to move from their current repository. Until they do, the
references name their existing address, because the skill describes the
supported path rather than a plan. Moving them is one action at a time, so a
consumer's publish path is never without a working reference.

The mise task include is marked experimental upstream. It is proven in one
repository before it becomes guidance.

## References

- [Adoption and tool ownership](../rfcs/0002-adoption-and-tool-ownership.md)
- [Distribution decision](0003-distribute-a-self-contained-skill-at-project-scope.md)
- [mise task configuration](https://mise.jdx.dev/tasks/task-configuration.html)
