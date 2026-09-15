# ADR-0008: Adopt an initial baseline and iterate through project use

- Status: accepted
- Date: 2026-09-16

## Context

A workspace survey found shared infrastructure patterns alongside differences in
tool generations, supported runtimes, and product requirements. Merely listing
those patterns as candidates would leave an agent without a default to apply.

The follow-up decision was to standardize an initial baseline, try it in
projects, and improve it from the results. Complete agreement across existing
repositories is not a prerequisite for choosing a direction.

## Decision

Publish the current defaults in [the convention pages](../conventions/README.md).
They are the operational reference for project-infra updates and can be refined
in place through ordinary reviewed changes. This does not change the immutable
lifecycle of accepted ADRs: these records preserve architectural decisions;
the convention pages own the evolving implementation guidance.

Apply a default unless a concrete project requirement justifies a difference.
Existing configuration alone is not an exemption. Preserve and explain actual
compatibility contracts, native integration requirements, and deliberate product
decisions. Use local configuration or existing project documents for exceptions.

Evidence informs the defaults without making every observed setting a standard.
Keep source snapshots separate from current guidance. Do not copy shared tools'
rule catalogs, version matrices, or branding data into project-infra.

Try coherent changes in a small number of representative repositories, inspect
the resulting diffs and native checks, and feed failures back into the affected
standard. Publishing this baseline does not implement an installer, certify
existing consumers, or migrate repositories automatically.

## Consequences

Agents have a concrete starting point, including for tool choices that are not
yet universal. Some choices will need correction after adoption; a first
iteration is allowed to reveal that a simpler or more compatible default works
better.

Routine refinements belong in the current conventions. A change to an accepted
architectural direction still needs a successor ADR. No baseline number is
stored in consumers, and no new acceptance ceremony is needed for every lint
setting.

## References

- [Current-state reconciliation](0002-reconcile-current-project-state.md)
- [Instruction quality](0006-prioritize-instruction-quality.md)
- [Workspace evidence and pilot proposal](../rfcs/0006-conventions-from-existing-projects.md)
