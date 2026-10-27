// Repo identity key for cross-worktree same-file matching: two worktree
// checkouts of one git repo share a key, so findFileConflicts() still warns
// across them. The key is only used for matching (passed as projectDir).

import { execFile } from "node:child_process";
import { isAbsolute, join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Same normalization as normalizeProjectDir() in fileconflicts.ts. */
function normalizeKey(s: string): string {
  return s.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

/** First non-empty line of git output, or "" when there is none. */
function firstLine(stdout: string): string {
  for (const line of stdout.split("\n")) {
    const t = line.trim();
    if (t) return t;
  }
  return "";
}

/** Repo key for one dir: the shared git common dir, or the dir itself. */
async function repoKeyFor(dir: string): Promise<string> {
  try {
    const { stdout } = await run("git", ["-C", dir, "rev-parse", "--path-format=absolute", "--git-common-dir"]);
    const common = firstLine(stdout);
    if (common) return normalizeKey(common);
  } catch {
    /* old git without --path-format, or not a checkout: try plain form */
  }
  try {
    const { stdout } = await run("git", ["-C", dir, "rev-parse", "--git-common-dir"]);
    const common = firstLine(stdout);
    if (common) return normalizeKey(isAbsolute(common) ? common : join(dir, common));
  } catch {
    /* not a git checkout: fall through to the dir itself */
  }
  return normalizeKey(dir);
}

/** One repo key per dir. Same repo (even across worktrees) maps to the
//  same key; different repos map to different keys. Non-git dirs map to
//  their own normalized path. Never throws for missing/non-git dirs. */
export async function collectRepoKeys(dirs: string[]): Promise<Map<string, string>> {
  const entries = await Promise.all(dirs.map(async (dir) => [dir, await repoKeyFor(dir)] as const));
  return new Map(entries);
}
