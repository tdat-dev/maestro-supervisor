// `watch` CLI: poll Maestro's /api/fleet, detect stuck agents, print.
// Read-only: it never sends anything to Maestro.
//
//   node dist/index.js --dir D:\my-project [--fleet URL] [--interval S] [--cookie ...]

import { FLEET_DEFAULT_URL, fetchFleet } from "./fleet.js";
import { cardsOf, readBoardFile, type BoardFile } from "./board.js";
import {
  DEFAULT_DETECTOR_OPTIONS,
  detectStuck,
  tailHash,
  updateTracker,
  type AgentSample,
  type TrackerState,
} from "./stuck.js";
import { suggestHandover } from "./handover.js";
import { collectEvidence } from "./evidence.js";
import { findCardConflicts } from "./cardconflicts.js";
import { verdictDone } from "./verdict.js";
import { formatVerdictLine } from "./report.js";

interface Args {
  fleet: string;
  dirs: string[];
  intervalMs: number;
  cookie?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { fleet: FLEET_DEFAULT_URL, dirs: [], intervalMs: 5000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--fleet") args.fleet = argv[++i] ?? args.fleet;
    else if (a === "--dir") {
      const d = argv[++i];
      if (d) args.dirs.push(d);
    } else if (a === "--interval") args.intervalMs = Math.max(1, Number(argv[++i]) || 5) * 1000;
    else if (a === "--cookie") args.cookie = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node dist/index.js --dir <workspace>... [--fleet URL] [--interval S] [--cookie ...]");
      process.exit(0);
    }
  }
  return args;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const cookie = args.cookie ?? process.env.MAESTRO_DASH_COOKIE;
  let tracker: TrackerState = {};
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const snap = await fetchFleet(args.fleet, cookie ? { cookie } : {});
      const now = Date.now();
      const samples: AgentSample[] = snap.agents.map((a) => ({
        id: a.id,
        name: a.name,
        projectDir: a.projectDir,
        status: a.status,
        finished: a.finished,
        tailHash: tailHash(snap.output[a.id] ?? ""),
        at: now,
      }));
      tracker = updateTracker(tracker, samples);
      const boards = new Map<string, BoardFile>();
      for (const dir of new Set([...args.dirs, ...samples.map((s) => s.projectDir).filter(Boolean)])) {
        try {
          const b = await readBoardFile(dir);
          if (b) boards.set(dir, b);
        } catch {
          /* a corrupt board is Maestro's news, not ours */
        }
      }
      for (const c of findCardConflicts(
        samples.map((s) => ({
          name: s.name,
          projectDir: s.projectDir,
          cards: cardsOf(boards.get(s.projectDir) ?? { version: 0, lists: [] }, s.name),
        })),
      )) {
        console.log(`  ${c.line}`);
      }
      const time = new Date(now).toLocaleTimeString();
      console.log(`--- ${time}: ${samples.length} agent(s) ---`);
      for (const s of samples) {
        const cards = cardsOf(boards.get(s.projectDir) ?? { version: 0, lists: [] }, s.name);
        console.log(`  ${s.name} [${s.status}]${s.finished ? ` (${s.finished})` : ""}${cards.length ? ` — ${cards[0]}` : ""}`);
      }
      for (const s of samples) {
        if (!s.finished || !s.projectDir) continue;
        const board = boards.get(s.projectDir) ?? { version: 0, lists: [] };
        const { evidence, warnings } = await collectEvidence({
          dir: s.projectDir,
          board,
          agentName: s.name,
          tail: snap.output[s.id],
        });
        console.log("  " + formatVerdictLine(s.name, s.finished, verdictDone(evidence)));
        for (const w of warnings) console.log(`    (evidence warn: ${w})`);
      }
      for (const alert of detectStuck(tracker, now, DEFAULT_DETECTOR_OPTIONS)) {
        console.log(`  ! STUCK [${alert.kind}] ${alert.detail}`);
        const to = suggestHandover(
          alert.name,
          alert.projectDir,
          samples.map((s) => ({ name: s.name, projectDir: s.projectDir, status: s.status })),
        );
        console.log(to ? `    → hand over to ${to.to}? (${to.reason}; needs your click)` : "    → nobody idle to hand over to");
      }
    } catch (e) {
      console.log(`--- fleet unreachable (${(e as Error).message}). Is Maestro running with Settings → Remote on? Retrying…`);
    }
    await sleep(args.intervalMs);
  }
}

void main();