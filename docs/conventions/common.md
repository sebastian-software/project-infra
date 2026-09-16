# Common workflow and tool ownership

Applies to infrastructure updates in any project.
See [the survey](../rfcs/0006-conventions-from-existing-projects.md) for scope.

## Discover the project before selecting a profile

Read the relevant manifests, native workspace declarations, contribution guide,
CI entry points, and repository instructions. Identify publishable packages,
private build workspaces, documentation sites, examples, generated directories,
and external fixtures separately.

Ferromark has a Rust workspace, a private Node workspace with a publishable npm
package, and a separate homepage. Dalo has a Rust product, a small npm launcher,
and a static site with its own build script. These are useful counterexamples to
classifying an entire repository from one manifest.

Evidence: [Ferromark workspace](https://github.com/sebastian-software/ferromark/blob/dea120198145497cf4e1bec88b2d865cc050b7c3/Cargo.toml),
[Node workspace](https://github.com/sebastian-software/ferromark/blob/dea120198145497cf4e1bec88b2d865cc050b7c3/node/package.json),
[Dalo npm launcher](https://github.com/sebastian-software/dalo/blob/4fdef503716b16fb911767a252daca0e38b67adf/npm/package.json),
[Dalo site](https://github.com/sebastian-software/dalo/blob/4fdef503716b16fb911767a252daca0e38b67adf/site/package.json).

**Standard:** derive the applicable areas from native declarations and actual
consumption. Preserve examples and fixtures without automatically managing them
as product packages. Add a runtime only for a concrete project need.

## Provide a discoverable verification path

The shared intent is a reliable way to reproduce the relevant CI checks locally.
The command name is not uniform:

| Project       | Observed entry point                  | Important distinction                                                    |
| ------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| repo-template | `pnpm agent:check`                    | Composes lint, format, types, build, tests, and a legacy standards check |
| harness-relay | `pnpm agent:check`, then `pnpm check` | The fuller gate adds ADR indexing, coverage, and package checks          |
| ferrolex      | `just quick`, `just gate`             | Network-dependent or optional extended checks have separate entry points |
| mdtheme       | `sh scripts/check.sh`                 | Uses native Cargo commands and package verification                      |
| xlsx-format   | `pnpm verify`                         | Includes coverage, package validation, and the documentation build       |

Evidence: [template scripts](https://github.com/sebastian-software/repo-template/blob/9b862953d9d6dbe7bd940bef1d1f06bd4a0e1714/package.json),
[harness-relay scripts](https://github.com/sebastian-software/harness-relay/blob/fbc04ab1bd762c0050b97f29f07def0eb0f87773/package.json),
[ferrolex recipes](https://github.com/sebastian-software/ferrolex/blob/e5850998d654ff8fd1b15d061fd95bf4bfc1da9c/justfile),
[mdtheme checks](https://github.com/sebastian-software/mdtheme/blob/cfae631c2387b8460ebe5e7bd92556d17ac80dd7/scripts/check.sh),
[xlsx-format scripts](https://github.com/sebastian-software/xlsx-format/blob/baf4978421a441fa8034527c5737a491930d7344/package.json).

**Standard:** provide one documented complete local gate. In a new Node project,
name it `pnpm check`; for a new Rust project, start with `scripts/check.sh` using
native Cargo commands. Keep an established, equally clear entry point. Introduce
a task runner only when its composition or portability is useful.

Where a fast loop and a complete gate differ, document both. CI and local
commands must call the same underlying scripts or checks. Keep checks
non-writing by default, with separate fix or generation commands. A build may
create ignored output; it must not silently rewrite tracked sources.

Keep optional benchmarks, licensed fixtures, fuzzing, and credential-dependent
integration checks explicit. A documentation-only change should run the relevant
documentation checks; it does not automatically need every product test.

## Keep tool selection in the project

For Node projects, inspect `packageManager`, `engines`, the lockfile, and CI setup
together. For Rust, distinguish the declared MSRV from the contributor toolchain.
For external repository tools, use the project's existing version manager when
one is already established.

The mdtheme rollout provides a concrete pattern: `mise.toml` selects the CLI,
`mise.lock` records release artifacts, and tasks use the selected installed binary
without silently choosing a global fallback. Installation is an explicit step.
This pattern exists in both Node and Rust repositories.

Evidence: [template tool tasks](https://github.com/sebastian-software/repo-template/blob/9b862953d9d6dbe7bd940bef1d1f06bd4a0e1714/mise.toml),
[Dalo tool tasks](https://github.com/sebastian-software/dalo/blob/4fdef503716b16fb911767a252daca0e38b67adf/mise.toml),
[mdtheme setup](https://github.com/sebastian-software/mdtheme/blob/cfae631c2387b8460ebe5e7bd92556d17ac80dd7/README.md.src).

**Standard:** make tool selection reproducible and missing prerequisites
actionable. Use mise for additional shared CLI tools such as mdtheme, with
project configuration and a committed lockfile. Keep pnpm and Cargo metadata in
their native locations; mise does not need to duplicate every version.

`MISE_OFFLINE` in these tasks governs tool resolution. It does not prove that
the invoked program performs no network access: mdtheme's Git theme resolution
has its own behavior, described in its setup guide.

## Preserve ownership and justified differences

A shared configuration is an upstream source of intent. A generated file belongs
to its generator. Project-specific overrides belong near the affected project
configuration, with a reason when their purpose would otherwise be unclear.

harness-relay explicitly disables Vitest-specific rules because its tests use
`node:test`, and documents existing lint exceptions. This is a concrete reason
to adjust a shared default. Unexplained copied rules and obsolete exceptions
should be removed when their purpose is no longer present.

Evidence: [harness-relay OxLint overrides](https://github.com/sebastian-software/harness-relay/blob/fbc04ab1bd762c0050b97f29f07def0eb0f87773/oxlint.config.ts),
[ESLint overrides](https://github.com/sebastian-software/harness-relay/blob/fbc04ab1bd762c0050b97f29f07def0eb0f87773/eslint.config.ts).

The existing metadata and managed-file migration remains governed by
[ADR-0004](../adr/0004-use-native-metadata-and-existing-owners.md). This
baseline does not reinstate `.repometa.json`, stamp-based migration, or blanket
ownership of consumer files.
