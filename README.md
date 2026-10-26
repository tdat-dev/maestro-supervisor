# maestro-supervisor

> Supervisor là module mới làm trong hackathon 26/10 tới 4/11. Maestro (v0.10.x) chỉ là nền tảng có sẵn mà nó cắm vào, không phải phần đem đi chấm.

Supervisor watches a fleet of AI coding agents running inside [Maestro](https://github.com/tdat-dev/maestro)
and answers for the human in charge: who is stuck, who is really done, what each
agent costs, and what needs a click. One engine under the hood (evidence from
screens, diffs, tests, board), one plain sentence plus one button on top.

## The 5 must-ship features (locked)

1. **Traffic-light stuck radar.** Minutes stuck + loop count + auto needs-you.
   Skin: green / yellow / red with `Stuck 12m, looping 5x`. (`stuck.ts`, `traffic.ts`)
2. **Fake-done verdict + Recheck.** Never trusts "done". Red when the diff is
   empty, a stub or TODO is left, tests fail, or the board card is still open,
   with the reason in plain words (`Not runnable: login step fails`) and a
   Recheck button. (`verdict.ts`)
3. **One-click rescue + plain questions.** Nudge / retry-step prompts to exactly
   the stuck pane after approval, plus agent questions translated to plain
   words with a safe answer. Rescue lines stay short so they deliver in one
   burst. (`outbox.ts`, `handover.ts`)
4. **Real-money cost + budget alert.** `Ana spent ~$3 of ~$20`, alert at your
   own limit. No tokens, no $/hr jargon. (`cost.ts`)
5. **Safety net: risk gate + Back to last working.** `rm -rf`, force push,
   hard reset and friends wait for one click; a checkpoint on green gives you a
   Restore button after a bad edit. (`gate.ts`)

## Who it is for (Impact)

- **Pro devs** who code with agents overnight: no more waking up to 6 hours of
  loops, fake-dones, or out-of-scope edits. Evidence over claims.
- **Non-tech vibe coders** who want a working product: traffic lights instead
  of terminal walls, verdicts in plain words, rescue in one click, money in
  dollars, and a way back when the agent breaks things.
- **Tech-savvy fleet commanders** running 6-12 panes: one screen that only
  shows the panes needing a human, conflicts caught before merge, handover
  briefs that let a new model continue with zero re-explaining.

## Demos (3 minutes each)

- **D1, fake-done catch:** an agent reports done on stub code with a failing
  test. The verdict card flips red live with the reason; after the fix and a
  Recheck it flips green.
- **D2, stuck rescue:** a red light with minutes + loop count, one Nudge that
  resumes the agent, then a Restore after a deliberately bad edit.

Stories first for generalist judges, evidence (diff, tests, minutes, counts)
right underneath for engineer judges.

## How it plugs into Maestro

Supervisor is a **separate process**. It touches no Maestro code. It reads two
things Maestro already exposes and writes one:

- `GET /api/fleet` on the local dashboard HTTP server (`http://127.0.0.1:8477`,
  enable in Maestro under Settings, Remote): a JSON snapshot of every agent
  (`needs` / `active` / `idle` / `stopped`) plus a plain-text tail of each
  agent's screen. A non-browser client just sends the `X-Maestro: 1` header.
- `.maestro/board.json` in each workspace folder: the kanban board
  (`{ version: 2, lists: [...] }`), read straight from disk, never written.
- `.maestro/outbox.jsonl` in each workspace folder: one JSON line per rescue
  message (`{ from, to, message, now }`). Maestro drains it and types the
  message into the target agent with Enter. Short lines only.

## Signal rule

Five queries, not a schema: stuck? / done-really? / asking? / spent? / risky?
A signal only ships if it can change the traffic light, the verdict card, or
the cost line.

## Quickstart

```powershell
# 1. In Maestro: Settings, Remote, turn the dashboard on (no password needed on localhost)
# 2. Run the watcher:
npm install
npm run build
npm start -- --dir D:\my-project
```

Options: `--fleet http://127.0.0.1:8477`, `--dir <workspace>...` (repeatable),
`--interval <seconds>` (default 5), `--cookie <session>` when the dashboard has a password.

```powershell
npm test   # vitest unit tests
```

## Layout

```
src/
  fleet.ts      poll + parse the /api/fleet snapshot (read-only)
  board.ts      read .maestro/board.json from disk (read-only)
  outbox.ts     rescue send path: short lines into .maestro/outbox.jsonl
  stuck.ts      stuck / waiting-too-long / loop detector (pure, tested)
  traffic.ts    green / yellow / red skin over alerts (pure, tested)
  verdict.ts    fake-done verdict from diff + tests + board (pure, tested)
  cost.ts       real-money cost line + budget alert (pure, tested)
  gate.ts       risky-command matcher behind one human click (pure, tested)
  summarize.ts  progress summarizer via a Meta model (prompt builder done, wiring next)
  handover.ts   handover suggestion (pure, tested; execution needs approval)
  index.ts      `watch` CLI: poll, detect, print
```

## 10-day build order

- Days 1-2: read-only watcher + stuck radar with traffic lights (this skeleton).
- Days 3-4: fake-done verdict + Recheck wired to real diffs, tests, board.
- Days 5-6: one-click rescue + plain questions + real-money cost wired to usage.
- Day 7: risk gate + checkpoints + Restore.
- Days 8-9: D1 + D2 demos running end to end + 3-minute video.
- Day 10: buffer + submit.

Solo entry. Work happens outside the WhaleLO shift (14:00-17:30).

## Roadmap (not in the 10 days)

Pre-merge conflict view, risk-ranked review queue, burn-rate analytics,
per-CLI parity (Gemini/Qwen/Copilot), board lock service, voice dispatch,
scheduled agents, cross-workspace fleets, full browser-agent ops.

## License

[MIT](LICENSE)
