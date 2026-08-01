import * as React from "react";
import { describe, expect, it, mock, spyOn, beforeEach, afterEach } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { okAsync, errAsync } from "neverthrow";

import { shiftDrizzleRepository } from "@/modules/shift-reports/persistence/shift-drizzle.repository";
import { ShiftPersistenceError } from "@/modules/shift-reports/domain/errors";
import type { CashMovement, Shift } from "@/modules/shift-reports/domain/shift";
import {
  useOpenShift,
  useCloseShift,
  useCashMovements,
  useAddCashMovement,
  useUpdateCashMovement,
  useDeleteCashMovement,
  SHIFT_QUERY_KEYS,
} from "./use-shift-reports";

function buildShift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: "shift-1",
    openedAt: new Date("2026-08-01T10:00:00.000Z"),
    closedAt: null,
    status: "active",
    openingCash: 10000,
    countedCash: null,
    cashDifference: null,
    ...overrides,
  };
}

function buildCashMovement(overrides: Partial<CashMovement> = {}): CashMovement {
  return {
    id: "mv-1",
    shiftId: "shift-1",
    type: "income",
    amount: 5000,
    reason: "Fondo adicional",
    createdAt: new Date("2026-08-01T11:00:00.000Z"),
    ...overrides,
  };
}

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

describe("useOpenShift", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  it("calls openShift with openingCash when mutate(10000) is invoked", async () => {
    const shift = buildShift({ openingCash: 10000 });
    spyOn(shiftDrizzleRepository, "getActive").mockReturnValue(okAsync(null));
    const openShiftSpy = spyOn(shiftDrizzleRepository, "openShift").mockReturnValue(
      okAsync(shift),
    );

    const queryClient = createQueryClient();
    const invalidateSpy = spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useOpenShift(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(10000);

    expect(openShiftSpy).toHaveBeenCalledWith(10000);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: SHIFT_QUERY_KEYS.active });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: SHIFT_QUERY_KEYS.history });
  });

  it("surfaces the unwrapped error when openShift fails", async () => {
    spyOn(shiftDrizzleRepository, "getActive").mockReturnValue(okAsync(null));
    spyOn(shiftDrizzleRepository, "openShift").mockReturnValue(
      errAsync(new ShiftPersistenceError("dbError")),
    );

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useOpenShift(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(result.current.mutateAsync(5000)).rejects.toBeInstanceOf(ShiftPersistenceError);
  });
});

describe("useCloseShift", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  it("calls closeShift with shiftId and countedCash when mutate({ shiftId, countedCash }) is invoked", async () => {
    const shift = buildShift({ status: "closed", countedCash: 20000, cashDifference: 0 });
    const closeShiftSpy = spyOn(shiftDrizzleRepository, "closeShift").mockReturnValue(
      okAsync(shift),
    );

    const queryClient = createQueryClient();
    const invalidateSpy = spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCloseShift(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({ shiftId: "shift-1", countedCash: 20000 });

    expect(closeShiftSpy).toHaveBeenCalledWith("shift-1", 20000);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: SHIFT_QUERY_KEYS.active });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: SHIFT_QUERY_KEYS.history });
  });

  it("surfaces the unwrapped error when closeShift fails", async () => {
    spyOn(shiftDrizzleRepository, "closeShift").mockReturnValue(
      errAsync(new ShiftPersistenceError("invalidCountedCash")),
    );

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useCloseShift(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({ shiftId: "shift-1", countedCash: -1 }),
    ).rejects.toBeInstanceOf(ShiftPersistenceError);
  });
});

describe("useCashMovements", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  it("queries cash movements for the given shiftId", async () => {
    const movements = [buildCashMovement()];
    const listSpy = spyOn(shiftDrizzleRepository, "listCashMovements").mockReturnValue(
      okAsync(movements),
    );

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useCashMovements("shift-1"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(movements);
    expect(listSpy).toHaveBeenCalledWith("shift-1");
  });

  it("does not call the repository when shiftId is null", async () => {
    const listSpy = spyOn(shiftDrizzleRepository, "listCashMovements");

    const queryClient = createQueryClient();
    renderHook(() => useCashMovements(null), {
      wrapper: createWrapper(queryClient),
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(listSpy).not.toHaveBeenCalled();
  });
});

describe("useAddCashMovement", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  it("calls addCashMovement with shiftId and input, invalidates movements and report queries", async () => {
    const movement = buildCashMovement();
    const addSpy = spyOn(shiftDrizzleRepository, "addCashMovement").mockReturnValue(
      okAsync(movement),
    );

    const queryClient = createQueryClient();
    const invalidateSpy = spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useAddCashMovement(), {
      wrapper: createWrapper(queryClient),
    });

    const input = { type: "income" as const, amount: 5000, reason: "Fondo adicional" };
    await result.current.mutateAsync({ shiftId: "shift-1", input });

    expect(addSpy).toHaveBeenCalledWith("shift-1", input);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: SHIFT_QUERY_KEYS.movements("shift-1"),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: SHIFT_QUERY_KEYS.report("shift-1"),
    });
  });
});

describe("useUpdateCashMovement", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  it("calls updateCashMovement with id and input, invalidates movements and report queries", async () => {
    const movement = buildCashMovement({ amount: 7000, reason: "Otro motivo" });
    const updateSpy = spyOn(shiftDrizzleRepository, "updateCashMovement").mockReturnValue(
      okAsync(movement),
    );

    const queryClient = createQueryClient();
    const invalidateSpy = spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdateCashMovement(), {
      wrapper: createWrapper(queryClient),
    });

    const input = { amount: 7000, reason: "Otro motivo" };
    await result.current.mutateAsync({ id: "mv-1", shiftId: "shift-1", input });

    expect(updateSpy).toHaveBeenCalledWith("mv-1", input);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: SHIFT_QUERY_KEYS.movements("shift-1"),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: SHIFT_QUERY_KEYS.report("shift-1"),
    });
  });
});

describe("useDeleteCashMovement", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  it("calls deleteCashMovement with id, invalidates movements and report queries", async () => {
    const deleteSpy = spyOn(shiftDrizzleRepository, "deleteCashMovement").mockReturnValue(
      okAsync(undefined),
    );

    const queryClient = createQueryClient();
    const invalidateSpy = spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useDeleteCashMovement(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({ id: "mv-1", shiftId: "shift-1" });

    expect(deleteSpy).toHaveBeenCalledWith("mv-1");
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: SHIFT_QUERY_KEYS.movements("shift-1"),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: SHIFT_QUERY_KEYS.report("shift-1"),
    });
  });
});