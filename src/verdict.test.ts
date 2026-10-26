import { describe, expect, it } from "vitest";
import { verdictDone, type DoneEvidence } from "./verdict.js";

const good: DoneEvidence = { diffFiles: ["a.ts"], testsPass: true, boardDone: true, hasStubOrTodo: false };

describe("verdictDone", () => {
  it("greens when diff, tests and board all check out", () => {
    expect(verdictDone(good)).toMatchObject({ ok: true, level: "green" });
  });
  it("reds an empty diff", () => {
    const v = verdictDone({ ...good, diffFiles: [] });
    expect(v).toMatchObject({ ok: false, level: "red" });
    expect(v.reason).toMatch(/empty/i);
  });
  it("reds stub or TODO code", () => {
    const v = verdictDone({ ...good, hasStubOrTodo: true });
    expect(v).toMatchObject({ ok: false, level: "red" });
    expect(v.reason).toMatch(/stub|TODO/i);
  });
  it("reds failing tests with the failing step in plain words", () => {
    const v = verdictDone({ ...good, testsPass: false, failDetail: "login step fails" });
    expect(v).toMatchObject({ ok: false, level: "red" });
    expect(v.reason).toContain("login step fails");
  });
  it("reds an open board card", () => {
    expect(verdictDone({ ...good, boardDone: false })).toMatchObject({ ok: false, level: "red" });
  });
  it("lets missing tests pass when nothing else is wrong", () => {
    expect(verdictDone({ ...good, testsPass: null })).toMatchObject({ ok: true });
  });
});
