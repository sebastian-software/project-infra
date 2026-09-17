# Project infrastructure standards

The standards live in the installable skill. Each reference explains its defaults,
applicability, technical reasons, and verification path. Edit those files directly
when refining a standard.

| Area                           | Read                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| Every project                  | [Common workflow and tool ownership](../../skills/project-infra/references/common.md) |
| JavaScript and TypeScript      | [Node.js and TypeScript](../../skills/project-infra/references/node.md)               |
| Rust                           | [Rust](../../skills/project-infra/references/rust.md)                                 |
| Automation and distribution    | [CI and releases](../../skills/project-infra/references/ci-and-releases.md)           |
| Contributor and agent guidance | [Documentation](../../skills/project-infra/references/documentation.md)               |
| Retiring the standards CLI     | [Standards CLI migration](../../skills/project-infra/references/migration.md)         |

The references link to configuration excerpts under
[`assets/`](../../skills/project-infra/assets/); each excerpt shows the shape of
a setting, not a complete project.

The [skill](../../skills/project-infra/SKILL.md) explains scope selection and
handling justified differences. See [installation and use](../installation.md)
to apply the guidance, or [contributing](../../CONTRIBUTING.md) to improve it.
