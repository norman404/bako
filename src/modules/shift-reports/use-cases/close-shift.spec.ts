import { describe, expect, it, mock } from "bun:test";
import { okAsync, errAsync } from "neverthrow";
import { closeShift } from "./close-shift";
import type { ShiftRepository } from "../domain/ports";
import type { Shift } from "../domain/shift";
import { NoActiveShiftError } from "../domain/errors";

function buildRepo(overrides: Partial<ShiftRepository> = {}): ShiftRepository {
  return {
    openShift: mock(() => okAsync({} as Shift)),
    closeShift: mock(() => okAsync({ id: "shift-1", openedAt: new Date(), closedAt: new Date(), status: "closed" } as Shift)),
    getActive: mock(() => okAsync(null)),
    listHistory: mock(() => okAsync([])),
    getReport: mock(() => okAsync({} as any)),
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
      closeShift: mock(() => errAsync(new NoActiveShiftError())),
    });

    const result = await closeShift(repo, "shift-1");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error).toBeInstanceOf(NoActiveShiftError);
    expect(result.error.code).toBe("noActiveShift");
  });
});
