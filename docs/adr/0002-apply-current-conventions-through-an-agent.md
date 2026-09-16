# ADR-0002: Apply current conventions through an agent

- Status: accepted
- Date: 2026-09-16

## Context

A repository template provides a starting point. Keeping an existing project
current is a different problem: projects acquire custom CI jobs, mixed language
workspaces, alternate configurations, and documentation tailored to their users.

The legacy standards version identifies a template revision and its migration
list. Advancing that number does not establish that the work was completed or
that later edits still satisfy the conventions. The legacy `.repometa.json`
combined facts that native manifests, Git, and shared tools already own.

## Decision

Publish current conventions and decision criteria as agent-consumable content.
The agent inspects the actual project, selects the relevant conventions, adapts
the project to them, preserves justified customizations, updates the affected
documentation, and validates the result with the project's own checks. The
[skill](../../skills/project-infra/SKILL.md) owns that workflow; its references
own the conventions.

The current instructions stand on their own for new and existing projects.
Routine alignment does not replay numbered migrations. Apply a default unless a
concrete project requirement justifies a difference; existing configuration
alone is not an exemption.

Read project facts from native sources: manifests, workspace declarations, Git
remotes, and existing configuration. Do not require `.repometa.json`, a custom
manifest namespace, or a project-infra version integer in consumers. Keep
deliberate exceptions in the project's own configuration or documents.

The conventions are an initial baseline. Refine them in place through reviewed
changes and project trials; no acceptance ceremony is needed for a lint setting.
A change to the direction recorded here still needs a successor record.

## Alternatives considered

- Byte-exact synchronization is inexpensive and predictable for wholly owned
  files, but a poor default for customized project infrastructure.
- An upgraded migration engine could improve recovery, but would preserve the
  metadata and sequencing responsibilities questioned above.
- An unconstrained request to improve a repository would lose the shared
  organization-specific intent. The package states that intent explicitly.
- A custom object in `package.json` or Cargo's `package.metadata` is a suitable
  extension point when a tool needs a project-owned fact. It is not a reason to
  keep facts that are unnecessary or already owned elsewhere.

## Consequences

The agent needs judgment, so identical inputs do not guarantee identical patches
across models or runs. Native checks and review remain necessary. There is no
cheap organization-wide compliance verdict from a version comparison.

Deterministic tools remain appropriate for concrete operations such as
formatting, configuration validation, and document generation. The agent does
not take ownership of another tool's generated output.

Native evidence is not always complete. Multiple remotes, custom forge domains,
unusual layouts, or conflicting instructions require interpretation; the agent
surfaces an unresolved choice instead of manufacturing metadata or guessing a
destructive change.

Legacy consumers keep their metadata and ownership rules until an explicit
migration. Some defaults will need correction after adoption; a first iteration
is allowed to reveal that a simpler or more compatible default works better.

## References

- [Current conventions](../conventions/README.md)
- [Adoption and tool ownership](../rfcs/0002-adoption-and-tool-ownership.md)
- [Cargo metadata](https://doc.rust-lang.org/cargo/reference/manifest.html#the-metadata-table)
