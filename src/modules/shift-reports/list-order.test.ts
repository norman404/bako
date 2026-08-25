import { describe, expect, it } from "vitest";

import { sortShiftList } from "./list-order";

interface TimedEntry {
  id: string;
  createdAt: Date;
}

const ENTRIES: TimedEntry[] = [
  { id: "middle", createdAt: new Date("2026-08-01T12:00:00Z") },
  { id: "oldest", createdAt: new Date("2026-08-01T08:00:00Z") },
  { id: "newest", createdAt: new Date("2026-08-01T16:00:00Z") },
];

describe("sortShiftList", () => {
  // CASE: The operator chooses chronological order from oldest to newest.
  // VALIDATES: The shared sorter orders entries by their date and time ascending.
  it("should order entries from oldest to newest when order is ascending", () => {
    // Arrange
    const entries = ENTRIES;

    // Act
    const result = sortShiftList(entries, (entry) => entry.createdAt, "ascending");

    // Assert
    expect(result.map((entry) => entry.id)).toEqual(["oldest", "middle", "newest"]);
  });

  // CASE: The operator chooses chronological order from newest to oldest.
  // VALIDATES: The shared sorter orders entries by their date and time descending.
  it("should order entries from newest to oldest when order is descending", () => {
    // Arrange
    const entries = ENTRIES;

    // Act
    const result = sortShiftList(entries, (entry) => entry.createdAt, "descending");

    // Assert
    expect(result.map((entry) => entry.id)).toEqual(["newest", "middle", "oldest"]);
  });

  // CASE: A report keeps its original collection for other consumers.
  // VALIDATES: Sorting returns a new collection without mutating the input.
  it("should not mutate the input collection when sorting entries", () => {
    // Arrange
    const entries = [...ENTRIES];
    const originalOrder = entries.map((entry) => entry.id);

    // Act
    const result = sortShiftList(entries, (entry) => entry.createdAt, "descending");

    // Assert
    expect(result).not.toBe(entries);
    expect(entries.map((entry) => entry.id)).toEqual(originalOrder);
  });
});
