# project-infra

**A project-local skill for maintaining Sebastian Software project infrastructure.**

Ask your agent to bring tooling, CI, releases, and contributor documentation up
to date. The skill supplies the [shared conventions](docs/conventions/README.md);
the agent adapts them to the project's structure and compatibility requirements.

## Install and use

From the consuming repository's root, with Git and Node.js 22.20.0 or newer:

```sh
npx skills@1.5.26 add sebastian-software/project-infra \
  --skill project-infra --agent codex claude-code --yes
```

Choose the apps you use in `--agent`. Commit the installed skill, app links, and
`skills-lock.json` so the same instructions travel with every clone. Then open a
fresh agent session in that project:

**Codex**

```text
Use $project-infra to bring this project up to date. Update the affected
documentation and verify the changes.
```

**Claude Code**

```text
/project-infra Bring this project up to date. Update the affected documentation
and verify the changes.
```

The first version is ready for project trials. Review the resulting diff and
native checks. Installing or updating the instructions does not apply them.

See the [installation guide](docs/installation.md) for updates, committed files,
app discovery, customization, and removal.

## Read and contribute

| Task                                           | Read                                                |
| ---------------------------------------------- | --------------------------------------------------- |
| Understand the workflow                        | [Skill instructions](skills/project-infra/SKILL.md) |
| Inspect the supported defaults                 | [Current standards](docs/conventions/README.md)     |
| Understand architectural choices               | [ADRs](docs/adr/README.md)                          |
| Explore open design questions, including hooks | [RFCs](docs/rfcs/README.md)                         |
| Improve the skill or documentation             | [Contributing](CONTRIBUTING.md)                     |

Run `./scripts/check.sh` before proposing a change.

## License

Licensed under either the [Apache License 2.0](LICENSE-APACHE) or the
[MIT license](LICENSE-MIT), at your option. The installed skill carries the same
`MIT OR Apache-2.0` choice in its frontmatter.
