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

## Scaffold a repository

Every repository carries the same contributor surface: the files GitHub reads to
route a report, and the files Git and an editor read before any project tooling
runs. The set lives in one flat directory under
[`assets/scaffolding/`](../assets/scaffolding/); the table gives the path each
file takes in the repository.

| Destination                                                                                              | Owns                                                                                                         |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [`SECURITY.md`](../assets/scaffolding/SECURITY.md)                                                       | The private reporting routes, the response times maintainers commit to, and what counts as in scope          |
| [`SUPPORT.md`](../assets/scaffolding/SUPPORT.md)                                                         | Which channel a usage question, a defect, and a vulnerability each belong in                                 |
| [`CODE_OF_CONDUCT.md`](../assets/scaffolding/CODE_OF_CONDUCT.md)                                         | Expected behavior, and a reporting address that still works when the report concerns a maintainer            |
| [`.github/CODEOWNERS`](../assets/scaffolding/CODEOWNERS)                                                 | The default reviewer for every path, with the last-match-wins rule stated where the next pattern gets added  |
| [`.github/ISSUE_TEMPLATE/bug_report.yml`](../assets/scaffolding/ISSUE_TEMPLATE/bug_report.yml)           | The environment, reproduction, and expected-versus-actual fields that make a defect actionable               |
| [`.github/ISSUE_TEMPLATE/feature_request.yml`](../assets/scaffolding/ISSUE_TEMPLATE/feature_request.yml) | The problem behind a request, asked before its proposed solution                                             |
| [`.github/ISSUE_TEMPLATE/question.yml`](../assets/scaffolding/ISSUE_TEMPLATE/question.yml)               | A question carrying the version, the command, and the documentation page involved                            |
| [`.github/ISSUE_TEMPLATE/performance.yml`](../assets/scaffolding/ISSUE_TEMPLATE/performance.yml)         | Optional: the fixture, same-host measurements, and limitations a performance claim needs                     |
| [`.github/ISSUE_TEMPLATE/config.yml`](../assets/scaffolding/ISSUE_TEMPLATE/config.yml)                   | Closing the blank-issue route and offering both security reporting channels                                  |
| [`.github/pull_request_template.md`](../assets/scaffolding/pull_request_template.md)                     | Summary, changes, validation, and the issue the change closes                                                |
| [`.gitattributes`](../assets/scaffolding/.gitattributes)                                                 | Line-ending normalization, including the rule the [README check](#generate-shared-readme-content) depends on |
| [`.editorconfig`](../assets/scaffolding/.editorconfig)                                                   | Encoding, line endings, and trailing whitespace for an editor that acts before the project's formatter       |
| [`.github/FUNDING.yml`](../assets/scaffolding/FUNDING.yml)                                               | The sponsor button; delete the file where sponsorship does not apply                                         |

Unlike the configuration excerpts, these files are not shapes to adapt. Copy
each one unchanged except where the project itself has to appear in it:

- `config.yml` needs the repository name substituted into both security URLs.
- The **Validation** list in the pull-request template becomes the project's own
  gate commands, so a reviewer can see which of them ran.
- `SECURITY.md`'s **Scope** section names the artifacts the product ships where
  the general wording is too vague to act on.

Keeping the rest identical means a contributor who moves between projects reads
one policy instead of reconstructing each variant, and a correction reaches every
repository through the same file. When a project needs a different rule, change
the shared file rather than the copy, or state the reason next to the file that
differs.

Verify the result in the repository's **New issue** view: each form renders, the
blank-issue route is gone, both security links resolve, and each form applies its
label.

## Create the labels the issue forms apply

A form that names a label the repository does not have applies nothing and
reports no error, so create these labels with the repository rather than after
the first mislabeled issue.

| Label              | Applied by                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `type:bug`         | `bug_report.yml`                                                                                                 |
| `type:feature`     | `feature_request.yml`                                                                                            |
| `type:question`    | `question.yml`                                                                                                   |
| `type:performance` | `performance.yml`, where the repository uses it                                                                  |
| `dependencies`     | The dependency updater rather than a form, under the [shared policy](ci-and-releases.md#share-dependency-policy) |

The shared `type:` prefix keeps one triage filter working in every repository and
leaves the unprefixed namespace free for a project's own topic labels; add those
alongside. `dependencies` separates automated updates from work a person filed.
Renaming a label above breaks the form that names it, without any warning.

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
The [AGENTS.md excerpt](../assets/common/AGENTS.template.md) shows that shape.

When Claude integration is used, keep `CLAUDE.md` as a small pointer through its
supported import mechanism. Use the corresponding mechanism for other apps.
One source of instructions reduces conflicts between human and agent workflows.

Document the project's Git hooks and their one-time enable command with the
other setup steps; their shape is owned by the
[common workflow](common.md#provide-one-local-verification-path). Run
long-running agent updates as separate, explicit tasks so ordinary development
does not depend on an agent session.

## Keep decisions and task guides easy to find

For new projects, use indexed Markdown ADRs under `docs/adr/`. Follow an existing
project's declared decision lifecycle when updating its records.

Use plain Markdown while it serves the reader. When a product needs a
searchable documentation website, use [Ardo](https://github.com/sebastian-software/ardo).
Add the site for a reader need, not merely because several contributor documents
exist.
