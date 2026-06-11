import { describe, expect, test } from "bun:test";
import { solveCourseTimetabling, type CourseOffering } from "./course-timetabling";

describe("solveCourseTimetabling", () => {
  test("splits 4 SKS courses and avoids hard conflicts", () => {
    const courses: CourseOffering[] = [
      { id: "if2211", code: "IF2211", name: "Strategi Algoritma", credits: 3, lecturer: "Dosen A", className: "K01", cohort: "IF 2024", students: 60, roomType: "Kuliah" },
      { id: "if2224", code: "IF2224", name: "TBFO", credits: 4, lecturer: "Dosen B", className: "K01", cohort: "IF 2024", students: 60, roomType: "Kuliah" },
      { id: "if2240", code: "IF2240", name: "Basis Data", credits: 3, lecturer: "Dosen A", className: "K01", cohort: "IF 2024", students: 60, roomType: "Kuliah" },
    ];

    const result = solveCourseTimetabling(courses);

    expect(result.scheduled).toHaveLength(4);
    expect(result.hardConflictCount).toBe(0);
    expect(result.scheduled.filter((session) => session.courseId === "if2224")).toHaveLength(2);
  });
});
