// Rescue templates: short plain-language lines that unstick an agent.
// Nudge, retry-step and explain fit one terminal burst (see MAX_DIRECT_CHARS
// in outbox.ts); longer bodies ride a file pointer via rescueBody. Safe
// answers always say what happens if the human says yes. Pure: texts only,
// sending stays in outbox.ts.

export type RescueKind = "nudge" | "retry-step" | "explain";

/** Wake a quiet agent: ask for a one-line status, nothing more. */
export function nudgeLine(): string {
  return "Still there? Reply in one line: what you finished and what you do next.";
}

/** Ask for the failed step to run again from scratch, then a pass/fail report. */
export function retryStepLine(step: string): string {
  return `That step failed. Retry it once from scratch, then report pass or fail: ${step}`;
}

/** Stop the agent and ask what it tried, what failed, and what it needs. */
export function explainLine(): string {
  return "Pause and explain in 3 short lines: what you tried, what failed, what you need.";
}

export function rescueLine(kind: RescueKind, detail = ""): string {
  if (kind === "nudge") return nudgeLine();
  if (kind === "explain") return explainLine();
  return retryStepLine(detail);
}

/** A safe answer to an agent question, with what saying yes means. */
export function safeAnswerLine(answer: string, consequence: string): string {
  return `Safe answer: ${answer}. Saying yes means: ${consequence}.`;
}
