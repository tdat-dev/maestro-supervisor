// Read-only view of the Maestro fleet, through the local dashboard HTTP API
// Maestro already serves (Settings → Remote). No Maestro code is touched:
// Supervisor is a separate process that polls GET /api/fleet the same way
// the dashboard page does.

/** One agent row, as Maestro's /api/fleet serves it. */
export interface FleetAgent {
  id: string;
  name: string;
  wsId: string;
  wsName: string;
  project: string;
  projectKey: string;
  projectDir: string;
  /** "needs" | "active" | "idle" | "stopped" (anything else passes through). */
  status: string;
  uptime: string;
  finished: string | null;
  files: unknown;
  finish: unknown;
}

export interface FleetSnapshot {
  agents: FleetAgent[];
  /** Plain-text tail of each running agent's screen, by agent id. */
  output: Record<string, string>;
}

export const FLEET_DEFAULT_URL = "http://127.0.0.1:8477";

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Parse the /api/fleet body, tolerating missing fields (a newer or older
 *  Maestro than this was written against still yields a usable snapshot). */
export function parseFleetSnapshot(json: unknown): FleetSnapshot {
  if (!json || typeof json !== "object") return { agents: [], output: {} };
  const o = json as Record<string, unknown>;
  const agents = (Array.isArray(o.agents) ? o.agents : []).map((a): FleetAgent => {
    const r = (a ?? {}) as Record<string, unknown>;
    return {
      id: str(r.id),
      name: str(r.name),
      wsId: str(r.wsId),
      wsName: str(r.wsName),
      project: str(r.project),
      projectKey: str(r.projectKey),
      projectDir: str(r.projectDir),
      status: str(r.status) || "stopped",
      uptime: str(r.uptime),
      finished: typeof r.finished === "string" ? r.finished : null,
      files: r.files ?? null,
      finish: r.finish ?? null,
    };
  });
  const output: Record<string, string> = {};
  if (o.output && typeof o.output === "object") {
    for (const [k, v] of Object.entries(o.output as Record<string, unknown>)) {
      if (typeof v === "string" && v) output[k] = v;
    }
  }
  return { agents, output };
}

export interface FetchFleetOptions {
  /** Dashboard session cookie, only when Maestro's dashboard has a password. */
  cookie?: string;
  signal?: AbortSignal;
}

/** GET /api/fleet. The dashboard server wants `X-Maestro: 1` on API calls;
 *  a non-browser client sends no Origin, which the server accepts. */
export async function fetchFleet(
  baseUrl: string = FLEET_DEFAULT_URL,
  opts: FetchFleetOptions = {},
): Promise<FleetSnapshot> {
  const headers: Record<string, string> = { "X-Maestro": "1" };
  if (opts.cookie) headers.Cookie = opts.cookie;
  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/fleet`, {
    headers,
    signal: opts.signal,
  });
  if (!res.ok) throw new Error(`fleet snapshot failed: HTTP ${res.status}`);
  return parseFleetSnapshot(await res.json());
}
