// Same-file conflict alarm: two agents whose diffs touch the same file may
// overwrite each other's work. Pure: matching only, no git calls here.

/** One agent's changed files, as listed by collectDiffFiles(). */
export interface AgentDiffFiles {
  name: string;
  projectDir: string;
  diffFiles: string[];
}

export interface FileConflict {
  agents: [string, string];
  file: string;
  line: string;
}

/** Normalize a diff path for comparison: forward slashes, lowercase. */
export function normalizeDiffPath(p: string): string {
  return p.replace(/\\/g, "/").toLowerCase();
}

/** Normalize a workspace dir for comparison: unified slashes, lowercased. */
export function normalizeProjectDir(dir: string): string {
  return dir.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

/** Display form of a diff path: forward slashes, original case kept. */
function displayPath(p: string): string {
  return p.replace(/\\/g, "/");
}

/** Every unordered pair of agents sharing at least one normalized diff path.
//  One conflict per (pair, file); same-name entries never pair up. Pure. */
export function findFileConflicts(agents: AgentDiffFiles[]): FileConflict[] {
  const conflicts: FileConflict[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const aFiles = new Map<string, string>();
    for (const f of a.diffFiles) {
      const n = normalizeDiffPath(f);
      if (!aFiles.has(n)) aFiles.set(n, displayPath(f));
    }
    for (let j = i + 1; j < agents.length; j++) {
      const b = agents[j];
      if (a.name === b.name) continue;
      // Same workspace only: different projects often share relative paths.
      // Cross-worktree same-repo matching lands in issue #4.
      if (normalizeProjectDir(a.projectDir) !== normalizeProjectDir(b.projectDir)) continue;
      for (const f of b.diffFiles) {
        const n = normalizeDiffPath(f);
        const file = aFiles.get(n);
        if (file === undefined) continue;
        const pair = [a.name, b.name].sort();
        const key = `${pair[0]}|${pair[1]}|${n}`;
        if (seen.has(key)) continue;
        seen.add(key);
        conflicts.push({
          agents: [pair[0], pair[1]],
          file,
          line: `! CONFLICT ${pair[0]} and ${pair[1]} both touch ${file}`,
        });
      }
    }
  }
  return conflicts;
}
