import { describe, expect, it } from "vitest";
import {
  gradeAttempt,
  gradeQuestion,
  updateMastery,
  type GradableQuestion,
} from "@/lib/scoring";

function mcq(): GradableQuestion {
  return {
    id: "q1",
    type: "SINGLE_CHOICE",
    points: 2,
    options: [
      { id: "o1", text: "A", isCorrect: false },
      { id: "o2", text: "B", isCorrect: true },
      { id: "o3", text: "C", isCorrect: false },
    ],
  };
}

describe("gradeQuestion", () => {
  it("grades a single choice question", () => {
    expect(gradeQuestion(mcq(), { selectedOptionIds: ["o2"] }).correct).toBe(
      true,
    );
    expect(gradeQuestion(mcq(), { selectedOptionIds: ["o1"] }).correct).toBe(
      false,
    );
    expect(gradeQuestion(mcq(), { selectedOptionIds: ["o1", "o2"] }).correct).toBe(
      false,
    );
  });

  it("grades multiple answer with exact set match", () => {
    const question: GradableQuestion = {
      id: "q2",
      type: "MULTIPLE_ANSWER",
      points: 3,
      options: [
        { id: "a", text: "a", isCorrect: true },
        { id: "b", text: "b", isCorrect: true },
        { id: "c", text: "c", isCorrect: false },
      ],
    };
    expect(
      gradeQuestion(question, { selectedOptionIds: ["a", "b"] }).correct,
    ).toBe(true);
    expect(
      gradeQuestion(question, { selectedOptionIds: ["a"] }).correct,
    ).toBe(false);
    expect(
      gradeQuestion(question, { selectedOptionIds: ["a", "b", "c"] }).correct,
    ).toBe(false);
  });

  it("grades short answers case/whitespace insensitively", () => {
    const question: GradableQuestion = {
      id: "q3",
      type: "SHORT_ANSWER",
      points: 1,
      options: [{ id: "s1", text: "Immutable", isCorrect: true }],
    };
    expect(
      gradeQuestion(question, { text: "  immutable " }).correct,
    ).toBe(true);
    expect(gradeQuestion(question, { text: "mutable" }).correct).toBe(false);
  });

  it("never awards points for unexecuted coding answers", () => {
    const question: GradableQuestion = {
      id: "q4",
      type: "CODING",
      points: 5,
      options: [],
    };
    const result = gradeQuestion(question, { code: "print(1)" });
    expect(result.correct).toBeNull();
    expect(result.awardedPoints).toBe(0);
  });
});

describe("gradeAttempt", () => {
  it("computes score against graded (non-coding) points only", () => {
    const questions: GradableQuestion[] = [
      mcq(),
      {
        id: "q2",
        type: "CODING",
        points: 5,
        options: [],
      },
    ];
    const grade = gradeAttempt(
      questions,
      { q1: { selectedOptionIds: ["o2"] } },
      70,
    );
    expect(grade.score).toBe(2);
    expect(grade.percent).toBe(100);
    expect(grade.passed).toBe(true);
    expect(grade.ungradedQuestionIds).toEqual(["q2"]);
  });

  it("fails when below the pass mark", () => {
    const grade = gradeAttempt([mcq()], { q1: { selectedOptionIds: ["o1"] } }, 70);
    expect(grade.percent).toBe(0);
    expect(grade.passed).toBe(false);
  });
});

describe("updateMastery", () => {
  it("jumps to full mastery on the first piece of evidence", () => {
    expect(updateMastery(0, 0, true)).toBe(100);
    expect(updateMastery(0, 0, false)).toBe(0);
  });

  it("moves gradually with existing evidence", () => {
    expect(updateMastery(100, 3, false)).toBe(60);
  });
});
