// Evidence collection for the fake-done verdict: real git diffs, stub/TODO
// scan over changed lines, test results off the screen tail, and the board
// card state. It feeds verdictDone() (see verdict.ts).

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { BoardFile } from "./board.js";
import type { DoneEvidence } from "./verdict.js";
import { testsFromTail } from "./tests.js";

const run = promisify(execFile);

/** Files changed in `dir`: uncommitted work (tracked and untracked) plus,
//  when `baseRef` is given, everything on this branch since it forked. Empty
//  with a warning when `dir` is not a git checkout. */
export async function collectDiffFiles(dir: string, baseRef?: string): Promise<{ files: string[]; warnings: string[] }> {
  const warnings: string[] = [];
  const names = new Set<string>();
  const lines = async (args: string[]): Promise<void> => {
    try {
      const { stdout } = await run("git", ["-C", dir, ...args]);
      for (const line of stdout.split("\n")) {
        const f = line.trim();
        if (f) names.add(f);
      }
    } catch {
      warnings.push(`git ${args.slice(0, 2).join(" ")} failed in ${dir}`);
    }
  };
  await lines(["diff", "--name-only", "HEAD"]);
  await lines(["ls-files", "--others", "--exclude-standard"]);
  if (baseRef) await lines(["diff", "--name-only", `${baseRef}...HEAD`, "--", "."]);
  if (names.size === 0 && warnings.length > 0) warnings.push(`${dir} may not be a git checkout`);
  return { files: [...names].sort(), warnings };
}

/** Markers of unfinished code, matched case-insensitively per line. */
const STUB_RES = [/\bTODO\b/i, /\bFIXME\b/i, /\bTBD\b/i, /\bstub\b/i, /not[ -]?implemented/i, /placeholder/i];

export interface StubHit {
  file: string;
  line: number;
  text: string;
}

/** Scan file contents for stub markers. Pure. */
export function scanContent(file: string, content: string): StubHit[] {
  const hits: StubHit[] = [];
  content.split("\n").forEach((text, i) => {
    if (STUB_RES.some((re) => re.test(text))) hits.push({ file, line: i + 1, text: text.trim().slice(0, 120) });
  });
  return hits;
}

/** Max bytes read per changed file for the stub scan. */
export const MAX_SCAN_BYTES = 200_000;

/** Scan the changed files under `dir`. Unreadable files are skipped. */
export async function scanStubs(dir: string, files: string[]): Promise<StubHit[]> {
  const hits: StubHit[] = [];
  for (const f of files) {
    try {
      const content = await readFile(join(dir, f), "utf8");
      hits.push(...scanContent(f, content.slice(0, MAX_SCAN_BYTES)));
    } catch {
      /* deleted or binary: nothing to scan */
    }
  }
  return hits;
}

/** True when the agent's card sits in a Done list. Pure. */
export function boardCardDone(board: BoardFile, agentName: string): boolean {
  for (const l of board.lists) {
    if (!/done/i.test(l.title)) continue;
    if (l.cards.some((c) => c.assignee === agentName)) return true;
  }
  return false;
}

export interface EvidenceInput {
  dir: string;
  baseRef?: string;
  board: BoardFile;
  agentName: string;
  /** Screen tail: test results read off it (no test running here). */
  tail?: string;
}

export interface CollectedEvidence {
  evidence: DoneEvidence;
  stubHits: StubHit[];
  warnings: string[];
}

/** Full evidence for one agent: diff files + stub scan + tests + board.
//  testsPass stays null when the tail shows no test run. */
export async function collectEvidence(input: EvidenceInput): Promise<CollectedEvidence> {
  const { files, warnings } = await collectDiffFiles(input.dir, input.baseRef);
  const stubHits = await scanStubs(input.dir, files);
  const tailTests: { pass: boolean | null; detail?: string } = input.tail
    ? testsFromTail(input.tail)
    : { pass: null };
  return {
    evidence: {
      diffFiles: files,
      testsPass: tailTests.pass,
      ...(tailTests.detail ? { failDetail: tailTests.detail } : {}),
      boardDone: boardCardDone(input.board, input.agentName),
      hasStubOrTodo: stubHits.length > 0,
    },
    stubHits,
    warnings,
  };
}
