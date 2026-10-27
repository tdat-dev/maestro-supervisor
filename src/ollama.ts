// Free local summaries via Ollama (Meta Llama family, no API key).
// Setup: install Ollama, then `ollama pull llama3.1:8b`, then run watch.
// Optional overrides: OLLAMA_MODEL, OLLAMA_BASE_URL.

import type { Summarizer } from "./summarize.js";

export const OLLAMA_DEFAULT_MODEL = "llama3.1:8b";
export const OLLAMA_DEFAULT_BASE_URL = "http://127.0.0.1:11434";

export interface OllamaOptions {
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export class OllamaError extends Error {
  constructor(detail: string) {
    super(detail ? `Ollama: ${detail}` : "Ollama request failed");
    this.name = "OllamaError";
  }
}

interface ChatResponse {
  message?: { content?: unknown };
  error?: unknown;
}

/** Summarizer backed by a local Ollama model. Pure shape, network inside. */
export function createOllamaSummarizer(opts: OllamaOptions = {}): Summarizer {
  const model = opts.model || OLLAMA_DEFAULT_MODEL;
  const baseUrl = (opts.baseUrl || OLLAMA_DEFAULT_BASE_URL).replace(/\/+$/, "");
  const run = opts.fetchFn ?? fetch;
  return {
    async summarize(prompt: string): Promise<string> {
      let res: Response;
      try {
        res = await run(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            stream: false,
            messages: [{ role: "user", content: prompt }],
            options: { temperature: 0.2 },
          }),
          signal: AbortSignal.timeout(opts.timeoutMs ?? 60000),
        });
      } catch (e) {
        throw new OllamaError(e instanceof Error ? e.message : String(e));
      }
      if (!res.ok) {
        const detail = await res.text().then((t) => t.slice(0, 200)).catch(() => "");
        throw new OllamaError(res.statusText || detail || `HTTP ${res.status}`);
      }
      const body = (await res.json()) as ChatResponse;
      if (typeof body.error === "string" && body.error) {
        throw new OllamaError(body.error.slice(0, 200));
      }
      const text = body.message?.content;
      if (typeof text !== "string" || !text.trim()) {
        throw new OllamaError("empty completion");
      }
      return text.trim();
    },
  };
}

export interface OllamaSelection {
  summarizer: Summarizer;
  model: string;
  baseUrl: string;
}

/** Always returns a selection (local Ollama needs no key). */
export function ollamaFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  fetchFn?: typeof fetch,
): OllamaSelection {
  const model = env.OLLAMA_MODEL?.trim() || OLLAMA_DEFAULT_MODEL;
  const baseUrl = env.OLLAMA_BASE_URL?.trim() || OLLAMA_DEFAULT_BASE_URL;
  return { summarizer: createOllamaSummarizer({ model, baseUrl, fetchFn }), model, baseUrl };
}

/** True when an Ollama server answers. Used once at startup for the hint. */
export async function isOllamaUp(
  baseUrl: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = 3000,
): Promise<boolean> {
  try {
    const res = await fetchFn(`${baseUrl.replace(/\/+$/, "")}/api/tags`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}
