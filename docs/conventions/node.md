# Node.js and TypeScript

Applies to actual JavaScript or TypeScript project
areas, including nested packages and documentation sites.

## Package management and supported runtimes

**Default:** use pnpm for a Node workspace, declare its
selected version in `packageManager`, commit its lockfile, and use frozen installs
in CI. Move an existing workspace to this default unless a consumer or framework
requires another package manager. Keep a deliberately separate package boundary.

The template, harness-relay, Ardo, and xlsx-format all select pnpm. Their supported
Node versions and pnpm major versions differ. Dalo's npm launcher uses npm in its
own checks. Start a new project on a supported Node LTS release compatible with
the selected tools. Declare the runtime support floor in `engines`; test the
floor for published packages. Do not raise an existing consumer support floor
as a side effect of a tooling update. Check the current
[Node release schedule](https://nodejs.org/en/about/previous-releases) when choosing
a version.

Evidence: [template package](https://github.com/sebastian-software/repo-template/blob/9b862953d9d6dbe7bd940bef1d1f06bd4a0e1714/package.json),
[harness-relay package](https://github.com/sebastian-software/harness-relay/blob/fbc04ab1bd762c0050b97f29f07def0eb0f87773/package.json),
[Ardo package](https://github.com/sebastian-software/ardo/blob/2a7b43a5bcddaba285ec5cbbf62b9c4183f4d963/package.json),
[xlsx-format package](https://github.com/sebastian-software/xlsx-format/blob/baf4978421a441fa8034527c5737a491930d7344/package.json),
[Dalo CI](https://github.com/sebastian-software/dalo/blob/4fdef503716b16fb911767a252daca0e38b67adf/.github/workflows/ci.yml).

Keep workspace membership in `pnpm-workspace.yaml` and package relationships in
the manifests. Build-script permissions, dependency overrides, and release-age
exceptions should reflect the actual dependencies. Do not copy another
repository's full allowlist or temporarily excluded versions into a new project.

Evidence: [template workspace](https://github.com/sebastian-software/repo-template/blob/9b862953d9d6dbe7bd940bef1d1f06bd4a0e1714/pnpm-workspace.yaml),
[Ardo workspace](https://github.com/sebastian-software/ardo/blob/2a7b43a5bcddaba285ec5cbbf62b9c4183f4d963/pnpm-workspace.yaml),
[harness-relay workspace](https://github.com/sebastian-software/harness-relay/blob/fbc04ab1bd762c0050b97f29f07def0eb0f87773/pnpm-workspace.yaml).

The shared Renovate policy has a separate release-age setting. Keep installer
behavior and dependency-bot policy understandable together; their configuration
formats and owners are not interchangeable.

## Formatting and linting

**Default:** oxfmt, using its defaults unless a specific file format or product
contract requires an override. Provide `format` and `format:check`; generated
content should be formatted by its generator. Scope exceptions in supported
project-local configuration. Format sources consistently during adoption;
keep a large formatting-only change separate from behavioral changes.

**Lint default:** use the organization-owned `oxlint-config-setup` at
`recommended`, with type-aware checking and only the relevant Node, React, and
test scopes. Keep the AI overlay off initially; add it when its extra diagnostics
have a project-specific benefit. Follow the package's tested compatibility
matrix and update its config, OxLint, and type-aware backend together.

This selects the newer single-process lint direction for the first iteration.
It is pre-1.0, so a successful consumer trial is part of adoption. The prevalent
older setup, including repo-template, composes OxLint and ESLint through
`eslint-config-setup`.

Evidence: [template lint composition](https://github.com/sebastian-software/repo-template/blob/9b862953d9d6dbe7bd940bef1d1f06bd4a0e1714/eslint.config.ts),
[template OxLint config](https://github.com/sebastian-software/repo-template/blob/9b862953d9d6dbe7bd940bef1d1f06bd4a0e1714/oxlint.config.ts),
[harness-relay scripts](https://github.com/sebastian-software/harness-relay/blob/fbc04ab1bd762c0050b97f29f07def0eb0f87773/package.json).

Evidence for the selected direction:
[OxLint adoption guide](https://github.com/sebastian-software/oxlint-config-setup/blob/31f09d70759f0928ca586838b521f6810c0e5d16/docs/adoption.md),
[migration and companion-tool responsibilities](https://github.com/sebastian-software/oxlint-config-setup/blob/31f09d70759f0928ca586838b521f6810c0e5d16/docs/migration.md).

During migration:

- Replace Prettier where oxfmt covers the project's formats; retain a narrow
  companion for unsupported formats. Ardo and Stellara are existing migration
  cases, not alternate organization defaults.
- Compare the old and new lint results on representative source files. Remove
  the old ESLint process when required diagnostics have an owner and accepted
  gaps are recorded. Keep a narrow ESLint check if a real framework requirement
  remains uncovered.
- Inspect automatic test-file overrides as well as runner selectors. A filename
  convention must not incorrectly apply Playwright or Testing Library rules to
  unrelated tests. Keep spelling, Markdown, and package validation with their
  companion tools where needed.

Evidence: [Ardo scripts](https://github.com/sebastian-software/ardo/blob/2a7b43a5bcddaba285ec5cbbf62b9c4183f4d963/package.json),
[Stellara scripts](https://github.com/sebastian-software/stellara/blob/5eeace1747363b966ccb12d20f84982670462bc5/package.json),
[OxLint configuration package](https://github.com/sebastian-software/oxlint-config-setup/blob/31f09d70759f0928ca586838b521f6810c0e5d16/package.json).

The newer lint package's companion template uses Biome. This baseline chooses
oxfmt from the broader workspace adoption; do not install both formatters for
the same files. xlsx-format's tabs and wider print width are an example to review
for a concrete style contract before converging on defaults.

Evidence: [xlsx-format formatting](https://github.com/sebastian-software/xlsx-format/blob/baf4978421a441fa8034527c5737a491930d7344/.oxfmtrc.json),
[template formatting](https://github.com/sebastian-software/repo-template/blob/9b862953d9d6dbe7bd940bef1d1f06bd4a0e1714/.oxfmtrc.json).

## Type checking and module behavior

**Default:** TypeScript with `strict`, `noUncheckedIndexedAccess`, and
`exactOptionalPropertyTypes` enabled. Use ESM for new packages. Keep required
CommonJS entry points for existing consumers and validate both export paths.
Adopt stricter flags through actual fixes; do not turn off strictness broadly
to make the gate pass.

Use module settings that match the execution environment. The template and
harness-relay use `NodeNext`; Ardo and xlsx-format use bundler-oriented resolution.
Do not replace those modes merely to make configuration files identical.

Evidence: [template types](https://github.com/sebastian-software/repo-template/blob/9b862953d9d6dbe7bd940bef1d1f06bd4a0e1714/tsconfig.json),
[harness-relay types](https://github.com/sebastian-software/harness-relay/blob/fbc04ab1bd762c0050b97f29f07def0eb0f87773/tsconfig.json),
[Ardo types](https://github.com/sebastian-software/ardo/blob/2a7b43a5bcddaba285ec5cbbf62b9c4183f4d963/tsconfig.json),
[xlsx-format types](https://github.com/sebastian-software/xlsx-format/blob/baf4978421a441fa8034527c5737a491930d7344/tsconfig.json).

Discover the actual compiler command, configuration inheritance, generated type
inputs, and lint compatibility before changing TypeScript versions or aliases.
Keep framework type generation where a clean checkout needs it.

## Tests and build tools follow the product

**Defaults:** use `node:test` for a small Node-only library or CLI and Vitest
when framework integration, browser simulation, or richer mocking is needed.
Keep an existing working runner when switching would add migration work without
improving the checks. Use `tsc` for a simple Node build, tsdown when publishing
requires bundled or multiple output formats, and the framework's build for apps.

harness-relay's test-aware lint overrides are especially useful guidance: a
shared convention must know which runner it is configuring. Do not install a
test framework merely because a file ends in `.test.ts`.

Evidence: [harness-relay scripts](https://github.com/sebastian-software/harness-relay/blob/fbc04ab1bd762c0050b97f29f07def0eb0f87773/package.json),
[xlsx-format scripts](https://github.com/sebastian-software/xlsx-format/blob/baf4978421a441fa8034527c5737a491930d7344/package.json),
[Ferramenta scripts](https://github.com/sebastian-software/ferramenta/blob/6351af77d033b7a9d80ad0f6478b583626fba5ea/package.json).

For published packages, add the relevant consumer-artifact checks described in
[CI and releases](ci-and-releases.md#verify-the-artifact-consumers-receive).

## Verify an adoption

From a clean install, run formatting, lint, type checking, tests, and the build
through the project gate. Include generated types and actual package checks
where relevant. Inspect formatter changes and newly missing diagnostics before
removing old tools. A compatibility failure should produce a scoped exception
or a correction to the shared package, not an unreviewed version bump.
