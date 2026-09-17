# Contributing

This repository contains an Agent Skill, its standards, and design records.
Read the [ADR index](docs/adr/README.md) for constraints and the
[RFC index](docs/rfcs/README.md) for unresolved implementation questions.
Contributions are covered by the [dual license](#license) described below.

## Improve a standard

The [skill references](docs/conventions/README.md) own the current defaults.
Refine them in place when project trials reveal a better choice. Explain the
technical reason, applicability, and verification path; retain concrete
exceptions and link to shared tools instead of copying their policy catalogs.
Write the supported path. Do not justify a choice by listing projects that used
it, or preserve retired tools as competing recommendations.

Routine convention changes do not need their own ADR. Record a successor ADR
when changing an accepted architectural direction. Keep draft integrations
distinct from the behavior already implemented.

## Change the skill

Edit `skills/project-infra/SKILL.md` for the workflow, its `references/` for
standards, and its `assets/` for configuration excerpts. Keep the entry point
short and load profiles only when applicable. Keep each excerpt minimal, valid
for its native parser, and linked from the reference that explains it.
All relative links in the installed package must resolve within that directory.
Keep installation instructions and design records outside it.

The pinned Skills CLI version appears in the README, this guide, `SKILL.md`, and
the installation guide. Bump every occurrence together and treat the bump as an
installer change.

For a local trial, run the following from a disposable Git repository, replacing
the path with your project-infra checkout:

```sh
npx skills@1.5.26 add /absolute/path/to/project-infra \
  --skill project-infra --agent codex claude-code --yes
```

Inspect the installed files and open that project in the selected apps. Rerun
`add` after editing a local source; local-path installs do not record the source
path needed by the targeted updater. Test the GitHub source before claiming that
remote updates work. For packaging or installer changes, verify a changed-source
update, relative links after a clean clone, and removal. Preserve a separate
skill and local project instructions in the fixture to check update scope.

Use the existing Agent Skills validator or the skill-creator validator when
available. Check frontmatter, links, and discovery, and parse each configuration
excerpt with its native tool; a successful parse does not prove the instructions
make good decisions.

Review an instruction change for whether it is necessary, unambiguous, correctly
scoped, consistent with existing instructions, and located at its source of
truth. Look for conflicts between general defaults and language-specific
requirements, and for duplicates with slightly different wording. Read the
change against concrete scenarios:

- An established check command can stay when it provides the complete,
  documented gate; renaming alone adds churn.
- A Rust workspace with Node bindings needs both profiles, scoped to the actual
  packages.
- Updating a CI check must preserve custom deployment dependencies and required
  check names.
- A generated README needs changes to its authored input and regeneration.
- An aligned project can finish without a diff.

When a real run fails, identify whether the cause is unclear content, incorrect
detection, an installer problem, or an agent error, and rewrite or remove the
relevant instruction. Do not append an exception to the skill for every isolated
incident.

## Write and review a record

- Use US English and concrete project terminology.
- Give each durable decision one numbered ADR under `docs/adr/`. ADRs describe
  what project-infra is and how it is distributed and maintained; they link to
  the skill instead of restating its conventions.
- Use a numbered RFC under `docs/rfcs/` for an implementation proposal with open
  questions. Draft examples must be labeled as proposals, not working interfaces.
- Keep rationale in ADRs and implementation details in their owning RFC or,
  later, code and configuration. Link between them instead of copying rules.
- Update the relevant index when adding or changing a record's status.

ADR statuses are `proposed`, `accepted`, `rejected`, `deprecated`, and
`superseded`. Accepted ADRs preserve the decision as made. Correct typos or broken
links in place; use a successor ADR for a semantic change and link both records.

RFCs begin as `draft` and can evolve during discussion. When a proposal is
resolved, record the decision in an ADR and remove the RFC, or mark it `resolved`
while other records still link to it. A draft RFC is not authorization to
implement it, run automation, or migrate other repositories.

## Run the checks

`scripts/check.sh` is the complete gate for the working tree. CI runs the same
script, so a failure reproduces locally without reading the workflow. It needs
Node.js 22.20.0 or newer and Python 3.11 or newer, and it writes nothing:

```sh
./scripts/check.sh
```

| Step                     | Covers                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `oxfmt --check`          | Formatting, and a parse of every Markdown, JSON, YAML, and TypeScript file                                             |
| `scripts/check-docs.mjs` | Relative links and heading anchors, links that would leave the installed package, and the skill's required frontmatter |
| `tomllib`                | The TOML configuration excerpts, which oxfmt does not parse                                                            |
| `sh -n`                  | The shell configuration excerpts                                                                                       |

Run `npx oxfmt@0.68.0 .` to apply formatting. Keep the gate fast and read-only.
Add a check when a concrete defect justifies maintaining it; the skill needs no
build, and an agent benchmark suite is explicitly out of scope.

## Review documentation changes

The gate cannot tell whether an instruction is correct. Before committing, also:

1. Check that the text follows accepted decisions and keeps open choices open.
2. Read the changed document from its intended entry point, without relying on
   the discussion that produced it.
3. Check examples, dates, and index entries.
4. Run `git diff --check` after staging new files or changing tracked files.
5. State which checks ran and identify examples that have not been executed.

## Commit and release

Write every commit and pull request title as a
[Conventional Commit](https://www.conventionalcommits.org/en/v1.0.0/). The
repository squash merges, so the title becomes the commit on `main` that
[Release Please](docs/adr/0008-release-the-skill-with-release-please-and-no-publishing-step.md)
reads. A CI check rejects a title it cannot parse; it runs outside
`scripts/check.sh` because the title is not part of the working tree.

The version describes the installed package, not the repository. Choose the type
from the paths the change touches:

| Change                                                               | Type                                                   | Releases |
| -------------------------------------------------------------------- | ------------------------------------------------------ | -------- |
| Anything under `skills/project-infra/`, including the Skills CLI pin | `feat` for new or changed guidance, `fix` for a defect | yes      |
| ADRs, RFCs, README, installation guide, this guide                   | `docs`                                                 | no       |
| Workflows, `scripts/`, release configuration                         | `ci`                                                   | no       |
| Housekeeping, restructuring, reverts                                 | `chore`, `refactor`, `revert`                          | no       |

Mark a change that consumers must act on with `!` or a `BREAKING CHANGE:`
footer, and say in the body what a consuming project has to do. While the
version stays below `1.0.0`, such a change raises the minor version rather than
the major one. Nothing in the gate compares the type against the diff, so check
that pairing in review: a skill change labeled `docs` withholds a release a
consumer should see.

Release Please opens a release pull request once releasable commits land on
`main`. Review the version, `CHANGELOG.md`, and `version.txt` in that pull
request and merge it to create the tag and the GitHub Release. Merging it is the
whole release; nothing is published to a registry, and
[`.release-please-manifest.json`](.release-please-manifest.json) records the
released version.

After the first generated release pull request is merged, drop `bootstrap-sha`
from [`release-please-config.json`](release-please-config.json). Release Please
ignores it from then on, and removing it keeps the configuration honest.

## License

This project is dual licensed under the [Apache License 2.0](LICENSE-APACHE) and
the [MIT license](LICENSE-MIT). A user may choose either.

Unless you state otherwise, any contribution you intentionally submit for
inclusion in this project is licensed under those same terms, with no additional
conditions.
