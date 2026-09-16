# Project infrastructure standards

These standards define the defaults for setting up a project and keeping its
infrastructure current. They aim to reduce maintenance, make checks dependable,
and give contributors a clear local workflow.

Use the applicable profiles. A repository can contain several project areas;
a documentation-only project does not need a language runtime or package build.

| Area                           | Read                                            |
| ------------------------------ | ----------------------------------------------- |
| Every project                  | [Common workflow and tool ownership](common.md) |
| JavaScript and TypeScript      | [Node.js and TypeScript](node.md)               |
| Rust                           | [Rust](rust.md)                                 |
| Automation and distribution    | [CI and releases](ci-and-releases.md)           |
| Contributor and agent guidance | [Documentation](documentation-and-agents.md)    |

## Apply the default, explain necessary differences

Use the default unless a concrete requirement justifies a difference. Preserve
runtime support, public interfaces, and framework requirements. Record the
reason next to the affected configuration or in the project's existing decision
documents. An exception registry is unnecessary.

Each profile explains what to use and the problem it solves. Shared tools own
their rule catalogs and compatibility requirements; project-infra defines how
those tools fit together.

Improve the relevant standard when a real project reveals unnecessary work or
unclear instructions. Routine refinements belong in these pages; architectural
changes belong in [ADRs](../adr/README.md).

The standards are usable as written guidance. Installation and app integration
remain [design proposals](../rfcs/README.md).
