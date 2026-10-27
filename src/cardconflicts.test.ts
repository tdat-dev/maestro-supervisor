import { describe, expect, it } from "vitest";
import { findCardConflicts, normalizeProjectDir } from "./cardconflicts.js";

describe("findCardConflicts", () => {
  it("fires when two agents in one workspace hold the same card", () => {
    expect(
      findCardConflicts([
        { name: "Ana", projectDir: "D:/proj", cards: ["Login"] },
        { name: "Bob", projectDir: "D:/proj", cards: ["Login", "Signup"] },
      ]),
    ).toEqual([
      {
        agents: ["Ana", "Bob"],
        card: "Login",
        line: '! CONFLICT Ana and Bob both hold card "Login"',
      },
    ]);
  });

  it("stays quiet when cards are disjoint", () => {
    expect(
      findCardConflicts([
        { name: "Ana", projectDir: "D:/proj", cards: ["Login"] },
        { name: "Bob", projectDir: "D:/proj", cards: ["Signup"] },
      ]),
    ).toEqual([]);
  });

  it("stays quiet across workspaces", () => {
    expect(
      findCardConflicts([
        { name: "Ana", projectDir: "D:/proj-a", cards: ["Login"] },
        { name: "Bob", projectDir: "D:/proj-b", cards: ["Login"] },
      ]),
    ).toEqual([]);
  });

  it("treats workspace dirs case-insensitively with unified slashes", () => {
    expect(normalizeProjectDir("D:\\Proj")).toBe("d:/proj");
    expect(
      findCardConflicts([
        { name: "Ana", projectDir: "D:\\Proj", cards: ["Login"] },
        { name: "Bob", projectDir: "d:/proj", cards: ["Login"] },
      ]),
    ).toHaveLength(1);
  });

  it("never pairs an agent with itself", () => {
    expect(findCardConflicts([{ name: "Ana", projectDir: "D:/proj", cards: ["Login"] }])).toEqual([]);
    expect(
      findCardConflicts([
        { name: "Ana", projectDir: "D:/proj", cards: ["Login"] },
        { name: "Ana", projectDir: "D:/proj", cards: ["Login"] },
      ]),
    ).toEqual([]);
  });
});
