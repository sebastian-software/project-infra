# Node.js and TypeScript

Applies to JavaScript and TypeScript project areas, including nested packages
and documentation sites.

## Use the Oxc and Vite toolchain

Keep source tooling within this ecosystem to reduce overlapping configuration
and make development, tests, and production builds work from compatible inputs.

| Responsibility                     | Tool                                                                    | Purpose                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Formatting                         | oxfmt                                                                   | Fast, consistent formatting with one project-wide contract                                 |
| Source linting                     | OxLint; ESLint stays supported while the OxLint migration is incomplete | Catch code defects while retaining required TypeScript diagnostics                         |
| Application development and builds | Vite, through the framework's integration where applicable              | Share module resolution, transforms, and plugins between development and builds            |
| Package and CLI bundles            | tsdown                                                                  | Produce distributable JavaScript and type declarations with package-oriented configuration |
| Tests                              | Vitest                                                                  | Reuse the Vite transformation and configuration model for tests                            |
| Type checking                      | TypeScript                                                              | Check the project's type contracts independently of code transformation                    |

Vite and tsdown use Rolldown and Oxc for bundling and transformation. Use these
integrations directly; add a separate compiler or bundler step only for a
concrete requirement. Removing TypeScript syntax during a build does not replace
a type check.

Tool responsibilities are documented in the [Vite guide](https://vite.dev/guide/),
[tsdown guide](https://tsdown.dev/guide/),
[Oxc transformer guide](https://oxc.rs/docs/guide/usage/transformer), and
[Vitest guide](https://vitest.dev/guide/).

## Package management and runtime support

Use pnpm, declare its selected version in `packageManager`, commit the lockfile,
and use frozen installs in CI. Declare workspace membership in
`pnpm-workspace.yaml`. This keeps package relationships and dependency resolution
explicit across local work and CI. The [package.json](../assets/node/package.json)
and [pnpm-workspace.yaml](../assets/node/pnpm-workspace.yaml) excerpts show the
declared fields.

Start new projects on a supported Node LTS release compatible with the chosen
tools. Declare the consumer support floor in `engines` and test it for published
packages. A tooling update must not silently raise that floor. Check the current
[Node release schedule](https://nodejs.org/en/about/previous-releases) when choosing
a version.

Limit build-script permissions and dependency overrides to actual needs. Keep
compatibility-sensitive tool versions together, following the lint configuration
package's supported matrix. When the type check should already run a newer
TypeScript major than that matrix supports, install both majors through an
aliased dependency such as `@typescript/typescript6`, so the compiler can move
forward while the tools that consume its API keep the version they support.
Dependency automation is covered in [CI and releases](ci-and-releases.md).

## Formatting and linting

Use oxfmt with its defaults. Provide `format` and `format:check`. Keep necessary
file exclusions local and format generated content in its generator. Separate
large formatting-only changes from behavioral changes so reviews stay readable.

OxLint and ESLint are both supported. Use the shared
[oxlint-config-setup](https://github.com/sebastian-software/oxlint-config-setup)
or [eslint-config-setup](https://github.com/sebastian-software/eslint-config-setup)
configuration for the chosen path. Prefer OxLint for
checks already covered; retain ESLint's required TypeScript checks while the
organization's migration is incomplete. Adopting these standards does not require
finishing that migration in the same change.

These packages are released on their own schedule and are not part of this
skill. Install the current version and extend it locally; project-specific
overrides and additions are the expected shape, not an exception. Checking that
a project is on a recent version is worth a moment during an infrastructure
update, but chasing the newest release is not part of one.

Use the recommended lint profile with scopes matching the actual runtime,
framework, and tests. When both linters run, give overlapping checks a clear
owner. Keep rule definitions in the shared configuration and local exceptions
narrow. Remove a lint check only when its required behavior remains covered.

## Type contracts and modules

Enable `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`.
These expose unchecked values and ambiguous optional fields before they become
runtime failures. Add `noImplicitOverride`, which requires the `override`
keyword on a member that replaces a base class member, so renaming or removing
that member becomes an error instead of a silently detached method. Add
`noImplicitReturns`, which rejects a function that returns a value on one path
and falls off the end on another; the strict family checks neither case. Add
`verbatimModuleSyntax` and `isolatedModules` to keep the sources within what a
single-file transformer such as Oxc can compile: type-only imports have to be
written as `import type` so they erase predictably, and constructs that need
cross-file type information fail the type check instead of the build. Fix the
affected code when adopting the flags. The
[tsconfig excerpt](../assets/node/tsconfig.json) enables them with bundler
resolution.

Use ESM for new packages. Keep required public entry points compatible when
updating an existing package. Match TypeScript module resolution to the actual
runtime or bundler, generate framework types before checks that need them, and
list a framework's ambient declarations in `types` when it serves virtual
modules the compiler cannot resolve on its own.

## Verify the development and consumer paths

Use Vite for application builds, tsdown for distributable package bundles, and
Vitest for tests. Configure only the outputs and environments the product needs.
The [tsdown excerpt](../assets/node/tsdown.config.ts) configures an ESM package
bundle with declarations.

Tests that render components run in the jsdom environment, where the host
runtime's own globals can displace it: Node 24 and newer define global
`localStorage` and `sessionStorage` that stay `undefined` unless the process is
started with `--localstorage-file`, and from Node 26 they shadow jsdom's Web
Storage, so a suite that passes on Node 22 reads `localStorage` as `undefined`
and throws on the newer entries of a Node matrix. Reference a `vitest.setup.ts`
from `setupFiles` that installs a minimal in-memory `Storage` only when the
global is missing, which leaves jsdom's own implementation in place. The same
file is the place for DOM methods jsdom does not implement, such as
`Element.prototype.scrollIntoView`.

From a clean install, the project gate should cover formatting, lint, types,
tests, and the build. A successful source build is not sufficient for a published
package: also run the relevant [consumer-artifact checks](ci-and-releases.md#verify-the-artifact-consumers-receive).
