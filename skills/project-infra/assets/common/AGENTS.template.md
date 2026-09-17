<!-- Template, not instructions. Copy it to the repository root as AGENTS.md,
     replace each `<...>` placeholder, and drop an unused section. It carries a
     different name here so an agent app never loads the installed copy as a
     nested instruction file. -->

# Working in `<project>`

`<What this repository produces, and the constraint an edit must not break.>`

Read `README.md` for the product and `CONTRIBUTING.md` for setup and review.
Link to them from here instead of restating them.

## Checks

Run `<complete gate command>` before proposing a change. CI runs the same entry
point, so a failure reproduces locally. Use the narrowest relevant check while
working.

## Generated files

`<generated path>` is written by `<generator command>` from `<authored source>`.
Change the source and regenerate; a hand edit is lost on the next run. Leave
another tool's output and its marked sections to that tool.

## Conventions and decisions

Infrastructure conventions come from the `project-infra` skill installed in this
repository. Apply them as an explicit task; ordinary feature work does not need
a repository-wide update. Durable decisions live in `<decision records>` and are
constraints for routine work.
