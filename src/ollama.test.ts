import { describe, expect, it } from "vitest";
import {
  OLLAMA_DEFAULT_BASE_URL,
  OLLAMA_DEFAULT_MODEL,
  OllamaError,
  createOllamaSummarizer,
  isOllamaUp,
  ollamaFromEnv,
} from "./ollama.js";

type FetchFn = typeof fetch;

function mockFetch(handler: (url: string, init: RequestInit) => unknown): FetchFn {
  return (async (url: unknown, init?: unknown) =>
    handler(String(url), (init ?? {}) as RequestInit)) as unknown as FetchFn;
}

const okBody = (content: string) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => ({ message: { content } }),
  text: async () => "",
});

describe("createOllamaSummarizer", () => {
  it("posts to /api/chat with stream:false and returns trimmed content", async () => {
    let seenUrl = "";
    let seenInit: RequestInit = {};
    const fetchFn = mockFetch((url, init) => {
      seenUrl = url;
      seenInit = init;
      return okBody("  Ana is fixing login. Not blocked.  ");
    });
    const s = createOllamaSummarizer({ fetchFn });
    await expect(s.summarize("hello")).resolves.toBe("Ana is fixing login. Not blocked.");
    expect(seenUrl).toBe(`${OLLAMA_DEFAULT_BASE_URL}/api/chat`);
    expect(seenInit.method).toBe("POST");
    const body = JSON.parse(String(seenInit.body));
    expect(body).toMatchObject({ model: OLLAMA_DEFAULT_MODEL, stream: false });
    expect(body.messages).toEqual([{ role: "user", content: "hello" }]);
  });

  it("honors model and baseUrl overrides", async () => {
    let seenUrl = "";
    let seenBody = "";
    const fetchFn = mockFetch((url, init) => {
      seenUrl = url;
      seenBody = String((init as RequestInit).body);
      return okBody("x");
    });
    const s = createOllamaSummarizer({ model: "llama3.2:3b", baseUrl: "http://box:11434/", fetchFn });
    await s.summarize("hi");
    expect(seenUrl).toBe("http://box:11434/api/chat");
    expect(JSON.parse(seenBody).model).toBe("llama3.2:3b");
  });

  it("throws OllamaError on HTTP errors, model errors, and network failure", async () => {
    const fail = mockFetch(async () => ({ ok: false, status: 500, statusText: "Boom", json: async () => ({}), text: async () => "" }));
    await expect(createOllamaSummarizer({ fetchFn: fail }).summarize("hi")).rejects.toBeInstanceOf(OllamaError);
    const modelErr = mockFetch(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => ({ error: "model not found" }), text: async () => "" }));
    await expect(createOllamaSummarizer({ fetchFn: modelErr }).summarize("hi")).rejects.toThrow(/model not found/);
    const down = mockFetch(async () => { throw new Error("ECONNREFUSED"); });
    await expect(createOllamaSummarizer({ fetchFn: down }).summarize("hi")).rejects.toThrow(/ECONNREFUSED/);
    const empty = mockFetch(async () => okBody("   "));
    await expect(createOllamaSummarizer({ fetchFn: empty }).summarize("hi")).rejects.toThrow(/empty completion/);
  });
});

describe("ollamaFromEnv", () => {
  it("always returns a selection with env overrides", () => {
    const d = ollamaFromEnv({});
    expect(d.model).toBe(OLLAMA_DEFAULT_MODEL);
    expect(d.baseUrl).toBe(OLLAMA_DEFAULT_BASE_URL);
    const o = ollamaFromEnv({ OLLAMA_MODEL: "m", OLLAMA_BASE_URL: "http://x/" });
    expect(o.model).toBe("m");
    expect(o.baseUrl).toBe("http://x/");
  });
});

describe("isOllamaUp", () => {
  it("true on ok, false on error or network failure", async () => {
    await expect(isOllamaUp("http://h", mockFetch(async () => ({ ok: true })))).resolves.toBe(true);
    await expect(isOllamaUp("http://h", mockFetch(async () => ({ ok: false })))).resolves.toBe(false);
    await expect(isOllamaUp("http://h", mockFetch(async () => { throw new Error("down"); }), 50)).resolves.toBe(false);
  });
});
