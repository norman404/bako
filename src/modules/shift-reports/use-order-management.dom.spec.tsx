import * as React from "react";
import { describe, expect, it, mock, spyOn, beforeEach, afterEach } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { okAsync, errAsync } from "neverthrow";

// spyOn sobre el objeto real en vez de mock.module: en bun los module mocks
// persisten entre archivos del mismo proceso y contaminan los specs de persistence.
import { shiftDrizzleRepository } from "./repository";
import { ShiftPersistenceError } from "./errors";
import type { OrderDetail } from "./order-management";
import { useOrderDetail, useFetchOrderDetail, ORDER_QUERY_KEYS } from "./use-order-management";

function buildOrderDetail(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: "order-1",
    ticketNumber: 42,
    createdAt: new Date("2026-06-04T10:00:00.000Z"),
    total: 5000,
    paymentMethod: "cash",
    paymentAmount: 5000,
    fulfillmentType: "local",
    customer: null,
    items: [
      {
        id: "item-1",
        productId: "product-1",
        productName: "Café con leche",
        categoryId: "category-1",
        quantity: 2,
        unitPrice: 2500,
        modifiers: [],
      },
    ],
    isVoided: false,
    voidedAt: null,
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

describe("useOrderDetail (regression)", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  it("resolves order detail via repository.getOrderDetail when orderId is provided", async () => {
    const detail = buildOrderDetail();
    const getOrderDetailSpy = spyOn(shiftDrizzleRepository, "getOrderDetail").mockReturnValue(
      okAsync(detail),
    );

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useOrderDetail("order-1"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(detail);
    expect(getOrderDetailSpy).toHaveBeenCalledWith("order-1");
  });

  it("surfaces the unwrapped repository error when the result is an error", async () => {
    spyOn(shiftDrizzleRepository, "getOrderDetail").mockReturnValue(
      errAsync(new ShiftPersistenceError("orderNotFound", { orderId: "order-1" })),
    );

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useOrderDetail("order-1"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ShiftPersistenceError);
    expect((result.current.error as ShiftPersistenceError).code).toBe("orderNotFound");
  });

  it("does not call the repository when orderId is null", async () => {
    const getOrderDetailSpy = spyOn(shiftDrizzleRepository, "getOrderDetail");

    const queryClient = createQueryClient();
    renderHook(() => useOrderDetail(null), {
      wrapper: createWrapper(queryClient),
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(getOrderDetailSpy).not.toHaveBeenCalled();
  });
});

describe("useFetchOrderDetail", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  it("returns a function that imperatively fetches order detail via the repository", async () => {
    const detail = buildOrderDetail({ id: "order-2", ticketNumber: 7 });
    const getOrderDetailSpy = spyOn(shiftDrizzleRepository, "getOrderDetail").mockReturnValue(
      okAsync(detail),
    );

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useFetchOrderDetail(), {
      wrapper: createWrapper(queryClient),
    });

    const fetched = await result.current("order-2");

    expect(fetched).toEqual(detail);
    expect(getOrderDetailSpy).toHaveBeenCalledWith("order-2");
  });

  it("rejects with the unwrapped repository error", async () => {
    spyOn(shiftDrizzleRepository, "getOrderDetail").mockReturnValue(
      errAsync(new ShiftPersistenceError("orderNotFound", { orderId: "order-3" })),
    );

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useFetchOrderDetail(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(result.current("order-3")).rejects.toBeInstanceOf(ShiftPersistenceError);
  });

  it("populates the same query cache entry that useOrderDetail reads (ORDER_QUERY_KEYS.detail)", async () => {
    const detail = buildOrderDetail({ id: "order-4", ticketNumber: 9 });
    spyOn(shiftDrizzleRepository, "getOrderDetail").mockReturnValue(okAsync(detail));

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useFetchOrderDetail(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current("order-4");

    expect(queryClient.getQueryData<OrderDetail>(ORDER_QUERY_KEYS.detail("order-4"))).toEqual(detail);
  });
});
