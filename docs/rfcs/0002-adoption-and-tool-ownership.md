# RFC-0002: Adoption and tool ownership

- Status: draft
- Date: 2026-09-16
- Related decisions: [ADR-0001](../adr/0001-create-project-infra-as-a-separate-repository.md),
  [ADR-0002](../adr/0002-apply-current-conventions-through-an-agent.md)

## Problem

Infrastructure updates need clear ownership so agents, shared tools, and
project configuration work together without overwriting each other's changes.
Adoption should produce a small, reviewable change with a useful local workflow.

## Proposed ownership

| Component             | Responsibility                                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| project-infra         | Infrastructure defaults and the instructions for applying them, configuration excerpts, shared composite actions, and shared task definitions |
| Shared tool packages  | Their executable rules and compatibility requirements, on their own release cadence                                                           |
| renovate-config       | Shared dependency-update policy                                                                                                               |
| repo-template         | Initial scaffolding based on the same current standards                                                                                       |
| mdtheme and its theme | README rendering and presentation                                                                                                             |
| Consumer repository   | Product configuration, compatibility contracts, and local checks                                                                              |
| Agent app             | Execution context and invocation                                                                                                              |

A template supplies a starting point. Keeping an existing project current means
reconciling its actual configuration with the current standards.

## Try one coherent update

Select a project and a small applicable part of the standards. Apply the update
as the skill describes, keep the package update and the related project
adaptations reviewable together, and repeat the instruction once to check for
unnecessary churn. Preserve deployment behavior, required check names, and
consumer compatibility. If a change fails, revert that coherent change without
undoing unrelated project work. Simplify the owning standard where the trial
exposes ambiguity or extra work.

## Open questions

1. Which project and update make the first useful trial?
2. How should repo-template consume the shared guidance without duplicating it?
3. How should dependency automation update the project-local installation?
4. Which repository proves the mise task include before it becomes guidance, and
   which tasks belong in the shared set?
5. In which order do the composite actions move here, given that a consumer's
   publish path must keep working throughout?

## Related proposals

- [Optional hooks and automation](0001-optional-hooks-and-automation.md)
