# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`
- **Read an issue**: `gh issue view <number> --comments`, including labels.
- **List issues**: Use `gh issue list` with appropriate state and label filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply or remove labels**: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`
- **Close an issue**: `gh issue close <number> --comment "..."`

Infer the repository from `git remote -v`; `gh` does this automatically inside the clone.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

The map is one issue containing notes, decisions, and unresolved areas. Child tickets are linked as GitHub sub-issues where supported, with task-list links as a fallback.

- Label maps `wayfinder:map`.
- Label children `wayfinder:<type>`, where type is `research`, `prototype`, `grilling`, or `task`.
- Represent blocking relationships using GitHub's native issue dependencies, falling back to a `Blocked by: #<n>` line.
- Claim work with `gh issue edit <n> --add-assignee @me`.
- Resolve work by commenting with the answer, closing the child, and adding its context pointer to the map.
