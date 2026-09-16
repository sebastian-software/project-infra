# RFC-0001: Contextual project updates

- Status: draft
- Date: 2026-09-16
- Decisions: [ADR-0002](../adr/0002-reconcile-current-project-state.md),
  [ADR-0004](../adr/0004-use-native-metadata-and-existing-owners.md)

## Problem

A useful shared convention must survive different project structures and local
customizations. Copying a reference workflow over a repository's CI can remove
deployment behavior; detecting a `package.json` inside a fixture can introduce
irrelevant tooling. The skill needs enough guidance to make those distinctions
without reproducing an entire configuration management system.

## Proposed user experience

After installing and loading the package, the user asks:

> Use project-infra to bring this project up to date. Preserve intentional
> customizations, update the affected documentation, and verify the changes.

This is an illustrative prompt. App-specific invocation syntax belongs in the
eventual installation guide. The initial repository does not yet contain this
skill.

## Proposed workflow

### 1. Establish the project context

Read the relevant repository instructions, setup docs, manifests, workspace
declarations, CI, release configuration, and existing changes. Identify the
working repository and the installed project-infra content before editing.

Use Git remotes as evidence for the forge. Consider multiple remotes and custom
hosts; a remote's mere presence does not settle every platform-specific choice.

### 2. Select relevant conventions

The [current standards](../conventions/README.md) now supply the initial defaults,
under [ADR-0008](../adr/0008-adopt-an-iterative-standards-baseline.md). Apply them
unless a concrete requirement justifies an exception. The source survey records
evidence separately from the rules an update should follow.

Use capabilities that can coexist, rather than assigning exactly one project
type to the entire repository:

| Area                  | Evidence to inspect                                                  | Examples of relevant infrastructure                                          |
| --------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Common                | Root docs, Git context, CI, contribution workflow                    | Editor settings, repository files, contribution docs                         |
| Node.js               | Actual package manifests, lockfiles, workspace declarations, scripts | Package manager, formatting, linting, type checking, build and test commands |
| Rust                  | Cargo packages and workspaces, toolchain settings, CI                | Formatting, lint levels, MSRV, dependency policy, publishing                 |
| Mixed project         | Workspace boundaries and build relationships                         | Checks scoped to the right project parts, shared root CI                     |
| Release or publishing | Existing release workflows and package metadata                      | Versioning and publishing integration                                        |
| Documentation         | Authored sources, generators, reader tasks                           | Accurate setup and maintenance instructions                                  |

Do not interpret every nested manifest as a managed workspace. Examples,
fixtures, vendored code, and generated sidecars need explicit consideration.
Do not add a language runtime merely because the installation tool happens to
use it; project requirements and installer prerequisites are different facts.

### 3. Compare the observed state with current intent

Classify the relevant differences in a brief explanation: missing capability,
outdated arrangement, equivalent customization, or unresolved conflict. This
classification is a communication aid, not a new required machine schema.

An equivalent customization should satisfy the convention's purpose without
needing to match the reference bytes. When a documented project decision
conflicts with a stated requirement, explain the conflict and follow the
applicable instruction authority. The package must distinguish defaults from
requirements; a universal "last rule wins" order is insufficient.

### 4. Make focused changes

Preserve unrelated working-tree edits and existing project behavior. Adapt
reference configurations to the project. Use the owning generator for generated
output. Remove replaced configuration only after identifying its consumers.

Update the associated setup, command, CI, and release documentation in the same
change. Do not overwrite project-specific explanation with generic boilerplate.

### 5. Verify and report

Discover and run the repository's relevant checks. Report failures, incomplete
checks, and unresolved choices accurately. Do not delete or weaken a check merely
to obtain a passing result.

Report the relevant scope, meaningful changes, preserved exceptions, checks run,
and remaining work. Identify the installed package revision when useful. Leave a
reviewable diff; create or update a PR when the invocation authorizes that action.
Automatic merging is not part of the proposed default.

## Content organization to explore

A small core skill can link to focused common, Node.js, Rust, and documentation
references, plus adaptable assets where concrete examples help. Optional hooks
and app integration live alongside that content through the chosen package
format.

Do not copy every legacy migration into permanent instructions. Extract current
intent, explain why it exists, and retain historical upgrade detail only where a
real legacy transition still needs it.

## Examples worth discussing

- A Node project has the required tests but names the command differently.
  Preserve the command if it fulfills the convention and is discoverable.
- A Rust project has Node bindings in a declared subproject. Apply both sets of
  relevant conventions without introducing Node-only files into each crate.
- CI includes an organization check and a custom deployment job. Updating the
  check must preserve the deployment job's dependencies and required-check names.
- A README is generated by mdtheme. Change the authored input or mdtheme-owned
  configuration and regenerate through that tool.
- An already aligned project needs no diff. Cosmetic churn is not an update.

These are review scenarios, not a commitment to build an agent benchmark suite.

## Open questions

1. Does the first pilot reveal missing applicability or exception guidance in
   the selected standards?
2. How much uncertainty can a run resolve from the repository before it needs
   maintainer input?
3. Is a separate audit-only invocation useful, or is one task with an explicit
   requested outcome sufficient?

## Related proposals

- [Project-scoped installation](0002-project-scoped-distribution.md)
- [Gradual adoption](0004-migration-and-ecosystem.md)
- [Instruction authoring and review](0005-authoring-and-review.md)
