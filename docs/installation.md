# Install, use, and update project-infra

## Install in the consuming project

Run the [README installation command](../README.md#install-and-use) from the
repository root. It uses the published Skills CLI 1.5.26, which requires Git,
Node.js 22.20.0 or newer, npm, and access to GitHub and the npm registry.
Select `codex`, `claude-code`, or both with `--agent`.

Project scope is the installer's default. With both apps selected, its default
symlink mode produces:

```text
.agents/skills/project-infra/
  SKILL.md
  agents/openai.yaml
  references/
.claude/skills/project-infra -> ../../.agents/skills/project-infra
skills-lock.json
```

The canonical directory contains real files. The Claude link stays inside the
repository and is relative, so it also works after cloning into a different path.
Codex reads the canonical directory directly. The installer copies the selected
skill directory; the source repository's ADRs, RFCs, and contributor instructions
are outside that package.

Review the installed files, then commit:

```sh
git add .agents/skills/project-infra skills-lock.json
# If Claude Code was selected:
git add .claude/skills/project-infra
```

Check that project or global Git ignores do not hide these paths. A clean clone
already contains the skill; it needs the selected agent app to use it. Node and
the installer are needed only for installation and updates. A Rust-only project
does not need a `package.json` for this workflow.

## Load and invoke it

Open the consuming project in Codex or Claude Code and start a fresh session.
Use the [invocation examples](../README.md#install-and-use). You can request a
full infrastructure update, a focused change such as CI, or an audit without edits.

If the skill is missing, inspect its installed `SKILL.md` and, for Claude, the
link target. Restart the app if a fresh session does not refresh discovery.
Check for another installation named `project-infra`, including at user scope;
keep one intended copy available rather than relying on app-specific precedence.

## Update, then apply

From the repository root:

```sh
npx skills@1.5.26 update project-infra --project
```

This selects only the project-local `project-infra` entry. It refreshes the
installed files from the source recorded in `skills-lock.json`. The standard
GitHub installation follows the repository's default branch; an explicitly
selected ref continues to track that ref.

1. Preserve any local edits to the installed package before updating; the
   installer replaces upstream files.
2. Review the changed skill, lock entry, and app links with `git status` and
   `git diff`. Check the command's result against the installed content.
3. Start a fresh agent session and invoke project-infra to apply the new guidance.
4. Review the instruction update, project changes, and check results together,
   then commit the coherent change.

You can also ask the installed skill to update itself. It runs the same updater
and hands off to a fresh session before applying changed instructions.

The lockfile records source information and a content hash. It does not certify
that the project follows the standards, and the hash is not a fetchable Git
commit. Committed skill files and the consuming repository's Git history preserve
the exact instructions used. Restore those files and their matching lock entry
from Git when rolling back an instruction update.

## Keep customization with the project

Keep product requirements and justified differences in local configuration,
`AGENTS.md`, or existing project documents. Edit the upstream skill in this
repository when improving a shared rule. Editing the installed copy makes the
next upstream update overwrite those changes.

## Remove the installation

From the repository root:

```sh
npx skills@1.5.26 remove project-infra --yes
```

Review and commit the removal of the skill, its app links, and its lock entry.
Uninstalling the instructions leaves previously applied project changes in place.

## Compatibility

Installation, changed-source updates, clean-clone discovery, and removal were
checked on macOS with Skills CLI 1.5.26, Codex CLI 0.154.0, and Claude Code 2.1.235.
Discovery checks load the apps' skill catalogs; they do not benchmark model
behavior. Other platforms have not been verified.

The documented layout uses filesystem symlinks. On systems where symlinks cannot
be created or checked out, the installer's `--copy` mode is an alternative, but it
creates separate app copies. Validate installation and updates on that platform
before committing a different layout.

Hooks and standing-instruction installation remain an
[optional design topic](rfcs/0003-optional-hooks-and-automation.md).

Source documentation: [Skills CLI](https://github.com/vercel-labs/skills),
[Codex skill discovery](https://learn.chatgpt.com/docs/build-skills), and
[Claude Code skills](https://code.claude.com/docs/en/skills).
