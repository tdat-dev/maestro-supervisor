// Pick the rescue template that fits a stuck alert. Pure: kind in, printable
// line out. no-output gets a nudge (wake it and ask for status); loop gets
// explain (stop the cycle and ask what failed — blind retry would deepen the
// loop). waiting gets nothing here: the agent asked a question, and answering
// it belongs to the asking.ts slice, not a canned nudge.

import { rescueLine, type RescueKind } from "./rescue.js";
import type { StuckAlert } from "./stuck.js";

export interface PickedRescue {
  kind: RescueKind;
  line: string;
}

/** Rescue template for a stuck kind, or null when no template fits. */
export function pickRescue(kind: StuckAlert["kind"]): PickedRescue | null {
  if (kind === "no-output") return { kind: "nudge", line: rescueLine("nudge") };
  if (kind === "loop") return { kind: "explain", line: rescueLine("explain") };
  return null;
}
