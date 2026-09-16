# RFC-0004: Adoption and tool ownership

- Status: draft
- Date: 2026-09-16
- Related decisions: [ADR-0001](../adr/0001-create-project-infra-as-a-separate-project.md),
  [ADR-0004](../adr/0004-use-native-metadata-and-existing-owners.md)

## Problem

Infrastructure updates need clear ownership so agents, shared tools, and
project configuration work together without overwriting each other's changes.
Adoption should produce a small, reviewable change with a useful local workflow.

## Proposed ownership

| Component             | Responsibility                                                   |
| --------------------- | ---------------------------------------------------------------- |
| project-infra         | Infrastructure defaults and instructions for applying them       |
| Shared tool packages  | Their executable rules and compatibility requirements            |
| renovate-config       | Shared dependency-update policy                                  |
| repo-template         | Initial scaffolding based on the same current standards          |
| mdtheme and its theme | README rendering and presentation                                |
| Consumer repository   | Product configuration, compatibility contracts, and local checks |
| Agent app             | Execution context and invocation                                 |

A template supplies a starting point. Keeping an existing project current means
reconciling its actual configuration with the current standards.

## Try one coherent update

1. Select a project and a small applicable part of the standards.
2. Read existing instructions, configuration owners, and in-progress changes.
3. Apply the update and remove replaced configuration after identifying its readers.
4. Update the affected contributor documentation.
5. Run the relevant native checks and inspect changed distribution artifacts.
6. Repeat the instruction once to check for unnecessary churn.
7. Simplify the owning standard where the trial exposes ambiguity or extra work.

Keep the package update and related project adaptations reviewable together.
Preserve deployment behavior, required check names, and consumer compatibility.
If a change fails, be able to revert that coherent change without undoing
unrelated project work.

## Open questions

1. Which project and update make the first useful trial?
2. How should repo-template consume the shared guidance without duplicating it?
3. How should dependency automation update the project-local installation?

## Related proposals

- [Contextual update workflow](0001-contextual-project-updates.md)
- [Distribution and installation](0002-project-scoped-distribution.md)
- [Optional automation](0003-optional-hooks-and-automation.md)
