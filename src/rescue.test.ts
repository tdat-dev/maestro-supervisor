import { describe, expect, it } from "vitest";
import { MAX_DIRECT_CHARS, rescueBody } from "./outbox.js";
import { explainLine, nudgeLine, rescueLine, retryStepLine, safeAnswerLine } from "./rescue.js";

describe("rescue templates", () => {
  it("nudge fits one burst and asks for a one-line status", () => {
    const line = nudgeLine();
    expect(line.length).toBeLessThanOrEqual(MAX_DIRECT_CHARS);
    expect(line).toMatch(/one line/);
    expect(rescueBody(line, ".maestro/rescue/nudge.md")).toEqual({ kind: "direct", text: line });
  });

  it("explain fits one burst and asks for tried/failed/needed", () => {
    const line = explainLine();
    expect(line.length).toBeLessThanOrEqual(MAX_DIRECT_CHARS);
    expect(line).toMatch(/what you tried/);
    expect(line).toMatch(/what failed/);
    expect(line).toMatch(/what you need/);
  });

  it("retry-step with a short step goes direct", () => {
    const line = retryStepLine("npm test");
    expect(line).toMatch(/npm test/);
    expect(line).toMatch(/pass or fail/);
    expect(rescueBody(line, ".maestro/rescue/retry.md")).toEqual({ kind: "direct", text: line });
  });

  it("retry-step with a long step rides a file pointer", () => {
    const line = retryStepLine("rebuild the docker image with --no-cache and rerun the full e2e suite twice");
    expect(line.length).toBeGreaterThan(MAX_DIRECT_CHARS);
    const body = rescueBody(line, ".maestro/rescue/retry.md");
    expect(body.kind).toBe("file");
    if (body.kind === "file") expect(body.pointer).toMatch(/\.maestro\/rescue\/retry\.md/);
  });

  it("rescueLine dispatches by kind", () => {
    expect(rescueLine("nudge")).toBe(nudgeLine());
    expect(rescueLine("explain")).toBe(explainLine());
    expect(rescueLine("retry-step", "npm test")).toBe(retryStepLine("npm test"));
  });

  it("short safe answer goes direct with answer and consequence", () => {
    const line = safeAnswerLine("No", "nothing runs");
    expect(line).toMatch(/Safe answer: No/);
    expect(line).toMatch(/nothing runs/);
    expect(rescueBody(line, ".maestro/rescue/answer.md")).toEqual({ kind: "direct", text: line });
  });

  it("long safe answer rides a file pointer", () => {
    const line = safeAnswerLine(
      "allow once",
      "the agent runs the migration on the staging database and rewrites every snapshot file",
    );
    expect(line.length).toBeGreaterThan(MAX_DIRECT_CHARS);
    expect(rescueBody(line, ".maestro/rescue/answer.md").kind).toBe("file");
  });
});
