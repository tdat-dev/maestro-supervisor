import { describe, expect, it, vi } from "vitest";
import {
  LlamaError,
  createLlamaSummarizer,
  isAuthError,
  llamaFromEnv,
} from "./llama.js";
import { META_MODEL } from "./summarize.js";

type FetchFn = typeof fetch;

function mockFetch(handler: (url: string, init: RequestInit) => unknown): FetchFn {
  return (async (url: unknown, init?: unknown) =>
    handler(String(url), (init ?? {}) as RequestInit)) as unknown as FetchFn;
}

const okBody = (content: string) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => ({ choices: [{ message: { content } }] }),
  text: async () => "",
});

describe("createLlamaSummarizer", () => {
  it("posts the prompt and returns the trimmed completion", async () => {
    let seenUrl = "";
    let seenInit: RequestInit = {};
    const fetchFn = mockFetch((url, init) => {
      seenUrl = url;
      seenInit = init;
      return okBody("  Ana is fixing login. Not blocked.  ");
    });
    const s = createLlamaSummarizer({ apiKey: "k", fetchFn });
    await expect(s.summarize("hello")).resolves.toBe("Ana is fixing login. Not blocked.");
    expect(seenUrl).toBe("https://api.llama.com/compat/v1/chat/completions");
    expect(seenInit.method).toBe("POST");
    expect((seenInit.headers as Record<string, string>).Authorization).toBe("Bearer k");
    const body = JSON.parse(String(seenInit.body));
    expect(body).toMatchObject({ model: META_MODEL, max_tokens: 200 });
    expect(body.messages).toEqual([{ role: "user", content: "hello" }]);
  });

  it("honors model, baseUrl and maxTokens overrides", async () => {
    let seenUrl = "";
    let seenBody = "";
    const fetchFn = mockFetch((url, init) => {
      seenUrl = url;
      seenBody = String((init as RequestInit).body);
      return okBody("x");
    });
    const s = createLlamaSummarizer({
      apiKey: "k",
      model: "Other-1B",
      baseUrl: "https://proxy.local/v1/",
      maxTokens: 50,
      fetchFn,
    });
    await s.summarize("hi");
    expect(seenUrl).toBe("https://proxy.local/v1/chat/completions");
    expect(JSON.parse(seenBody)).toMatchObject({ model: "Other-1B", max_tokens: 50 });
  });

  it("throws LlamaError on HTTP errors; auth errors are detectable", async () => {
    const fail = (status: number) =>
      mockFetch(async () => ({ ok: false, status, statusText: "Nope", json: async () => ({}), text: async () => "bad key" }));
    const s401 = createLlamaSummarizer({ apiKey: "bad", fetchFn: fail(401) });
    const err = await s401.summarize("hi").catch((e) => e);
    expect(err).toBeInstanceOf(LlamaError);
    expect((err as LlamaError).status).toBe(401);
    expect(isAuthError(err)).toBe(true);
    const s500 = createLlamaSummarizer({ apiKey: "k", fetchFn: fail(500) });
    await expect(s500.summarize("hi")).rejects.toBeInstanceOf(LlamaError);
    expect(isAuthError(await s500.summarize("hi").catch((e) => e))).toBe(false);
  });

  it("throws LlamaError on network failure and empty completions", async () => {
    const down = createLlamaSummarizer({
      apiKey: "k",
      fetchFn: mockFetch(async () => { throw new Error("socket hang up"); }),
    });
    const err = await down.summarize("hi").catch((e) => e);
    expect(err).toBeInstanceOf(LlamaError);
    expect((err as LlamaError).status).toBe(0);
    const empty = createLlamaSummarizer({ apiKey: "k", fetchFn: mockFetch(async () => okBody("   ")) });
    await expect(empty.summarize("hi")).rejects.toThrow(/empty completion/);
  });
});

describe("llamaFromEnv", () => {
  it("returns null without a key", () => {
    expect(llamaFromEnv({})).toBeNull();
    expect(llamaFromEnv({ LLAMA_API_KEY: "   " })).toBeNull();
  });

  it("builds a summarizer from env with overrides", async () => {
    const impl = vi.fn(async (_url: unknown, _init?: unknown) => okBody("done"));
    const s = llamaFromEnv({ LLAMA_API_KEY: "k", LLAMA_MODEL: "M-2B" }, impl as unknown as FetchFn);
    expect(s).not.toBeNull();
    await s!.summarize("hi");
    const seenInit = impl.mock.calls[0][1] as unknown as RequestInit;
    const body = JSON.parse(String(seenInit.body));
    expect(body.model).toBe("M-2B");
  });
});
