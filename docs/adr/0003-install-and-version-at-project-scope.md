# ADR-0003: Install and version the package at project scope

- Status: accepted
- Date: 2026-09-16

## Context

An agent needs to discover the instructions in the app and project where work
happens. A shared user-level installation was considered, including Dalo's source
management, but the requested default is a lean installation inside each project.

The discussion also sought an alternative to tracking an independent standards
integer in every consumer. The selected package content already represents the
rule set the agent should use.

## Decision

Install project-infra at project scope. Track the installed portable content in
the consuming repository, together with the chosen installer's normal provenance
or lock data where applicable. Keep the package discoverable by the selected apps.

The intended maintenance loop is:

1. Update the project's installed package.
2. Load the updated instructions into the agent's context.
3. Apply those instructions to the current project and run its checks.
4. Review the package update and project adaptations together.

Use the installed content and normal Git history to identify the rule set. Do not
introduce a separate project-infra migration integer, applied-version tag,
special commit trailer, or replacement for `.repometa.json` merely to claim that
the project is current.

Updating instructions and applying them are distinct operations. An update is
not proof of completed adaptation. The report may identify the source revision
for traceability, but the actual project state determines remaining work.

## Alternatives considered

- A user-wide installation is convenient for personal use, but does not give a
  project a shared, reviewable local rule set by itself.
- Git tags and commit trailers can record that an operation occurred. They do
  not prove that its effects remain in the tree: a revert can restore old files
  while the earlier marker remains in history. Shallow or tag-free clones also
  make history-based discovery conditional.
- A custom field in `package.json`, Cargo metadata, or another manifest would
  relocate the stamp without removing the need to keep it aligned with reality.
- A Git submodule can pin external content, but adds checkout and update steps.
  It is an installation option to assess only if simpler distribution is
  insufficient, not an adopted requirement.

## Consequences

Projects can update independently. Committed content travels with a clone and
provides a visible diff. It also adds vendored instruction files to each project;
the benefit is a shared source snapshot rather than reliance on a developer's
global configuration.

An installer may use hashes, refs, or other provenance. Its exact guarantees must
be checked before claiming reproducible restoration from its lock data. No custom
lock format is selected here.

A source update cannot erase old instructions already read in an ongoing
conversation. Reloading or starting a fresh session must be part of the eventual
documented workflow. Different apps may require different steps.

## References

- [Project-scoped distribution RFC](../rfcs/0002-project-scoped-distribution.md)
- [Git trailers](https://git-scm.com/docs/git-interpret-trailers)
