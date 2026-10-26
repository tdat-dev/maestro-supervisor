// Risk gate: risky moves never run quietly. A command matching one of these
// is blocked until a human clicks approve. Pure matcher; the approval UI and
// the pre-action checkpoint ("Back to last working") wire in later.

export interface RiskFinding {
  risky: boolean;
  reason: string | null;
}

/** An rm segment is risky with a recursive flag (-r, -rf, -R,
 *  --recursive) or a wildcard. A dash inside a plain filename is fine. */
function rmRisky(cmd: string): boolean {
  return cmd.split(/&&|\|\||[;|]/).some((seg) => {
    const m = seg.match(/^\s*rm\s+(.*)$/i);
    if (!m) return false;
    if (m[1].includes("*")) return true;
    return m[1].split(/\s+/).some((t) => /^-[a-z]*r/i.test(t) || t.toLowerCase() === "--recursive");
  });
}

const RISKY: Array<{ test: (cmd: string) => boolean; reason: string }> = [
  { test: rmRisky, reason: "recursive or wildcard delete" },
  {
    test: (c) => /push\b[^&|;]*--force|--force\b[^&|;]*push/i.test(c),
    reason: "force push rewrites shared history",
  },
  { test: (c) => /\breset\s+--hard\b/i.test(c), reason: "hard reset discards uncommitted work" },
  { test: (c) => /\bdrop\s+(table|database)\b/i.test(c), reason: "drops a table or database" },
  { test: (c) => /\b(publish|deploy)\b.*--prod\b/i.test(c), reason: "ships to production" },
];

/** True when the command must wait for a human click. Pure. */
export function classifyCommand(cmd: string): RiskFinding {
  for (const r of RISKY) {
    if (r.test(cmd)) return { risky: true, reason: r.reason };
  }
  return { risky: false, reason: null };
}
