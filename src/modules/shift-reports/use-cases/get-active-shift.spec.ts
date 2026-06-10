import { describe, expect, it, vi } from "vitest";
import { okAsync, errAsync } from "neverthrow";
import { getActiveShift } from "./get-active-shift";
import type { ShiftRepository } from "../domain/ports";
import type { Shift } from "../domain/shift";
import { ShiftPersistenceError } from "../domain/errors";

function buildRepo(overrides: Partial<ShiftRepository> = {}): ShiftRepository {
  return {
    openShift: vi.fn(() => okAsync({} as Shift)),
    closeShift: vi.fn(() => okAsync({} as Shift)),
    getActive: vi.fn(() => okAsync(null)),
    listHistory: vi.fn(() => okAsync([])),
    getReport: vi.fn(() => okAsync({} as any)),
    ...overrides,
  };
}

describe("getActiveShift use-case", () => {
  it("returns null when no active shift", async () => {
    const repo = buildRepo();

    const result = await getActiveShift(repo);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toBeNull();
  });

  it("returns the active shift", async () => {
    const active: Shift = {
      id: "shift-1",
      openedAt: new Date(),
      closedAt: null,
      status: "active",
    };
    const repo = buildRepo({
      getActive: vi.fn(() => okAsync(active)),
    });

    const result = await getActiveShift(repo);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toEqual(active);
  });

  it("forwards repository errors", async () => {
    const repo = buildRepo({
      getActive: vi.fn(() => errAsync(new ShiftPersistenceError("DB error"))),
    });

    const result = await getActiveShift(repo);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error.message).toContain("DB error");
  });
});
