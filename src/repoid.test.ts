import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { collectRepoKeys } from "./repoid.js";

const run = promisify(execFile);
const git = (dir: string, ...args: string[]) => run("git", ["-C", dir, ...args]);

async function makeRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "sup-repo-"));
  await git(dir, "init", "-q");
  await git(dir, "config", "user.email", "t@t");
  await git(dir, "config", "user.name", "t");
  await git(dir, "commit", "-q", "--allow-empty", "-m", "root");
  return dir;
}

describe("collectRepoKeys", () => {
  it("maps the same dir twice to the same key", async () => {
    const dir = await makeRepo();
    const keys = await collectRepoKeys([dir, dir]);
    expect(keys.size).toBe(1);
    expect(keys.get(dir)).toBeDefined();
    const again = await collectRepoKeys([dir]);
    expect(again.get(dir)).toBe(keys.get(dir));
  });
  it("maps two different repos to different keys", async () => {
    const a = await makeRepo();
    const b = await makeRepo();
    const keys = await collectRepoKeys([a, b]);
    expect(keys.get(a)).toBeDefined();
    expect(keys.get(b)).toBeDefined();
    expect(keys.get(a)).not.toBe(keys.get(b));
  });
  it("maps a repo root and its subdir to the same key", async () => {
    const dir = await makeRepo();
    const sub = join(dir, "sub");
    await mkdir(sub, { recursive: true });
    await writeFile(join(sub, "f.txt"), "x\n");
    const keys = await collectRepoKeys([dir, sub]);
    expect(keys.get(dir)).toBe(keys.get(sub));
  });
  it("falls back to the normalized dir for non-git dirs without throwing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sup-plain-"));
    const keys = await collectRepoKeys([dir]);
    const expected = dir.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
    expect(keys.get(dir)).toBe(expected);
  });
  it("maps linked worktrees of one repo to the same key", async () => {
    const dir = await makeRepo();
    const parent = await mkdtemp(join(tmpdir(), "sup-wt-"));
    const wt = join(parent, "wt1");
    await git(dir, "worktree", "add", wt);
    try {
      const keys = await collectRepoKeys([dir, wt]);
      expect(keys.get(dir)).toBe(keys.get(wt));
    } finally {
      await git(dir, "worktree", "remove", "--force", wt);
    }
  });
});
