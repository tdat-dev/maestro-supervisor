import { describe, expect, it } from "vitest";
import { suggestPartition } from "./suggest.js";

describe("suggestPartition", () => {
  it("suggests a card partition with the given agent order", () => {
    expect(
      suggestPartition({ agents: ["Ana", "Bob"], target: "Login", kind: "card" }),
    ).toBe('→ Ana keeps card "Login", Bob picks another card');
  });

  it("suggests a file partition with the given agent order", () => {
    expect(
      suggestPartition({ agents: ["Ana", "Bob"], target: "src/login.ts", kind: "file" }),
    ).toBe("→ Ana keeps src/login.ts, Bob syncs with Ana first");
  });

  it("keeps the first agent as keeper when the order is swapped", () => {
    expect(
      suggestPartition({ agents: ["Bob", "Ana"], target: "Login", kind: "card" }),
    ).toBe('→ Bob keeps card "Login", Ana picks another card');
    expect(
      suggestPartition({ agents: ["Bob", "Ana"], target: "src/login.ts", kind: "file" }),
    ).toBe("→ Bob keeps src/login.ts, Ana syncs with Bob first");
  });

  it("handles card titles with spaces verbatim", () => {
    expect(
      suggestPartition({ agents: ["Ana", "Bob"], target: "User login flow", kind: "card" }),
    ).toBe('→ Ana keeps card "User login flow", Bob picks another card');
  });

  it("handles card titles containing quotes verbatim, like the conflict line", () => {
    expect(
      suggestPartition({ agents: ["Ana", "Bob"], target: 'Say "hi" to Ana', kind: "card" }),
    ).toBe('→ Ana keeps card "Say "hi" to Ana", Bob picks another card');
  });

  it("is deterministic for repeated calls", () => {
    const input = { agents: ["Ana", "Bob"] as [string, string], target: "Login", kind: "card" as const };
    expect(suggestPartition(input)).toBe(suggestPartition(input));
  });
});
