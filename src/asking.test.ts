import { describe, expect, it } from "vitest";
import { readAsk } from "./asking.js";

describe("readAsk", () => {
  it("reads a run prompt and points at No", () => {
    const tail = [
      "Bash command",
      "Do you want to proceed?",
      "$ npm run build",
      "❯ 1. Yes",
      "  2. No",
      "Enter to select, esc to cancel",
    ].join("\n");
    const ask = readAsk(tail);
    expect(ask?.kind).toBe("run");
    expect(ask?.options).toEqual(["Yes", "No"]);
    expect(ask?.safeIndex).toBe(1);
    expect(ask?.hint).toMatch(/runs nothing/);
  });

  it("prefers a refusal over allow-once, and allow-once over always", () => {
    const tail = [
      "Allow execution?",
      "❯ 1. Yes, always",
      "  2. Yes, allow once",
      "  3. No",
      "Enter to confirm",
    ].join("\n");
    expect(readAsk(tail)?.safeIndex).toBe(2);

    const noRefusal = [
      "Allow execution?",
      "❯ 1. Yes, always",
      "  2. Yes, allow once",
      "Enter to confirm",
    ].join("\n");
    const ask = readAsk(noRefusal);
    expect(ask?.safeIndex).toBe(1);
    expect(ask?.options[ask!.safeIndex]).toMatch(/once/);
  });

  it("returns -1 when every run option is risky", () => {
    const tail = [
      "Do you want to proceed?",
      "❯ 1. Yes",
      "  2. Yes, and don't ask again",
      "Enter to select",
    ].join("\n");
    const ask = readAsk(tail);
    expect(ask?.kind).toBe("run");
    expect(ask?.safeIndex).toBe(-1);
    expect(ask?.hint).toMatch(/No safe answer/);
  });

  it("reads an edit prompt with the file as detail", () => {
    const tail = [
      "The agent wants to edit the file src/app.ts. Allow it?",
      "❯ 1. Yes",
      "  2. No",
      "Enter to select, esc to cancel",
    ].join("\n");
    const ask = readAsk(tail);
    expect(ask?.kind).toBe("edit");
    expect(ask?.safeIndex).toBe(1);
    expect(ask?.hint).toMatch(/unchanged/);
  });

  it("reads a plain question with numbered options", () => {
    const tail = [
      "Which package manager should I use?",
      "❯ 1. npm",
      "  2. pnpm",
      "  3. yarn",
      "Enter to select",
    ].join("\n");
    const ask = readAsk(tail);
    expect(ask?.kind).toBe("question");
    expect(ask?.question).toMatch(/package manager/);
    expect(ask?.options).toHaveLength(3);
    expect(ask?.safeIndex).toBe(0);
  });

  it("reads a bare y/n confirmation", () => {
    const tail = [
      "Cache is stale. Rebuild it? [y/n]",
      "Waiting for input…",
    ].join("\n");
    const ask = readAsk(tail);
    expect(ask).not.toBeNull();
    expect(ask?.options).toEqual(["Yes", "No"]);
  });

  it("returns null when the agent is not asking anything", () => {
    expect(readAsk("Compiling…\nDone in 3.2s.\n")).toBeNull();
    expect(readAsk("")).toBeNull();
  });

  it("ignores a numbered list in prose without a live prompt", () => {
    const tail = [
      "Plan:",
      "1. Install deps",
      "2. Run tests",
      "3. Build",
      "Starting step 1…",
    ].join("\n");
    expect(readAsk(tail)).toBeNull();
  });
});
