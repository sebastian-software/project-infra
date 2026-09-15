# Project infrastructure standards

These are the **initial defaults for project-infra updates**. Use them when
setting up a project or aligning its infrastructure. They select a common
direction from existing Sebastian Software repositories and will evolve through
real project use, as decided in [ADR-0008](../adr/0008-adopt-an-iterative-standards-baseline.md).

The standards are ready to use as written guidance. An installable skill and
automated enforcement do not exist yet. Existing repositories have not been
migrated by publishing these pages.

The [workspace survey](../rfcs/0006-conventions-from-existing-projects.md) records
the selection, dated source snapshots, important differences, and proposed pilots.
Source links use exact commits so later repository changes do not silently alter
the evidence.

| When this applies                                               | Read                                                            |
| --------------------------------------------------------------- | --------------------------------------------------------------- |
| Any project receiving infrastructure changes                    | [Common workflow and tool ownership](common.md)                 |
| A real JavaScript or TypeScript project area                    | [Node.js and TypeScript](node.md)                               |
| A Rust package or workspace                                     | [Rust](rust.md)                                                 |
| CI, releases, published packages, or dependency updates         | [CI and releases](ci-and-releases.md)                           |
| Documentation, generated README content, and agent instructions | [Documentation and agent guidance](documentation-and-agents.md) |

## How to apply a standard

**Use the default unless a concrete project requirement justifies a difference.**
An existing configuration is evidence to inspect, not an automatic exemption.
Align accidental differences. Preserve a supported runtime, consumer contract,
framework requirement, or documented product constraint when alignment would
break it. Put the reason next to the affected configuration or in the project's
existing decision documents; no exception registry is required.

Use the smallest applicable subset. A Rust CLI with an npm launcher and a website
has several project areas; it does not need a root Node workspace just to fit a
template. Existing checked-in decisions and deliberate compatibility choices
remain inputs to the update.

Each page owns its rules and links to examples that explain the choice. Examples
are evidence, not complete configuration templates to copy. Repeated legacy
managed files are not independent proof that every setting is desirable.

## Defaults at a glance

| Area               | Default                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| Developer workflow | One documented local gate, shared check implementations with CI, explicit project tool versions              |
| Node.js            | pnpm, oxfmt, type-aware `oxlint-config-setup`, strict TypeScript, ESM                                        |
| Rust               | Cargo-native workspace metadata and lints, explicit MSRV, fmt/Clippy/tests, dependency checks                |
| CI and releases    | Pinned actions, bounded jobs, reliable required checks, Release Please for versioned products                |
| Dependencies       | Shared `renovate-config` preset; compatibility-sensitive components update together                          |
| Documentation      | Task-oriented US English by default, mdtheme for shared README branding, short `AGENTS.md` with app pointers |

The profile pages define applicability and exceptions. A Markdown-only repository
does not need a Node runtime, package publication, or a documentation website.
Exact dependency versions and rule lists stay with their native owners.

After a trial, inspect the diff and native checks, then simplify or correct the
affected standard. Change these pages directly for routine refinements. Use an
ADR when the architectural direction changes; do not introduce a consumer
standards version or an acceptance record for every setting.
