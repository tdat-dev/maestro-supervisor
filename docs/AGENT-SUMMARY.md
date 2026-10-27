# Agent-written summaries

No model, no key, no install. Each agent keeps one small file updated in its
own worktree, and `watch` prints it as the `~ SUMMARY` line whenever it
changes. Missing file = no line (not an error).

## Convention

- Path: `<projectDir>/.maestro/summary-<pane-slug>.md`
- Slug: pane name lowercased, runs of non-alphanumerics become `-`
  (`Claude Code 0k5qww` → `summary-claude-code-0k5qww.md`)
- Keep it under 5 lines; the watcher collapses it to one line (~500 chars)

## Prompt snippet for agents

Paste into the agent's instructions (or the Maestro agent template):

```text
Every ~15 minutes and whenever you get blocked, unblocked, or finish a
milestone, rewrite .maestro/summary-<your-pane-slug>.md with exactly:
Doing: <one line>
Blocked: <yes/no + what you wait for>
Next: <one line>
```

## Note

`src/llama.ts` and `src/ollama.ts` hold optional LLM summarizers (Meta cloud
or local Ollama). They are tested but currently unwired from the watch loop;
the loop uses agent-written files only, so summaries work with zero setup.
