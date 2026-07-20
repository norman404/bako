import { describe, expect, it, mock } from "bun:test";
import { okAsync, errAsync } from "neverthrow";
import { openShift } from "./open-shift";
import type { ShiftRepository } from "../domain/ports";
import type { Shift } from "../domain/shift";
import { ShiftAlreadyActiveError, ShiftPersistenceError } from "../domain/errors";

function buildRepo(overrides: Partial<ShiftRepository> = {}): ShiftRepository {
  return {
    openShift: mock(() => okAsync({ id: "shift-1", openedAt: new Date(), closedAt: null, status: "active" } as Shift)),
    closeShift: mock(() => okAsync({} as Shift)),
    getActive: mock(() => okAsync(null)),
    listHistory: mock(() => okAsync([])),
    getReport: mock(() => okAsync({} as any)),
    ...overrides,
  };
}

describe("openShift use-case", () => {
  it("creates a new shift when no active shift exists", async () => {
    const repo = buildRepo();

    const result = await openShift(repo);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.status).toBe("active");
    expect(repo.openShift).toHaveBeenCalledTimes(1);
  });

  it("rejects when an active shift already exists", async () => {
    const existingShift: Shift = {
      id: "existing",
      openedAt: new Date(),
      closedAt: null,
      status: "active",
    };
    const repo = buildRepo({
      getActive: mock(() => okAsync(existingShift)),
    });

    const result = await openShift(repo);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error).toBeInstanceOf(ShiftAlreadyActiveError);
    expect(result.error.code).toBe("shiftAlreadyActive");
    expect(repo.openShift).not.toHaveBeenCalled();
  });

  it("forwards repository errors", async () => {
    const repo = buildRepo({
      getActive: mock(() => errAsync(new ShiftPersistenceError("dbError", { context: "DB error" }) as any)),
    });

    const result = await openShift(repo);

    expect(result.isErr()).toBe(true);
  });
});
