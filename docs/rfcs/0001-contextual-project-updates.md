# RFC-0001: Contextual project updates

- Status: resolved
- Date: 2026-09-16
- Decisions: [ADR-0002](../adr/0002-reconcile-current-project-state.md),
  [ADR-0009](../adr/0009-distribute-a-self-contained-agent-skill.md)

## Problem

A useful shared convention must survive different project structures and local
customizations. Copying a reference workflow over a repository's CI can remove
deployment behavior; detecting a manifest inside a fixture can introduce
irrelevant tooling.

## Resolution

The [skill](../../skills/project-infra/SKILL.md) owns the implemented workflow:
select applicable profiles, reconcile defaults with project requirements, update
the affected documentation, and verify the result. It supports both scoped
updates and review-only requests. [ADR-0002](../adr/0002-reconcile-current-project-state.md)
owns the current-state approach; [ADR-0009](../adr/0009-distribute-a-self-contained-agent-skill.md)
selects the package that delivers it.

Use the [installation guide](../installation.md) for app-specific invocation.
Refine the skill and its references directly when project trials reveal gaps.

## Useful review scenarios

- An established check command can stay when it provides the complete,
  documented gate. Renaming alone adds churn.
- A Rust workspace with Node bindings needs both applicable profiles, scoped
  to the actual packages.
- Updating a CI check must preserve custom deployment dependencies and required
  check names.
- A generated README needs changes to its authored input and regeneration.
- An aligned project can finish without a diff.

These are inputs to [instruction review](0005-authoring-and-review.md), not
golden-output tests. [Gradual adoption](0004-migration-and-ecosystem.md) remains
the place to discuss cross-repository rollout.
