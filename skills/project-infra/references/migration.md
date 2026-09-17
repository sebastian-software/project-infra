# Migrate from the standards CLI

Applies to a repository that still resolves a reference against
`sebastian-software/standards`. The [common workflow](common.md) also applies.

That repository is retired: its conventions are these references, and its
composite actions have a new address. Until a repository stops naming it, it
keeps a CI job, a pinned CLI, a metadata stamp, and a Renovate rule alive for a
tool that receives no further releases.

This is what the change consists of, not a schedule for it. A pin moves when the
repository has another reason to change its workflow, as
[shared actions](ci-and-releases.md#use-the-organizations-shared-actions)
describes. The rest fits one reviewed change per repository, with each
replacement in place before what it replaces is removed.

## Find every remaining reference

The leftovers use a small set of fixed names, so one search finds them:

```sh
git grep -Il \
  -e 'sebastian-software/standards' \
  -e 'sebastian-software-consumer-agents' \
  -e 'renovate-config:standards' \
  -e 'repometa' \
  -e '\.standards/'
git ls-files .repometa.json .standards
```

Searching tracked files keeps build output and installed dependencies out of the
result. The second command finds the files whose names, not contents, carry the
reference. Read a committed `.standards/blocked.json` before deleting it,
because it names a check that failed and that check can still be failing.

Work from the search result rather than from memory. A single repository can
carry a reference in a workflow, a manifest, a lockfile, an ignore list, and a
contributor page at once, and removing four of the five leaves a job that fails
on the fifth. The patterns match the machinery's exact names; a sentence that
mentions the predecessor only as a word is found by reading the documents the
search returns.

## Replace each reference before removing it

| Leftover                                                                                                                          | What takes over                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A CI job running `standards check`, with its `.standards/pending.json` and `blocked.json` guards                                  | The installed skill, invoked as an explicit task. Alignment is reviewed in a pull request instead of asserted by a job                                                                                       |
| The CLI pin, in a workflow, a `devDependency`, or a guard comparing it against the repository stamp                               | Nothing. The pin, the stamp, and the guard existed to keep each other consistent                                                                                                                             |
| `.repometa.json`                                                                                                                  | Native manifests, Git remotes, and the project's own tool setup. Its README-owner field is replaced by the generator's own pin and check, see [tool selection](common.md#keep-tool-selection-in-the-project) |
| A Renovate regex manager for the CLI pin, and the `renovate-config:standards` preset entry                                        | Nothing. Remove both and keep the shared preset, see [dependency policy](ci-and-releases.md#share-dependency-policy)                                                                                         |
| A `uses:` naming the predecessor's `.github/actions/`                                                                             | The same action at its current address, see [shared actions](ci-and-releases.md#use-the-organizations-shared-actions)                                                                                        |
| A repository-local workflow-pin checker with its tests and fixtures                                                               | The shared `check-action-pins` action                                                                                                                                                                        |
| A "Managed by" or "Seeded by" header in `rustfmt.toml`, `rust-toolchain.toml`, or `deny.toml`                                     | The project, which already owned the file. Delete the header, see [Rust](rust.md#keep-formatting-and-lint-policy-native)                                                                                     |
| The `sebastian-software-consumer-agents` block in `AGENTS.md`                                                                     | The [AGENTS.md excerpt](../assets/common/AGENTS.template.md), adapted to the repository                                                                                                                      |
| A `.standards/` entry in a formatter ignore list or a spell-check word list                                                       | Nothing, once the directory is gone                                                                                                                                                                          |
| A configuration file seeded only so the CLI found one at an expected name, including a bridge re-exporting the real configuration | Nothing. The file the bridge pointed at stays, and so does a `cspell.json` that the [shared ESLint configuration](node.md#formatting-and-linting) reads; without that linter, nothing reads it and it goes   |
| A contributor page or paragraph explaining standards drift                                                                        | The gate the repository actually runs, described where its other checks are                                                                                                                                  |

Keep the repository out of a half-migrated state: move an action pin and delete
the local pin checker in one change, and replace the `AGENTS.md` block in the
change that removes the job it describes.

## Keep what the machinery was attached to

These names sit on configuration the project owns. A search-and-delete pass
removes that configuration together with the name, and nothing reports the loss.

- **Renovate.** Only the CLI manager and the `:standards` preset entry belong to
  the retirement. Dependency updates do not, and a repository that drops them
  stops receiving the security updates it was getting.
- **The Rust configuration under the headers.** `rustfmt.toml`,
  `rust-toolchain.toml`, and `deny.toml` keep their content. A deleted header is
  not permission to reset a file to a default, least of all `deny.toml`, whose
  exceptions were reviewed one finding at a time.
- **README generation.** The authored source, the theme selection, the pinned
  generator, and the drift check all stay, see
  [generated README content](documentation.md#generate-shared-readme-content).
- **The repository's own gate.** It loses a step, not its entry point.
- **Repository scaffolding.** Issue and pull-request templates, code owners,
  labels, and security and support texts stay in place. Aligning them with the
  [scaffolding set](documentation.md#scaffold-a-repository) is a separate
  change, not part of the retirement.

## Verify

Run the repository's complete gate, then repeat the search and confirm the
working tree is clean of the names. A workflow change is only proven by a pull
request run: a removed job, a moved pin, and a deleted guard all fail in CI
rather than locally. Resolve a moved pin's SHA from a release tag as
[shared actions](ci-and-releases.md#use-the-organizations-shared-actions)
describes, and check that a pin checker still covers the workflows afterwards.
