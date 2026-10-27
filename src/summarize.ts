// Per-agent progress summaries via a Meta model: buildProgressPrompt() packs
// the prompt (pure + tested), llama.ts calls the model. The model name below
// is announced in the demo video.

/** The Meta model used for summaries (announced in the demo video). Override per-run with LLAMA_MODEL. */
export const META_MODEL = "Llama-4-Scout-17B-16E-Instruct";

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

/** Fallback when LLAMA_API_KEY is unset: shows the shape of the output
 *  without calling anything. */
export const stubSummarizer: Summarizer = {
  async summarize(prompt: string): Promise<string> {
    const first = prompt.split("\n")[0] ?? "";
    return `[stub, set LLAMA_API_KEY for ${META_MODEL}] ${first}`;
  },
};
