# RFC-0006: Apply workspace conventions in the first pilots

- Status: draft
- Date: 2026-09-16
- Decision: [ADR-0008](../adr/0008-adopt-an-iterative-standards-baseline.md)

## Outcome of the survey

The workspace now supplies a concrete [initial standards baseline](../conventions/README.md).
Those defaults are selected for use; this RFC preserves their source evidence
and proposes how to try them. The remaining pilot questions do not suspend the
defaults or turn every setting back into an undecided candidate.

The survey supports a small common layer with composable Node.js, Rust, CI,
release, and documentation guidance. Shared packages retain ownership of their
rules. project-infra owns the choice of integration and the instructions for
adapting it to the project.

## What was inspected

On September 16, 2026, the survey inventoried 98 immediate Git checkouts under
`~/Workspace`. Of those, 89 pointed to Sebastian Software repositories,
representing 87 distinct repositories. Duplicate local clones were counted once
when selecting evidence. Nested archives, dependency directories, and vendored
trees were not treated as additional organization projects.

Recent commit activity helped select projects, but many newest commits came from
the same README and branding rollout. The detailed sample therefore combines
recent products with shared infrastructure, templates, native bindings, package
publishers, and documentation-only repositories.

The public evidence consists of the 28 snapshots below. Three additional private
application repositories were inspected as a cross-check; their names and
internal configuration are intentionally absent from this public record.

Each snapshot is the local committed `HEAD` at inspection time. All 28 commits
were verified to exist on GitHub. Ferroni, Ferriki, and Ferralk had different
remote default-branch heads at that check, so these are dated local observations,
not a claim to cover every latest upstream change. Uncommitted changes in
repo-template, harness-relay, and Ferrovia were excluded from the baseline.

### Source snapshots

