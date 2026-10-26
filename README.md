# maestro-supervisor

> Supervisor là module mới làm trong hackathon 26/10 tới 4/11. Maestro (v0.10.x) chỉ là nền tảng có sẵn mà nó cắm vào, không phải phần đem đi chấm.

Supervisor watches a fleet of AI coding agents running inside [Maestro](https://github.com/tdat-dev/maestro)
and answers three questions a human orchestrator would ask:

1. **Is any agent stuck or looping?** (no output for too long, waiting on the user for too long, same screen over and over)
2. **What is each agent doing?** (progress summary per agent, via a Meta model)
3. **Who should take over?** (safe handover suggestion to another agent; risky moves still need a human click)

## How it plugs into Maestro (read-only)

Supervisor is a **separate process**. It touches no Maestro code and writes nothing
into Maestro. It only reads two things Maestro already exposes:

- `GET /api/fleet` on the local dashboard HTTP server (`http://127.0.0.1:8477`,
  enable in Maestro under Settings, Remote): a JSON snapshot of every agent
  (`needs` / `active` / `idle` / `stopped`) plus a plain-text tail of each
  agent's screen. A non-browser client just sends the `X-Maestro: 1` header.
- `.maestro/board.json` in each workspace folder: the kanban board
  (`{ version: 2, lists: [...] }`), read straight from disk.

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
  stuck.ts      stuck / waiting-too-long / loop detector (pure, tested)
  summarize.ts  progress summarizer via a Meta model (days 3-5; prompt builder done, wiring next)
  handover.ts   handover suggestion (pure, tested; execution stays behind Maestro's manual approval)
  index.ts      `watch` CLI: poll, detect, print
```

## 10-day plan

- Days 1-2: read-only watcher on the fleet snapshot + board files (this skeleton).
- Days 3-5: stuck detector tuning + per-agent progress summaries via a Meta model + progress dashboard.
- Days 6-7: handover suggestions.
- Days 8-9: 3-agent parallel demo + 3-minute video.
- Day 10: buffer + submit.

Solo entry. Work happens outside the WhaleLO shift (14:00-17:30).

## License

[MIT](LICENSE)
