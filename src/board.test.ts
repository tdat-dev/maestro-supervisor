import { describe, expect, it } from "vitest";
import { BoardFileCorrupt, cardsOf, parseBoardFile, summarizeBoard } from "./board.js";

const board = () =>
  parseBoardFile(
    JSON.stringify({
      version: 2,
      lists: [
        { id: "l1", title: "To do", cards: [{ id: "c1", title: "Fix login", desc: "", assignee: "Ana" }] },
        { id: "l2", title: "Doing", cards: [{ id: "c2", title: "Add test", desc: "", assignee: "Bob" }] },
        { id: "l3", title: "Done", cards: [{ id: "c3", title: "Old", desc: "", assignee: "Ana" }] },
      ],
    }),
  );

describe("parseBoardFile", () => {
  it("parses a v2 board", () => {
    expect(board().lists.map((l) => l.title)).toEqual(["To do", "Doing", "Done"]);
  });
  it("rejects bad JSON and bad shapes", () => {
    expect(() => parseBoardFile("{nope")).toThrow(BoardFileCorrupt);
    expect(() => parseBoardFile("{}")).toThrow(BoardFileCorrupt);
  });
});

describe("summarizeBoard", () => {
  it("counts cards and open work per agent", () => {
    expect(summarizeBoard(board())).toEqual({
      lists: [
        { title: "To do", cards: 1 },
        { title: "Doing", cards: 1 },
        { title: "Done", cards: 1 },
      ],
      openByAssignee: { Ana: 1, Bob: 1 },
    });
  });
});

describe("cardsOf", () => {
  it("lists an agent's open cards", () => {
    expect(cardsOf(board(), "Ana")).toEqual(["Fix login"]);
    expect(cardsOf(board(), "Nobody")).toEqual([]);
  });
});