| Repository                                                                                           | Committed snapshot                                                                                                                | Evidence area                                      |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [dalo](https://github.com/sebastian-software/dalo)                                                   | [4fdef50371](https://github.com/sebastian-software/dalo/commit/4fdef503716b16fb911767a252daca0e38b67adf)                          | Rust CLI, npm launcher, static site                |
| [ferromark](https://github.com/sebastian-software/ferromark)                                         | [dea1201981](https://github.com/sebastian-software/ferromark/commit/dea120198145497cf4e1bec88b2d865cc050b7c3)                     | Rust workspace, native npm packages, homepage      |
| [ferrolex](https://github.com/sebastian-software/ferrolex)                                           | [e5850998d6](https://github.com/sebastian-software/ferrolex/commit/e5850998d654ff8fd1b15d061fd95bf4bfc1da9c)                      | Rust workspace, task recipes, extended checks      |
| [ferrocat](https://github.com/sebastian-software/ferrocat)                                           | [28a51a6387](https://github.com/sebastian-software/ferrocat/commit/28a51a638724c57f1f9e08284e88fb6a26c42f09)                      | Rust libraries and CLI, documentation site         |
| [ferroni](https://github.com/sebastian-software/ferroni)                                             | [7eedb09359](https://github.com/sebastian-software/ferroni/commit/7eedb09359df144eb8c0a4ea3195e7636bd44910)                       | Rust port, documentation site                      |
| [ferrugo](https://github.com/sebastian-software/ferrugo)                                             | [445227a1d3](https://github.com/sebastian-software/ferrugo/commit/445227a1d3a9d0a7bbe1491240b2839886f3dcbd)                       | Rust workspace, native and WebAssembly components  |
| [ferriki](https://github.com/sebastian-software/ferriki)                                             | [1e859b3513](https://github.com/sebastian-software/ferriki/commit/1e859b35133e64ec7179867d191d6a5ce808c7d5)                       | Rust and Node package integration                  |
| [ferralk](https://github.com/sebastian-software/ferralk)                                             | [ddfabcbb42](https://github.com/sebastian-software/ferralk/commit/ddfabcbb421bdbdd8cbc4a73a9232b1a0102edd4)                       | Rust library, concurrency and compatibility checks |
| [mdtheme](https://github.com/sebastian-software/mdtheme)                                             | [cfae631c23](https://github.com/sebastian-software/mdtheme/commit/cfae631c2387b8460ebe5e7bd92556d17ac80dd7)                       | Rust CLI, README rendering, release artifacts      |
| [hbci4rust](https://github.com/sebastian-software/hbci4rust)                                         | [cb4d8ff658](https://github.com/sebastian-software/hbci4rust/commit/cb4d8ff65853725af7bec351312b831e0433e397)                     | Rust library scaffold                              |
| [palamedes](https://github.com/sebastian-software/palamedes)                                         | [29d30ce85d](https://github.com/sebastian-software/palamedes/commit/29d30ce85d49087cdef37f05c0554c76c1d6402c)                     | Node and Rust workspace, native packages           |
| [ferrovia](https://github.com/sebastian-software/ferrovia)                                           | [6acfa734c1](https://github.com/sebastian-software/ferrovia/commit/6acfa734c1884a3e0deb4d2494147ac96d1c3897)                      | Rust and Node workspace                            |
| [ardo](https://github.com/sebastian-software/ardo)                                                   | [2a7b43a5bc](https://github.com/sebastian-software/ardo/commit/2a7b43a5bcddaba285ec5cbbf62b9c4183f4d963)                          | Node workspace, documentation framework            |
| [repo-template](https://github.com/sebastian-software/repo-template)                                 | [9b862953d9](https://github.com/sebastian-software/repo-template/commit/9b862953d9d6dbe7bd940bef1d1f06bd4a0e1714)                 | Shared Node project starter                        |
| [harness-relay](https://github.com/sebastian-software/harness-relay)                                 | [fbc04ab1bd](https://github.com/sebastian-software/harness-relay/commit/fbc04ab1bd762c0050b97f29f07def0eb0f87773)                 | Node CLI and library, native test runner           |
| [xlsx-format](https://github.com/sebastian-software/xlsx-format)                                     | [baf4978421](https://github.com/sebastian-software/xlsx-format/commit/baf4978421a441fa8034527c5737a491930d7344)                   | TypeScript library, package export checks          |
| [ferramenta](https://github.com/sebastian-software/ferramenta)                                       | [6351af77d0](https://github.com/sebastian-software/ferramenta/commit/6351af77d033b7a9d80ad0f6478b583626fba5ea)                    | Shared family data, Git and npm packages           |
| [relanto](https://github.com/sebastian-software/relanto)                                             | [30607a34e1](https://github.com/sebastian-software/relanto/commit/30607a34e1a344c59ecfdc7d8a1ed734cd74466e)                       | TypeScript project with audience-specific docs     |
| [lexios](https://github.com/sebastian-software/lexios)                                               | [05bd6edb5e](https://github.com/sebastian-software/lexios/commit/05bd6edb5eda0df05cd6ed7b7dd1638f23b19cc3)                        | Documentation site                                 |
| [oxlint-config-setup](https://github.com/sebastian-software/oxlint-config-setup)                     | [31f09d7075](https://github.com/sebastian-software/oxlint-config-setup/commit/31f09d70759f0928ca586838b521f6810c0e5d16)           | Shared lint presets and compatibility checks       |
| [skills.sebastian-software.com](https://github.com/sebastian-software/skills.sebastian-software.com) | [f4300bb69f](https://github.com/sebastian-software/skills.sebastian-software.com/commit/f4300bb69f4999b4408b0976b9118fdf7d388026) | Skill catalog and website                          |
| [sebastian-theme](https://github.com/sebastian-software/sebastian-theme)                             | [39b0432a95](https://github.com/sebastian-software/sebastian-theme/commit/39b0432a958c23fbd4b6ae8a263ab07178a7150f)               | Shared README theme, Git package                   |
| [renovate-config](https://github.com/sebastian-software/renovate-config)                             | [4737b50bc0](https://github.com/sebastian-software/renovate-config/commit/4737b50bc049c3c0d1c9f80d12beef06fd1e0a06)               | Shared dependency-update policy                    |
| [standards](https://github.com/sebastian-software/standards)                                         | [09db5e91d5](https://github.com/sebastian-software/standards/commit/09db5e91d5c813d4e5800366fad791b56486cb7f)                     | Legacy managed repository infrastructure           |
| [homebrew-tap](https://github.com/sebastian-software/homebrew-tap)                                   | [4705f32336](https://github.com/sebastian-software/homebrew-tap/commit/4705f32336b2e74d8be7d0e8914c0989cef6d29f)                  | Formula validation and distribution                |
| [effective-flow](https://github.com/sebastian-software/effective-flow)                               | [3237fc5239](https://github.com/sebastian-software/effective-flow/commit/3237fc5239d48d94dadc35cb0591418ae458e4ed)                | Shared workflow guidance                           |
| [effective-icon](https://github.com/sebastian-software/effective-icon)                               | [fe39cd6db7](https://github.com/sebastian-software/effective-icon/commit/fe39cd6db707096e192e813023f2a792d962245b)                | Published icon package                             |
| [stellara](https://github.com/sebastian-software/stellara)                                           | [5eeace1747](https://github.com/sebastian-software/stellara/commit/5eeace1747363b966ccb12d20f84982670462bc5)                      | Node application and release configuration         |

### What the evidence does and does not establish

The review read manifests, scripts, CI and release workflows, shared dependency
configuration, tool pins, and contributor/agent documentation. It did not run
product builds or test suites, audit every source file, inspect all remote
branch-protection settings, or verify external publishing credentials.

Selected patterns illustrate reuse:

- 22 snapshots contain mdtheme configuration and mise tool files.
- 25 contain Renovate configuration.
- 19 contain Release Please configuration.

These are overlapping counts within the selected sample, not organization-wide
compliance measurements. Copied managed files and coordinated rollouts can
inflate apparent agreement. The source links in the convention pages point to
the exact files behind specific claims.

## Choices made from the evidence

The defaults intentionally go beyond the lowest common denominator:

- Select the newer `oxlint-config-setup` direction for adoption, even though many
  consumers still compose OxLint and ESLint. Keep required diagnostic coverage
  and the package's compatibility matrix visible during migration.
- Select oxfmt from the broader repository practice. Its formatter role remains
  separate from the newer lint package's Biome companion template.
- Select a strict TypeScript starting point and native Rust lint ownership.
  Do not infer one universal runtime floor, panic strategy, or license.
- Select the stronger action-pinning and aggregate-check patterns already used
  by consumers over the simpler committed repo-template workflow.
- Select shared mdtheme rendering and task-oriented documentation, while keeping
  actual content, audience requirements, and documentation sites project-owned.

The current rules live in the profile pages. This section explains the initial
selection; it is not a second rule catalog to maintain.

## Proposed pilots

Start with one project at a time and make the first changes small enough to
review. Use an isolated checkout and preserve in-progress work in the original.

| Pilot         | Why it is useful                                                                       | First change to try                                                                            |
| ------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| harness-relay | A Node package with `node:test`, existing lint exceptions, and consumer package checks | Adopt the new lint entry point while preserving runner behavior and the complete gate          |
| mdtheme       | A Rust CLI with a compact native check script and several distribution channels        | Reconcile the contributor guide, tool setup, and documented local/release gates                |
| Ferromark     | Rust plus native Node packages and a separate site                                     | Apply profiles per project area and preserve release profile and package-version relationships |
| repo-template | New consumers need an example of the selected defaults                                 | Align the template after a real consumer establishes a working pattern                         |

For each pilot:

1. State the applicable standards and any concrete exceptions.
2. Record the selected project-infra Git revision in the review description,
   without adding an applied-version field to the consumer.
3. Make one coherent change, including the affected user documentation.
4. Run the relevant native checks and inspect the consumer artifact when it changes.
5. Repeat the same instruction once to check for unnecessary churn.
6. Record what failed or confused the agent, and simplify the owning convention.

A standard can be useful before an installer exists: the pilot can read these
pages directly. This proposal does not assert that an installable package or
automated trial runner is already available.

## Open decisions

1. Which pilot should receive the first implementation PR, and how much lint
   migration belongs in that first change?
2. Does the newer lint package's automatic file scoping fit a real `node:test`
   consumer without substantial exceptions?
3. Which repeated setup steps, if any, justify a small reusable asset after the
   first manual trials?

Resolve these through concrete project work. Do not wait for a large evaluation
framework or attempt an organization-wide migration before the first trial.

## Relationship to existing audit work

The earlier standards, renovate-config, and repo-template audit PRs remain
separate changes, linked in [RFC-0004](0004-migration-and-ecosystem.md).
They are not assumed merged by this survey. During a pilot, reconcile relevant
pending work rather than importing an older template snapshot over it.
