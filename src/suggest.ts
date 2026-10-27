// Partition suggestion: one deterministic hint line under each conflict
// warning (issues #2/#3). Suggestion only: it never auto-assigns work and
// never edits the board. Pure: no I/O, same input always yields same line.

/** Input for a partition suggestion. Agent order is kept as given: the
 *  first agent keeps the target, the second moves off it. */
export interface PartitionInput {
  agents: [string, string];
  /** Card title (kind "card") or display file path (kind "file"). */
  target: string;
  kind: "card" | "file";
}

/** One deterministic suggestion line, including the leading arrow marker. */
export function suggestPartition(c: PartitionInput): string {
  const [first, second] = c.agents;
  if (c.kind === "card") {
    return `→ ${first} keeps card "${c.target}", ${second} picks another card`;
  }
  return `→ ${first} keeps ${c.target}, ${second} syncs with ${first} first`;
}
