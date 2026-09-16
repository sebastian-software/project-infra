# Documentation and agent guidance

Documentation should help a reader complete the next task without reconstructing
the project's history.

## Give each document a clear job

Write technical and contributor documentation in US English. A product audience
or localization requirement can justify another language. Preserve externally
defined identifiers and protocol literals.

| Document     | Owns                                                                     |
| ------------ | ------------------------------------------------------------------------ |
| README       | Purpose, maturity, prerequisites, first useful command, and links onward |
| CONTRIBUTING | Setup, local checks, generated-file workflow, and contribution steps     |
| Task guide   | A concrete operation such as publishing or recovering from a failure     |
| ADR          | The rationale for a durable decision                                     |
| AGENTS.md    | Concise edit instructions and links to the same contributor guidance     |

Update the affected guide when a command or workflow changes. Label proposed
interfaces and unavailable features clearly. Describe the supported path and
its technical rationale; keep obsolete tools and implementation comparisons out
of the instructions.

## Generate shared README content

Use [mdtheme](https://github.com/sebastian-software/mdtheme) for shared README
branding. Keep authored content in `README.md.src`, rendering inputs in
`mdtheme.yaml`, and the generated `README.md` committed. Select the shared theme
revision explicitly and pin the CLI independently.

Offer `readme:write` and `readme:check` through the project tool setup. Contributors
edit the authored source and regenerate; the check detects drift. This separates
project content from reusable presentation and avoids manual edits being lost.

Keep rendering and branding policy with mdtheme and its theme. Shared project
family facts belong to their registry. Link to those owners rather than copying
their configuration schema or data into project-infra.

## Keep agent integrations thin

Maintain a concise root `AGENTS.md`. Add scoped instructions only when a
subproject needs different guidance. State the actual gate, generated-file
boundaries, and product constraints that affect edits.

When Claude integration is used, keep `CLAUDE.md` as a small pointer through its
supported import mechanism. Use the corresponding mechanism for other apps.
One source of instructions reduces conflicts between human and agent workflows.

Keep local hooks fast and predictable. Document installation, prerequisites,
and whether they write files. Run long-running agent updates as separate,
explicit tasks so ordinary development does not depend on an agent session.

## Keep decisions and task guides easy to find

For new projects, use indexed Markdown ADRs under `docs/adr/`. Follow an existing
project's declared decision lifecycle when updating its records.

Use plain Markdown while it serves the reader. When a product needs a
searchable documentation website, use [Ardo](https://github.com/sebastian-software/ardo).
Add the site for a reader need, not merely because several contributor documents
exist.
