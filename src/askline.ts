// Printable lines for a waiting agent's question. Pure: tail in, lines out.
// The watch loop prints on key change (one line per episode, not per poll).

import { readAsk } from "./asking.js";

export interface AskPrint {
  /** Dedupes repeats: same question on screen prints once per episode. */
  key: string;
  lines: string[];
}

function clip(s: string, max = 120): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Lines for the agent's live question, or null when the tail shows none. */
export function askPrint(name: string, tail: string): AskPrint | null {
  const ask = readAsk(tail);
  if (!ask) return null;
  const key = `${ask.kind}:${ask.question}:${ask.options.join("|")}`;
  const head = `  ? ASKS ${name} (${ask.kind}): ${clip(ask.question)}${ask.detail ? ` [${clip(ask.detail, 60)}]` : ""}`;
  const safe =
    ask.safeIndex >= 0 && ask.safeIndex < ask.options.length
      ? `    → safe: ${clip(ask.options[ask.safeIndex], 80)} (${clip(ask.hint)})`
      : "    → no safe answer known: decide on its screen";
  return { key, lines: [head, safe] };
}
