# Domain Docs

How engineering skills should consume this repository's domain documentation.

## Before exploring, read these

- `CONTEXT.md` at the repository root.
- `CONTEXT-MAP.md` if it exists; read each context relevant to the task.
- Relevant decisions under `docs/adr/`.
- In multi-context repositories, relevant decisions under `src/<context>/docs/adr/`.

If a file does not exist, proceed silently. Domain-modeling skills create documentation when terminology or decisions are actually resolved.

## File structure

This repository uses the single-context layout:

```text
/
|-- CONTEXT.md
|-- docs/adr/
`-- source files
```

## Use the glossary's vocabulary

When naming domain concepts in issues, proposals, hypotheses, and tests, use the terms defined in `CONTEXT.md`. Avoid synonyms the glossary explicitly rejects.

If a required concept is absent, reconsider whether the language belongs to the project or note the gap for domain modeling.

## Flag ADR conflicts

If proposed work contradicts an existing ADR, identify that conflict explicitly instead of silently overriding the decision.
