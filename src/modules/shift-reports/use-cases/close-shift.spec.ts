import { describe, expect, it, vi } from "vitest";
import { okAsync, errAsync } from "neverthrow";
import { closeShift } from "./close-shift";
import type { ShiftRepository } from "../domain/ports";
import type { Shift } from "../domain/shift";
import { NoActiveShiftError } from "../domain/errors";

function buildRepo(overrides: Partial<ShiftRepository> = {}): ShiftRepository {
  return {
    openShift: vi.fn(() => okAsync({} as Shift)),
    closeShift: vi.fn(() => okAsync({ id: "shift-1", openedAt: new Date(), closedAt: new Date(), status: "closed" } as Shift)),
    getActive: vi.fn(() => okAsync(null)),
    listHistory: vi.fn(() => okAsync([])),
    getReport: vi.fn(() => okAsync({} as any)),
    ...overrides,
  };
}

describe("closeShift use-case", () => {
  it("closes the given shift", async () => {
    const repo = buildRepo();

    const result = await closeShift(repo, "shift-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.status).toBe("closed");
    expect(repo.closeShift).toHaveBeenCalledWith("shift-1");
  });

  it("forwards repository errors", async () => {
    const repo = buildRepo({
      closeShift: vi.fn(() => errAsync(new NoActiveShiftError())),
    });

    const result = await closeShift(repo, "shift-1");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error).toBeInstanceOf(NoActiveShiftError);
    expect(result.error.message).toContain("No active shift");
  });
});
