# RFC-0005: Authoring and reviewing the instructions

- Status: draft
- Date: 2026-09-16
- Decisions: [ADR-0006](../adr/0006-prioritize-instruction-quality.md),
  [ADR-0007](../adr/0007-make-documentation-part-of-the-product.md)

## Problem

The most important package defect may be an unclear or contradictory instruction.
A technically valid skill can still tell an agent to apply an irrelevant rule,
erase a deliberate customization, or follow two competing sources of truth.

The review process should improve instructions without becoming another large
framework to maintain.

## Proposed authoring approach

Begin with a few concrete project needs and the organization-specific reasons
behind them. Keep the core skill short. Load common, Node.js, Rust, or other
references only when they are relevant.

For a convention, make the following understandable in ordinary prose:

- its purpose and the failure or friction it addresses;
- the project area where it applies;
- whether it is a requirement or a recommended default;
- the existing source that owns the relevant fact;
- what counts as an equivalent customization;
- how the resulting behavior can be inspected or checked.

These are review questions, not six mandatory fields for every paragraph.
Avoid inventing a rule schema simply to make the documentation uniform.

Common guidance should have one owner. Language-specific references add only
their actual differences. App integrations should link to the same conventions
instead of maintaining another policy copy in each native format.

## Review a proposed instruction change

Ask whether the change is necessary, unambiguous, correctly scoped, consistent
with existing instructions, and located at the right source of truth. Look for
conflicts between general defaults and language-specific requirements, as well
as duplicates that use slightly different wording.

Read concrete examples where the rule should and should not apply. A reviewer
with fresh context is useful because it cannot fill gaps from the author's
conversation. An agent reviewer should cite the conflicting passages and show
the consequence; unsupported claims that the skill is "clean" are not evidence.

When a real run fails, first identify whether the cause is unclear content,
incorrect detection, an installer problem, or an agent error. Rewrite or remove
the relevant instruction where appropriate. Do not append a new exception to
the core skill for every isolated incident.

## Mechanical checks worth adding when needed

- Validate skill metadata when it changes.
- Check local references and links.
- Validate structured examples with their native parser or tool.
- Exercise helper scripts against their concrete contracts if scripts exist.
- Review generated app configuration with the appropriate app-specific checks
  when integrations are introduced.

Reuse existing tools. Do not add a package manifest, build framework, or CI
service solely to create the appearance of a tested skill. Semantic conflict
detection will remain a review task even if mechanical checks are automated.

## Optional project trials

For substantial changes, try the instructions on a relevant project copy and
inspect the actual diff and native checks. The scenarios in
[RFC-0001](0001-contextual-project-updates.md) provide starting points.

A second invocation can reveal unnecessary churn. A deliberately customized
project can reveal overly strict reference copying. An incomplete build can
reveal whether the result is reported honestly. Those observations are useful
without requiring every skill edit to launch a fleet of agents.

If a focused trial becomes repeatable, isolate its input and independently
inspect the result. Record enough context to interpret it, such as the package
revision, app, model, and checks performed. Do not treat a single successful run
as a guarantee across model updates.

## Earlier proposal retained for context

The discussion considered an evaluation runner using temporary repositories and
`codex exec`, with stored patches, native check results, runtime and token counts,
old/new skill comparisons, repeated runs, and independently held expectations.

That was judged too much as the initial quality strategy. Golden patches and a
broad model matrix would be especially expensive to maintain as agents evolve.
Revisit only the smallest useful part if repeated failures make a concrete case
for it. This RFC does not commit the project to that runner.

## Open questions

1. Is a short contribution checklist enough for the first package revision?
2. Which existing validator fits the selected package format?
3. When should a content change receive a real-project trial?
4. Which failures, if any, recur often enough to justify focused regression checks?
5. How can review findings simplify the instructions instead of continually
   increasing their size?
