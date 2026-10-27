// Same-card conflict alarm: two agents in one workspace must never hold the
// same open card. Pure: the caller passes each agent's already-filtered open
// card titles (see cardsOf in board.ts), this module only compares them.

/** One agent's open cards within a workspace, as passed by the caller. */
export interface CardHolder {
  name: string;
  projectDir: string;
  /** Titles of the agent's OPEN cards only (caller filters). */
  cards: string[];
}

export interface CardConflict {
  /** The two conflicting agent names, in input order. */
  agents: [string, string];
  /** The card title both agents hold. */
  card: string;
  /** Plain-words alert line, ready to print. */
  line: string;
}

/** Normalize a workspace dir for comparison: unified slashes, lowercased. */
export function normalizeProjectDir(dir: string): string {
  return dir.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

/** Every pair of agents in one workspace holding the same open card. Unique
 *  unordered pairs only, never an agent with itself. Pure. */
export function findCardConflicts(agents: CardHolder[]): CardConflict[] {
  const out: CardConflict[] = [];
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const a = agents[i] as CardHolder;
      const b = agents[j] as CardHolder;
      if (a.name === b.name) continue;
      if (normalizeProjectDir(a.projectDir) !== normalizeProjectDir(b.projectDir)) continue;
      const held = new Set(a.cards);
      for (const card of new Set(b.cards)) {
        if (held.has(card)) {
          out.push({
            agents: [a.name, b.name],
            card,
            line: `! CONFLICT ${a.name} and ${b.name} both hold card "${card}"`,
          });
        }
      }
    }
  }
  return out;
}
