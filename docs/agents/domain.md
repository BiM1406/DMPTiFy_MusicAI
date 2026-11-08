# Domain Docs

Engineering skills use a single-context domain-document layout for DMPTiFy Music AI.

## Before Exploring

- Read `CONTEXT.md` at the repository root when it exists.
- Read relevant decisions under `docs/adr/` when that directory exists.
- If either location is absent, proceed silently. Domain producers such as `/grill-with-docs` create content lazily when terminology or decisions are resolved.

## Vocabulary

Use terms exactly as defined in `CONTEXT.md` in test names, interfaces, issues, designs, and reviews. If a required concept is missing, reconsider whether the term is being invented or note the genuine vocabulary gap for later domain clarification.

## Architectural Decisions

Surface any conflict with an existing ADR explicitly. Do not silently override an accepted decision; identify the ADR and explain why it may need to be revisited.

## Layout

```text
DMPTiFy_MusicAI/
|-- CONTEXT.md
|-- docs/
|   |-- adr/
|   `-- agents/
`-- server/ and src/
```

`CONTEXT.md` and `docs/adr/` are created only when they contain useful domain knowledge or an accepted architectural decision.
