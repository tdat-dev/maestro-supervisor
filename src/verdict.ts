// Fake-done verdict: never trust the agent's "done". A claim is checked
// against the diff, the tests and the board card; anything missing flips the
// card red with a plain-language reason and a Recheck. Pure: evidence
// collection (git diff, test runs, board reads) wires in later.

export interface DoneEvidence {
  /** Files changed for this task. Empty means nothing was actually done. */
  diffFiles: string[];
  /** Test result. Null when no tests ran for this task. */
  testsPass: boolean | null;
  /** The board card sits in Done. */
  boardDone: boolean;
  /** Stub, TODO or placeholder left in the changed code. */
  hasStubOrTodo: boolean;
  /** Failing step or test name, when known (for the plain-language reason). */
  failDetail?: string;
}

export interface DoneVerdict {
  ok: boolean;
  level: "red" | "green";
  reason: string;
  recheckable: true;
}

export function verdictDone(ev: DoneEvidence): DoneVerdict {
  const fail = (reason: string): DoneVerdict => ({ ok: false, level: "red", reason, recheckable: true });
  if (ev.diffFiles.length === 0) return fail("Not done: the diff is empty, nothing changed.");
  if (ev.hasStubOrTodo) return fail("Not done: stub or TODO left in the changed code.");
  if (ev.testsPass === false) {
    return fail(
      ev.failDetail ? `Not runnable: ${ev.failDetail}.` : "Not done: tests are failing.",
    );
  }
  if (!ev.boardDone) return fail("Not done: the board card is still open.");
  return { ok: true, level: "green", reason: "Done: diff, tests and board card all check out.", recheckable: true };
}
