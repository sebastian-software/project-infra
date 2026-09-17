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
branding. Keep the authored content in `README.md.src`, the theme selection in
`mdtheme.yaml`, and the generated `README.md` committed, because readers and
package registries see the rendered file. Select each shared theme by commit: a
moving branch changes the output on a commit that did not touch the project, so
the check fails without a project change.

Pin the CLI in `mise.toml` and commit its lockfile, as described under
[tool selection](common.md#keep-tool-selection-in-the-project), and expose the
generator through mise tasks so a Rust, Node, or mixed repository uses the same
commands:

| Command                    | Purpose                                                           |
| -------------------------- | ----------------------------------------------------------------- |
| `mise run readme:write`    | Regenerate `README.md` after editing the source or moving a theme |
| `mise run readme:check`    | The gate command; it reports drift without writing                |
| `mise run readme:pre-push` | Optional local hook that blocks a push on a stale README          |

Keep the task as the single implementation so a local run, a Git hook, and CI
execute the same pinned binary. In CI, install the tool from the lockfile and
run `mise run readme:check` in a job of its own, as in the
[workflow excerpt](../assets/ci/check.yml); that keeps the language jobs free of
a toolchain they do not otherwise need. A Node project can offer matching
`package.json` scripts that call the same tasks, as in the
[package scripts](../assets/node/package.json), so the two entry points cannot
disagree.

Give `/README.md` and `/README.md.src` a `text eol=lf` rule in `.gitattributes`.
The check compares bytes, so without it a Windows checkout reports drift in
files nobody edited.

Separating the authored source from the generated file keeps project content
independent of reusable presentation and stops manual README edits from being
lost on the next run. Keep rendering and branding policy with mdtheme and its
theme; reference their documentation instead of restating its configuration
schema here.

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
