// Meta model client for progress summaries: plain fetch against Meta's
// OpenAI-compatible endpoint. No SDK, no new dependencies.
//
// Setup: set LLAMA_API_KEY (never commit it). Optional overrides: LLAMA_MODEL
// (default META_MODEL), LLAMA_BASE_URL for a proxy. Failures throw LlamaError;
// the watch loop degrades to a one-line warning per agent, alerts never
// depend on the model.

import { META_MODEL, type Summarizer } from "./summarize.js";

export const LLAMA_DEFAULT_BASE_URL = "https://api.llama.com/compat/v1";

export interface LlamaOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export class LlamaError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(detail ? `Llama API ${status}: ${detail}` : `Llama API ${status}`);
    this.name = "LlamaError";
    this.status = status;
  }
}

/** True for 401/403: the key is missing, wrong, or inactive. */
export function isAuthError(e: unknown): boolean {
  return e instanceof LlamaError && (e.status === 401 || e.status === 403);
}

interface ChatResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

/** Summarizer backed by the Meta model. Pure shape, network inside. */
export function createLlamaSummarizer(opts: LlamaOptions): Summarizer {
  const model = opts.model || META_MODEL;
  const baseUrl = (opts.baseUrl || LLAMA_DEFAULT_BASE_URL).replace(/\/+$/, "");
  const run = opts.fetchFn ?? fetch;
  return {
    async summarize(prompt: string): Promise<string> {
      let res: Response;
      try {
        res = await run(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${opts.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: opts.maxTokens ?? 200,
            temperature: 0.2,
          }),
          signal: AbortSignal.timeout(opts.timeoutMs ?? 30000),
        });
      } catch (e) {
        throw new LlamaError(0, e instanceof Error ? e.message : String(e));
      }
      if (!res.ok) {
        const detail = await res.text().then((t) => t.slice(0, 200)).catch(() => "");
        throw new LlamaError(res.status, detail || res.statusText);
      }
      const body = (await res.json()) as ChatResponse;
      const text = body.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text.trim()) {
        throw new LlamaError(res.status, "empty completion");
      }
      return text.trim();
    },
  };
}

/** Summarizer from the environment, or null when no key is set. */
export function llamaFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  fetchFn?: typeof fetch,
): Summarizer | null {
  const apiKey = env.LLAMA_API_KEY?.trim();
  if (!apiKey) return null;
  return createLlamaSummarizer({
    apiKey,
    model: env.LLAMA_MODEL?.trim() || undefined,
    baseUrl: env.LLAMA_BASE_URL?.trim() || undefined,
    fetchFn,
  });
}
