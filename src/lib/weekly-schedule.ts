export const MINUTES_PER_DAY = 24 * 60;

export interface ScheduleWindow {
  days: number[];
  startMinute: number;
  endMinute: number;
}

export interface WeeklySchedule {
  windows: ScheduleWindow[];
  validFrom: number | null;
  validUntil: number | null;
}

function minuteOfDay(at: Date): number {
  return at.getHours() * 60 + at.getMinutes();
}

// A window whose end is before its start crosses midnight: it belongs to the day it
// starts on, so the minutes after midnight are matched against the previous weekday.
function isWindowActive(window: ScheduleWindow, at: Date): boolean {
  const day = at.getDay();
  const minute = minuteOfDay(at);

  if (window.startMinute < window.endMinute) {
    return window.days.includes(day) && minute >= window.startMinute && minute < window.endMinute;
  }

  const previousDay = (day + 6) % 7;
  return (
    (window.days.includes(day) && minute >= window.startMinute) ||
    (window.days.includes(previousDay) && minute < window.endMinute)
  );
}

export function isScheduleActive(schedule: WeeklySchedule, at: Date): boolean {
  const time = at.getTime();
  if (schedule.validFrom !== null && time < schedule.validFrom) return false;
  if (schedule.validUntil !== null && time >= schedule.validUntil) return false;

  return schedule.windows.some((window) => isWindowActive(window, at));
}

function isMinute(value: unknown, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max;
}

function isTimestamp(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isInteger(value) && value >= 0);
}

function parseWindow(value: unknown): ScheduleWindow | null {
  if (typeof value !== "object" || value === null) return null;
  const { days, startMinute, endMinute } = value as Record<string, unknown>;

  if (!Array.isArray(days) || days.length === 0) return null;
  if (!days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)) return null;
  if (!isMinute(startMinute, MINUTES_PER_DAY - 1) || !isMinute(endMinute, MINUTES_PER_DAY)) return null;
  if (startMinute === endMinute) return null;

  return { days: [...new Set(days as number[])].sort((a, b) => a - b), startMinute, endMinute };
}

export function parseWeeklySchedule(value: unknown): WeeklySchedule | null {
  if (typeof value !== "object" || value === null) return null;
  const { windows, validFrom = null, validUntil = null } = value as Record<string, unknown>;

  if (!Array.isArray(windows) || windows.length === 0) return null;
  if (!isTimestamp(validFrom) || !isTimestamp(validUntil)) return null;
  if (validFrom !== null && validUntil !== null && validFrom >= validUntil) return null;

  const parsedWindows: ScheduleWindow[] = [];
  for (const window of windows) {
    const parsed = parseWindow(window);
    if (!parsed) return null;
    parsedWindows.push(parsed);
  }

  return { windows: parsedWindows, validFrom, validUntil };
}

export interface ScheduleWindowForm {
  days: number[];
  start: string;
  end: string;
}

export interface WeeklyScheduleForm {
  windows: ScheduleWindowForm[];
  validFrom: string;
  validUntil: string;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function minuteToTime(minute: number): string {
  const normalized = minute % MINUTES_PER_DAY;
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}

function timeToMinute(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function timestampToDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateToTimestamp(value: string, dayOffset = 0): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + dayOffset).getTime();
}

function dayBefore(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1).getTime();
}

export function emptyScheduleForm(): WeeklyScheduleForm {
  return { windows: [{ days: [0, 1, 2, 3, 4, 5, 6], start: "00:00", end: "00:00" }], validFrom: "", validUntil: "" };
}

export function scheduleToForm(schedule: WeeklySchedule): WeeklyScheduleForm {
  return {
    windows: schedule.windows.map((window) => ({
      days: window.days,
      start: minuteToTime(window.startMinute),
      end: minuteToTime(window.endMinute),
    })),
    validFrom: schedule.validFrom === null ? "" : timestampToDate(schedule.validFrom),
    // Stored as the exclusive next midnight; the form shows the last valid day.
    validUntil: schedule.validUntil === null ? "" : timestampToDate(dayBefore(schedule.validUntil)),
  };
}

// An end of 00:00 means "until midnight", so 14:00–00:00 is a same-day window and
// 00:00–00:00 covers the whole day.
export function formToSchedule(form: WeeklyScheduleForm): WeeklySchedule | null {
  const windows: ScheduleWindow[] = [];
  for (const window of form.windows) {
    const startMinute = timeToMinute(window.start);
    const endMinute = timeToMinute(window.end);
    if (startMinute === null || endMinute === null) return null;
    windows.push({ days: window.days, startMinute, endMinute: endMinute === 0 ? MINUTES_PER_DAY : endMinute });
  }

  const validFrom = form.validFrom === "" ? null : dateToTimestamp(form.validFrom);
  const validUntil = form.validUntil === "" ? null : dateToTimestamp(form.validUntil, 1);
  if ((form.validFrom !== "" && validFrom === null) || (form.validUntil !== "" && validUntil === null)) return null;

  return parseWeeklySchedule({ windows, validFrom, validUntil });
}
