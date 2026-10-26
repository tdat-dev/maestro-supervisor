// Per-agent progress summaries via a Meta model (days 3-5). The prompt
// builder is real and tested; the model wiring lands next, once the exact
// Meta model + API endpoint for the hackathon is confirmed.

/** SET ME: the Meta model used for summaries (announced in the demo video). */
export const META_MODEL = "SET ME";

export interface ProgressInput {
  name: string;
  status: string;
  uptime: string;
  /** Titles of the agent's open board cards. */
  cards: string[];
  /** Tail of the agent's screen. */
  tail: string;
}

/** Build the summarization prompt for one agent. Pure. */
export function buildProgressPrompt(input: ProgressInput): string {
  const cards = input.cards.length
    ? input.cards.map((c) => `- ${c}`).join("\n")
    : "(no cards assigned)";
  const tail = input.tail.trim() ? input.tail.trim().slice(-2000) : "(empty screen)";
  return [
    `Agent ${input.name} is ${input.status} (uptime ${input.uptime || "?"}).`,
    "Its open board cards:",
    cards,
    "Its latest screen output:",
    tail,
    "In 2-3 sentences: what is it doing, and is it blocked?",
  ].join("\n");
}

export interface Summarizer {
  summarize(prompt: string): Promise<string>;
}

/** Placeholder until the Meta model is wired: shows the shape of the
 *  output without calling anything. */
export const stubSummarizer: Summarizer = {
  async summarize(prompt: string): Promise<string> {
    const first = prompt.split("\n")[0] ?? "";
    return `[stub, model ${META_MODEL} not wired yet] ${first}`;
  },
};
