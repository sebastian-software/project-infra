# Documentation and agent guidance

Applies to every project. Generated README conventions apply when shared branding
or generated sections are useful; a documentation website remains optional.

## Make the first successful action easy

**Default:** write technical and contributor documentation in US English. An
established audience or localization requirement can justify another language;
Relanto's German prose policy is one observed example. Preserve externally
defined names and wire-format literals even when their spelling differs.

Give readers a short path through the documentation:

| Document     | Owns                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------- |
| README       | What the project does, current maturity, prerequisites, first useful command, and links onward |
| CONTRIBUTING | Setup from a clean checkout, local checks, generated-file workflow, and how to contribute      |
| Task guide   | A concrete operation such as publishing, updating a tool, or recovering from a failure         |
| ADR          | The reason for a durable project decision                                                      |
| AGENTS.md    | Concise repository instructions and pointers to the same human-readable guides                 |

Do not make a contributor read the project's history to find the check command.
Update the affected guide in the same change as a command or workflow. Clearly
label proposed interfaces and unavailable features; a copied template README is
not evidence that its documented feature exists.

Evidence: [harness-relay contribution guide](https://github.com/sebastian-software/harness-relay/blob/fbc04ab1bd762c0050b97f29f07def0eb0f87773/CONTRIBUTING.md),
[wire-format spelling exception](https://github.com/sebastian-software/harness-relay/blob/fbc04ab1bd762c0050b97f29f07def0eb0f87773/AGENTS.md),
[Relanto language policy](https://github.com/sebastian-software/relanto/blob/30607a34e1a344c59ecfdc7d8a1ed734cd74466e/AGENTS.md).

## Give generated README content one owner

**Default for shared README branding:** mdtheme owns rendering; keep authored
content in `README.md.src`, rendering inputs in `mdtheme.yaml`, and the generated
`README.md` committed. Use the shared Sebastian Software theme where the project
uses organization branding. Keep theme configuration and project content
separate, and select the theme revision explicitly.

Do not hand-edit generated output. Offer `readme:write` and `readme:check`, with
the project-selected CLI and lockfile described in [tool selection](common.md#keep-tool-selection-in-the-project).
Pin the CLI version and theme revision independently. The check must detect
drift; contributors need a documented regeneration command.

This structure appears in 22 of the 28 public source snapshots. Many received
it in the same rollout, so the count demonstrates shared adoption rather than
22 independent design decisions.

Evidence: [template README configuration](https://github.com/sebastian-software/repo-template/blob/9b862953d9d6dbe7bd940bef1d1f06bd4a0e1714/mdtheme.yaml),
[template tool tasks](https://github.com/sebastian-software/repo-template/blob/9b862953d9d6dbe7bd940bef1d1f06bd4a0e1714/mise.toml),
[Dalo README configuration](https://github.com/sebastian-software/dalo/blob/4fdef503716b16fb911767a252daca0e38b67adf/mdtheme.yaml),
[mdtheme authoring guide](https://github.com/sebastian-software/mdtheme/blob/cfae631c2387b8460ebe5e7bd92556d17ac80dd7/README.md).

Keep branding and rendering policy with mdtheme and the theme. Reuse the
Ferramenta registry where a project family needs shared facts. project-infra
defines when and how those owners integrate; it should not become another copy
of their content or configuration schema.

## Keep agent integrations thin

**Default:** maintain a concise root `AGENTS.md`; add scoped instructions only
when a subproject needs different guidance. State the actual gate, important
source/generated boundaries, and product constraints that affect edits. Link to
the contribution guide and relevant decisions rather than duplicating them.

When Claude integration is used, keep `CLAUDE.md` as a small pointer using its
supported import mechanism. Other apps should read or reference the same
content through their supported mechanism. Do not create every possible app
file in every repository or assume all apps support the same imports.

Evidence: [harness-relay agent guidance](https://github.com/sebastian-software/harness-relay/blob/fbc04ab1bd762c0050b97f29f07def0eb0f87773/AGENTS.md),
[Claude pointer](https://github.com/sebastian-software/harness-relay/blob/fbc04ab1bd762c0050b97f29f07def0eb0f87773/CLAUDE.md).

Keep local hooks fast and predictable. Document their installation, prerequisites,
and whether they write files. A mise task does not mean a Git hook is installed.
mdtheme's pre-push command can regenerate content and require another commit;
it must not be described as a purely read-only check. A long-running agent update
belongs to the [separate optional hook design](../rfcs/0003-optional-hooks-and-automation.md).

## Keep decisions discoverable without imposing a website

For new projects, use Markdown ADRs with an index under `docs/adr/`. Preserve an
existing indexed decision structure and its declared lifecycle. Some consumers
use living ADRs; others use immutable records or MDX routes in an Ardo site.
Discover those rules before editing a decision.

Use plain Markdown until a website solves a reader need. When a product needs a
documentation site, Ardo is the organization default to evaluate first; existing
static sites and framework-specific docs are valid where they fit. Do not add
a framework merely to display several contributor documents.

Evidence: [Ferrolex decision lifecycle](https://github.com/sebastian-software/ferrolex/blob/e5850998d654ff8fd1b15d061fd95bf4bfc1da9c/AGENTS.md),
[Ferrocat documentation structure](https://github.com/sebastian-software/ferrocat/blob/28a51a638724c57f1f9e08284e88fb6a26c42f09/AGENTS.md),
[Ferrocat docs package](https://github.com/sebastian-software/ferrocat/blob/28a51a638724c57f1f9e08284e88fb6a26c42f09/docs/package.json),
[Dalo static site](https://github.com/sebastian-software/dalo/blob/4fdef503716b16fb911767a252daca0e38b67adf/site/package.json).
