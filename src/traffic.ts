// Traffic-light skin over stuck alerts: green / yellow / red in plain words,
// no log reading needed. Pure.

import type { StuckAlert } from "./stuck.js";

export type Light = "green" | "yellow" | "red";

export interface LightState {
  light: Light;
  line: string;
}

/** One light per agent: red while stuck or looping, yellow while waiting on
 *  the user, green otherwise. Pure. */
export function alertToLight(alert: StuckAlert | null, agentName: string): LightState {
  if (!alert) return { light: "green", line: `${agentName} is running fine.` };
  if (alert.kind === "waiting") return { light: "yellow", line: alert.detail };
  return { light: "red", line: alert.detail };
}
