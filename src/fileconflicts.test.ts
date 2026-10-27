import { describe, expect, it } from "vitest";
import { findFileConflicts, normalizeDiffPath, normalizeProjectDir } from "./fileconflicts.js";

describe("findFileConflicts", () => {
  it("fires when two agents touch the same file", () => {
    expect(
      findFileConflicts([
        { name: "Ana", projectDir: "D:/proj", diffFiles: ["src/login.ts", "src/other.ts"] },
        { name: "Bob", projectDir: "D:/proj", diffFiles: ["src/login.ts"] },
      ]),
    ).toEqual([
      {
        agents: ["Ana", "Bob"],
        file: "src/login.ts",
        line: "! CONFLICT Ana and Bob both touch src/login.ts",
      },
    ]);
  });

  it("stays quiet when diffs are disjoint", () => {
    expect(
      findFileConflicts([
        { name: "Ana", projectDir: "D:/proj", diffFiles: ["src/login.ts"] },
        { name: "Bob", projectDir: "D:/proj", diffFiles: ["src/other.ts"] },
      ]),
    ).toEqual([]);
  });

  it("stays quiet across workspaces", () => {
    expect(
      findFileConflicts([
        { name: "Ana", projectDir: "D:/proj-a", diffFiles: ["src/login.ts"] },
        { name: "Bob", projectDir: "D:/proj-b", diffFiles: ["src/login.ts"] },
      ]),
    ).toEqual([]);
  });

  it("treats workspace dirs case-insensitively with unified slashes", () => {
    expect(normalizeProjectDir("D:\\Proj")).toBe("d:/proj");
    expect(
      findFileConflicts([
        { name: "Ana", projectDir: "D:\\Proj", diffFiles: ["src/login.ts"] },
        { name: "Bob", projectDir: "d:/proj", diffFiles: ["src/login.ts"] },
      ]),
    ).toHaveLength(1);
  });

  it("matches backslash paths against slash paths", () => {
    expect(normalizeDiffPath("src\\login.ts")).toBe("src/login.ts");
    const conflicts = findFileConflicts([
      { name: "Ana", projectDir: "D:/proj", diffFiles: ["src\\login.ts"] },
      { name: "Bob", projectDir: "D:/proj", diffFiles: ["src/login.ts"] },
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].line).toBe("! CONFLICT Ana and Bob both touch src/login.ts");
  });

  it("matches case-insensitively", () => {
    const conflicts = findFileConflicts([
      { name: "Ana", projectDir: "D:/proj", diffFiles: ["SRC/Login.TS"] },
      { name: "Bob", projectDir: "D:/proj", diffFiles: ["src/login.ts"] },
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].agents).toEqual(["Ana", "Bob"]);
  });

  it("stays quiet on empty diff lists", () => {
    expect(
      findFileConflicts([
        { name: "Ana", projectDir: "D:/proj", diffFiles: [] },
        { name: "Bob", projectDir: "D:/proj", diffFiles: ["src/login.ts"] },
      ]),
    ).toEqual([]);
    expect(findFileConflicts([])).toEqual([]);
  });

  it("never pairs an agent with itself", () => {
    expect(
      findFileConflicts([
        { name: "Ana", projectDir: "D:/proj", diffFiles: ["src/login.ts"] },
        { name: "Ana", projectDir: "D:/proj", diffFiles: ["src/login.ts"] },
      ]),
    ).toEqual([]);
  });
});
