import { describe, expect, it } from "vitest";
import { selectMockQuestions } from "@/lib/mock";

describe("selectMockQuestions", () => {
  const ids = (item: string) => item;

  it("draws round-robin across chapters", () => {
    const perChapter = [
      ["a1", "a2", "a3"],
      ["b1", "b2", "b3"],
    ];
    expect(selectMockQuestions(perChapter, 4, ids)).toEqual(["a1", "b1", "a2", "b2"]);
  });

  it("stops at the target size", () => {
    const perChapter = [Array.from({ length: 10 }, (_, i) => `a${i}`)];
    expect(selectMockQuestions(perChapter, 3, ids)).toHaveLength(3);
    expect(selectMockQuestions(perChapter, 3, ids)).toEqual(["a0", "a1", "a2"]);
  });

  it("returns a smaller mock when the module has fewer questions", () => {
    const perChapter = [["a1"], ["b1"], ["c1"]];
    expect(selectMockQuestions(perChapter, 20, ids)).toEqual(["a1", "b1", "c1"]);
  });

  it("ignores empty chapters", () => {
    const perChapter = [[], ["b1", "b2"], []];
    expect(selectMockQuestions(perChapter, 5, ids)).toEqual(["b1", "b2"]);
  });

  it("handles an empty module", () => {
    expect(selectMockQuestions([], 20, ids)).toEqual([]);
  });

  it("de-duplicates items shared across chapters", () => {
    const perChapter = [
      ["same", "a"],
      ["same", "b"],
    ];
    expect(selectMockQuestions(perChapter, 4, ids)).toEqual(["same", "a", "b"]);
  });

  it("supports object items with a custom key", () => {
    const perChapter = [[{ id: "1", prompt: "p1" }, { id: "2", prompt: "p2" }]];
    const result = selectMockQuestions(perChapter, 2, (q) => q.prompt);
    expect(result.map((q) => q.id)).toEqual(["1", "2"]);
  });
});
