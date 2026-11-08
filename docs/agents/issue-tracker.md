# Issue Tracker: GitHub

Issues and PRDs for this repository live in GitHub Issues at `BiM1406/DMPTiFy_MusicAI`. Use the `gh` CLI from this clone so it resolves the repository from the `origin` remote.

## Conventions

- Create an issue with `gh issue create --title "..." --body "..."`; for long bodies, prefer a reviewed Markdown file with `--body-file`.
- Read an issue and its discussion with `gh issue view <number> --comments`.
- List issues with `gh issue list`, selecting JSON fields and filters required by the active skill.
- Comment with `gh issue comment <number> --body "..."`.
- Apply or remove labels with `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- Close an issue with `gh issue close <number> --comment "..."`.

When a skill says to publish to the issue tracker, create a GitHub issue. When it asks for the relevant ticket, fetch the issue body, labels, and comments before acting.
