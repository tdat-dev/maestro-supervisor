import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import type { BoardFile } from "./board.js";
import {
  boardCardDone,
  collectDiffFiles,
  collectEvidence,
  scanContent,
  scanStubs,
} from "./evidence.js";

const run = promisify(execFile);
const git = (dir: string, ...args: string[]) => run("git", ["-C", dir, ...args]);

async function makeRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "sup-ev-"));
  await git(dir, "init", "-q");
  await git(dir, "config", "user.email", "t@t");
  await git(dir, "config", "user.name", "t");
  await git(dir, "commit", "-q", "--allow-empty", "-m", "root");
  return dir;
}

const boardWith = (lists: Array<{ title: string; assignees: string[] }>): BoardFile => ({
  version: 2,
  lists: lists.map((l, i) => ({
    id: `l${i}`,
    title: l.title,
    cards: l.assignees.map((assignee, j) => ({ id: `c${i}${j}`, title: `card ${i}${j}`, desc: "", assignee })),
  })),
});

describe("collectDiffFiles", () => {
  it("lists modified and new files against HEAD", async () => {
    const dir = await makeRepo();
    await writeFile(join(dir, "a.txt"), "one\n");
    await git(dir, "add", "a.txt");
    await git(dir, "commit", "-q", "-m", "a");
    await writeFile(join(dir, "a.txt"), "two\n");
    await writeFile(join(dir, "b.txt"), "new\n");
    const { files, warnings } = await collectDiffFiles(dir);
    expect(files).toContain("a.txt");
    expect(warnings).toEqual([]);
  });
  it("includes branch commits when a base ref is given", async () => {
    const dir = await makeRepo();
    await writeFile(join(dir, "a.txt"), "one\n");
    await git(dir, "add", "a.txt");
    await git(dir, "commit", "-q", "-m", "a");
    const base = (await git(dir, "rev-parse", "HEAD")).stdout.trim();
    await git(dir, "checkout", "-q", "-b", "work");
    await writeFile(join(dir, "c.txt"), "branch work\n");
    await git(dir, "add", "c.txt");
    await git(dir, "commit", "-q", "-m", "c");
    const { files } = await collectDiffFiles(dir, base);
    expect(files).toContain("c.txt");
  });
  it("warns on a non-checkout instead of throwing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sup-plain-"));
    const { files, warnings } = await collectDiffFiles(dir);
    expect(files).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe("scanContent", () => {
  it("flags TODO, FIXME and stub lines with numbers", () => {
    const hits = scanContent("a.ts", "ok\n// TODO: finish this\nconst x = stub();\n");
    expect(hits).toMatchObject([
      { file: "a.ts", line: 2 },
      { file: "a.ts", line: 3 },
    ]);
  });
  it("passes clean code", () => {
    expect(scanContent("a.ts", "export const x = 1;\n")).toEqual([]);
  });
  it("does not flag sturdy as stub", () => {
    expect(scanContent("a.ts", "const sturdy = true;\n")).toEqual([]);
  });
});

describe("scanStubs", () => {
  it("scans changed files and skips deleted ones", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sup-scan-"));
    await mkdir(join(dir, "sub"), { recursive: true });
    await writeFile(join(dir, "sub", "a.ts"), "// FIXME: later\n");
    const hits = await scanStubs(dir, ["sub/a.ts", "gone.ts"]);
    expect(hits).toMatchObject([{ file: "sub/a.ts", line: 1 }]);
  });
});

describe("boardCardDone", () => {
  it("trues when the agent's card is in Done", () => {
    const board = boardWith([
      { title: "Doing", assignees: ["Bob"] },
      { title: "Done", assignees: ["Ana"] },
    ]);
    expect(boardCardDone(board, "Ana")).toBe(true);
    expect(boardCardDone(board, "Bob")).toBe(false);
    expect(boardCardDone(board, "Zed")).toBe(false);
  });
});

describe("collectEvidence", () => {
  it("combines diff, stubs and board state", async () => {
    const dir = await makeRepo();
    await writeFile(join(dir, "a.ts"), "// TODO: wire this\n");
    const board = boardWith([{ title: "Doing", assignees: ["Ana"] }]);
    const { evidence, stubHits, warnings } = await collectEvidence({ dir, board, agentName: "Ana" });
    expect(evidence.diffFiles).toContain("a.ts");
    expect(evidence.hasStubOrTodo).toBe(true);
    expect(evidence.boardDone).toBe(false);
    expect(evidence.testsPass).toBeNull();
    expect(stubHits).toMatchObject([{ file: "a.ts", line: 1 }]);
    expect(warnings).toEqual([]);
  });
});
