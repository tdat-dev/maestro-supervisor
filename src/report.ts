// Verdict output for the watch CLI: one line per finished agent, red or
// green with the plain-language reason. Pure: formatting only.

import type { DoneVerdict } from "./verdict.js";

/** `= VERDICT Ana [done]: RED Not runnable: login step fails.` Pure. */
export function formatVerdictLine(agentName: string, finished: string, verdict: DoneVerdict): string {
  return `= VERDICT ${agentName} [${finished}]: ${verdict.level.toUpperCase()} ${verdict.reason}`;
}
