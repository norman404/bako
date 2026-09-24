import { describe, expect, it } from "vitest";

import { formToSchedule, isScheduleActive, parseWeeklySchedule, scheduleToForm, type WeeklySchedule } from "./weekly-schedule";

const MONDAY = 1;
const TUESDAY = 2;
const FRIDAY = 5;
const SATURDAY = 6;

// 2026-09-21 is a Monday.
function localDate(day: number, hours: number, minutes = 0): Date {
  return new Date(2026, 8, 21 + (day - MONDAY), hours, minutes);
}

const AFTERNOON: WeeklySchedule = {
  windows: [{ days: [MONDAY, TUESDAY], startMinute: 14 * 60, endMinute: 18 * 60 }],
  validFrom: null,
  validUntil: null,
};

const LATE_NIGHT: WeeklySchedule = {
  windows: [{ days: [FRIDAY], startMinute: 22 * 60, endMinute: 2 * 60 }],
  validFrom: null,
  validUntil: null,
};

describe("isScheduleActive", () => {
  // CASE: A cashier adds a product at the exact minute a promotion starts.
  // VALIDATES: The window start is inclusive.
  it("should be active at the start minute", () => {
    // Arrange
    const at = localDate(MONDAY, 14, 0);

    // Act
    const result = isScheduleActive(AFTERNOON, at);

    // Assert
    expect(result).toBe(true);
  });

  // CASE: A cashier adds a product at 17:59 and another at 18:00 on a 14:00–18:00 promotion.
  // VALIDATES: The window end is exclusive, so 18:00 is already outside.
  it("should be inactive at the end minute", () => {
    // Arrange
    const lastMinute = localDate(MONDAY, 17, 59);
    const endMinute = localDate(MONDAY, 18, 0);

    // Act
    const insideResult = isScheduleActive(AFTERNOON, lastMinute);
    const endResult = isScheduleActive(AFTERNOON, endMinute);

    // Assert
    expect(insideResult).toBe(true);
    expect(endResult).toBe(false);
  });

  // CASE: The promotion hours match but the weekday is not configured.
  // VALIDATES: Weekday filtering is applied.
  it("should be inactive on a day outside the window", () => {
    // Arrange
    const at = localDate(FRIDAY, 15, 0);

    // Act
    const result = isScheduleActive(AFTERNOON, at);

    // Assert
    expect(result).toBe(false);
  });

  // CASE: A Friday 22:00–02:00 promotion is evaluated early Saturday morning.
  // VALIDATES: A window crossing midnight belongs to the day it starts on.
  it("should stay active after midnight for a window that started the previous day", () => {
    // Arrange
    const fridayNight = localDate(FRIDAY, 23, 30);
    const saturdayEarly = localDate(SATURDAY, 1, 59);
    const saturdayLate = localDate(SATURDAY, 22, 30);

    // Act
    const results = [fridayNight, saturdayEarly, saturdayLate].map((at) => isScheduleActive(LATE_NIGHT, at));

    // Assert
    expect(results).toEqual([true, true, false]);
  });

  // CASE: A promotion is only valid during a date range.
  // VALIDATES: validFrom is inclusive and validUntil is exclusive.
  it("should respect the validity range", () => {
    // Arrange
    const validFrom = localDate(TUESDAY, 0, 0).getTime();
    const schedule: WeeklySchedule = { ...AFTERNOON, validFrom, validUntil: validFrom + 24 * 60 * 60 * 1000 };

    // Act
    const beforeRange = isScheduleActive(schedule, localDate(MONDAY, 15, 0));
    const insideRange = isScheduleActive(schedule, localDate(TUESDAY, 15, 0));

    // Assert
    expect(beforeRange).toBe(false);
    expect(insideRange).toBe(true);
  });
});

describe("parseWeeklySchedule", () => {
  // CASE: A stored schedule is loaded from the database JSON column.
  // VALIDATES: Valid input is accepted with sorted, unique days.
  it("should parse a valid schedule", () => {
    // Arrange
    const input = { windows: [{ days: [2, 1, 1], startMinute: 840, endMinute: 1080 }] };

    // Act
    const result = parseWeeklySchedule(input);

    // Assert
    expect(result).toEqual({
      windows: [{ days: [1, 2], startMinute: 840, endMinute: 1080 }],
      validFrom: null,
      validUntil: null,
    });
  });

  // CASE: Corrupt or out-of-range schedules reach the parser.
  // VALIDATES: Invalid windows, empty schedules and inverted ranges are rejected.
  it("should reject invalid schedules", () => {
    // Arrange
    const inputs: unknown[] = [
      null,
      { windows: [] },
      { windows: [{ days: [7], startMinute: 0, endMinute: 60 }] },
      { windows: [{ days: [1], startMinute: 60, endMinute: 60 }] },
      { windows: [{ days: [1], startMinute: 0, endMinute: 1441 }] },
      { windows: [{ days: [1], startMinute: 0, endMinute: 60 }], validFrom: 10, validUntil: 5 },
    ];

    // Act
    const results = inputs.map((input) => parseWeeklySchedule(input));

    // Assert
    expect(results.every((result) => result === null)).toBe(true);
  });
});

describe("formToSchedule", () => {
  // CASE: A manager configures an afternoon promotion valid through October 31.
  // VALIDATES: The last day shown in the form stays active until its final minute.
  it("should keep the promotion active during the whole last valid day", () => {
    // Arrange
    const form = {
      windows: [{ days: [6], start: "00:00", end: "00:00" }],
      validFrom: "2026-10-01",
      validUntil: "2026-10-31",
    };

    // Act
    const schedule = formToSchedule(form);

    // Assert
    expect(schedule).not.toBeNull();
    if (!schedule) return;
    expect(isScheduleActive(schedule, new Date(2026, 9, 31, 23, 59))).toBe(true);
    expect(isScheduleActive(schedule, new Date(2026, 10, 1, 0, 0))).toBe(false);
    expect(scheduleToForm(schedule)).toEqual(form);
  });

  // CASE: A manager sets a promotion from 14:00 to midnight.
  // VALIDATES: An end time of 00:00 means the end of the same day.
  it("should treat an end of 00:00 as midnight of the same day", () => {
    // Arrange
    const form = { windows: [{ days: [MONDAY], start: "14:00", end: "00:00" }], validFrom: "", validUntil: "" };

    // Act
    const schedule = formToSchedule(form);

    // Assert
    expect(schedule?.windows[0]).toEqual({ days: [MONDAY], startMinute: 840, endMinute: 1440 });
    expect(schedule && isScheduleActive(schedule, localDate(TUESDAY, 1, 0))).toBe(false);
  });

  // CASE: The form has a window without selected days.
  // VALIDATES: An incomplete form is rejected instead of saving a promotion that never runs.
  it("should reject a window without days", () => {
    // Arrange
    const form = { windows: [{ days: [], start: "14:00", end: "18:00" }], validFrom: "", validUntil: "" };

    // Act
    const schedule = formToSchedule(form);

    // Assert
    expect(schedule).toBeNull();
  });
});
