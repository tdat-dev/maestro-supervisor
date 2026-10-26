// Real-money cost line: no tokens, no $/hr jargon. "This agent spent ~$X",
// plus a budget alert at the user's own limit. Pure: token counting wires
// in later (transcript usage x model price).

/** Whole dollars with a ~ prefix, e.g. 1240 cents -> "~$12". */
export function formatApproxUSD(cents: number): string {
  if (cents < 100) return "<$1";
  return `~$${Math.round(cents / 100)}`;
}

export interface BudgetStatus {
  over: boolean;
  line: string;
}

/** One cost line plus whether the budget tripped. Pure. */
export function budgetStatus(agentName: string, spentCents: number, budgetCents: number): BudgetStatus {
  const over = spentCents >= budgetCents;
  const line = over
    ? `${agentName} spent ${formatApproxUSD(spentCents)} (over the ${formatApproxUSD(budgetCents)} budget)`
    : `${agentName} spent ${formatApproxUSD(spentCents)} of ${formatApproxUSD(budgetCents)}`;
  return { over, line };
}
