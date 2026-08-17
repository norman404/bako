import { describe, expect, it, mock, beforeEach } from "bun:test";

mock.module("sonner", () => ({
  toast: {
    success: mock(),
    error: mock(),
    info: mock(),
    warning: mock(),
    promise: mock(),
    dismiss: mock(),
    message: mock(),
  },
  Toaster: () => null,
}));

mock.module("@/modules/shift-reports/hooks/use-order-management", () => ({
  useOrderDetail: mock(() => ({ data: null, isLoading: false })),
  useUpdateOrder: mock(() => ({ mutate: mock(), isPending: false })),
  ORDER_QUERY_KEYS: {
    detail: (orderId: string) => ["shift", "order", orderId],
  },
}));

import { EditOrderModal } from "./EditOrderModal";
import * as orderHooks from "@/modules/shift-reports/hooks/use-order-management";
import { toast } from "sonner";
import { formatPosCurrency } from "@/lib/currency";
import type { OrderDetail } from "@/modules/shift-reports/domain/order-management";
import { renderWithProviders, screen, waitFor, fireEvent } from "@/test/test-utils";

function buildOrderDetail(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: "order-1",
    ticketNumber: 42,
    createdAt: new Date("2026-06-04T10:00:00.000Z"),
    total: 6500,
    paymentMethod: "cash",
    paymentAmount: 6500,
    fulfillmentType: "local",
    customer: null,
    items: [
      {
        id: "item-1",
        productId: "product-1",
        productName: "Café",
        categoryId: "category-1",
        quantity: 2,
        unitPrice: 2500,
        modifiers: [
          {
            groupId: null,
            groupName: "Tamaño",
            optionId: "opt-1",
            optionName: "Grande",
            textValue: null,
            priceDelta: 500,
          },
        ],
      },
      {
        id: "item-2",
        productId: "product-2",
        productName: "Medialuna",
        categoryId: "category-2",
        quantity: 1,
        unitPrice: 1500,
        modifiers: [],
      },
    ],
    isVoided: false,
    voidedAt: null,
    ...overrides,
  };
}

describe("EditOrderModal", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    (orderHooks.useOrderDetail as any).mockReturnValue({ data: null, isLoading: false });
    (orderHooks.useUpdateOrder as any).mockReturnValue({ mutate: mock(), isPending: false });
  });

  it("loads and displays the order items with their quantities", async () => {
    const detail = buildOrderDetail();
    (orderHooks.useOrderDetail as any).mockReturnValue({ data: detail, isLoading: false });

    renderWithProviders(<EditOrderModal orderId="order-1" open={true} onClose={mock()} />);

    await waitFor(() => {
      expect(screen.getByText("Café")).toBeInTheDocument();
      expect(screen.getByText("Medialuna")).toBeInTheDocument();
      expect(screen.getByLabelText(/Cantidad Café/i)).toHaveValue(2);
      expect(screen.getByLabelText(/Cantidad Medialuna/i)).toHaveValue(1);
    });
  });

  it("updates the displayed total when an item's quantity changes", async () => {
    const detail = buildOrderDetail();
    (orderHooks.useOrderDetail as any).mockReturnValue({ data: detail, isLoading: false });

    renderWithProviders(<EditOrderModal orderId="order-1" open={true} onClose={mock()} />);

    const quantityInput = await screen.findByLabelText(/Cantidad Café/i);

    expect(screen.getByTestId("edit-order-total")).toHaveTextContent(formatPosCurrency(6500));

    fireEvent.change(quantityInput, { target: { value: "3" } });

    await waitFor(() => {
      // 3 * 2500 + 1 * 1500 = 9000
      expect(screen.getByTestId("edit-order-total")).toHaveTextContent(formatPosCurrency(9000));
    });
  });

  it("blocks removing the last remaining item and shows an inline error", async () => {
    const detail = buildOrderDetail({
      items: [
        {
          id: "item-1",
          productId: "product-1",
          productName: "Café",
          categoryId: "category-1",
          quantity: 2,
          unitPrice: 2500,
          modifiers: [],
        },
      ],
      total: 5000,
    });
    (orderHooks.useOrderDetail as any).mockReturnValue({ data: detail, isLoading: false });

    renderWithProviders(<EditOrderModal orderId="order-1" open={true} onClose={mock()} />);

    const removeButton = await screen.findByLabelText(/Quitar Café/i);
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("El pedido debe tener al menos un producto.");
      expect(screen.getByText("Café")).toBeInTheDocument();
    });
  });

  it("removes an item when there is more than one and recalculates the total", async () => {
    const detail = buildOrderDetail();
    (orderHooks.useOrderDetail as any).mockReturnValue({ data: detail, isLoading: false });

    renderWithProviders(<EditOrderModal orderId="order-1" open={true} onClose={mock()} />);

    const removeButton = await screen.findByLabelText(/Quitar Medialuna/i);
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText("Medialuna")).not.toBeInTheDocument();
      // remaining: Café 2 * 2500 = 5000
      expect(screen.getByTestId("edit-order-total")).toHaveTextContent(formatPosCurrency(5000));
    });
  });

  it("changes the payment method", async () => {
    const detail = buildOrderDetail();
    (orderHooks.useOrderDetail as any).mockReturnValue({ data: detail, isLoading: false });

    renderWithProviders(<EditOrderModal orderId="order-1" open={true} onClose={mock()} />);

    const cardOption = await screen.findByRole("button", { name: "Tarjeta" });
    fireEvent.click(cardOption);

    await waitFor(() => {
      expect(cardOption).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("defaults to cash when the stored payment method is neither cash nor card", async () => {
    const detail = buildOrderDetail({ paymentMethod: "transfer" });
    (orderHooks.useOrderDetail as any).mockReturnValue({ data: detail, isLoading: false });

    renderWithProviders(<EditOrderModal orderId="order-1" open={true} onClose={mock()} />);

    const cashOption = await screen.findByRole("button", { name: "Efectivo" });
    await waitFor(() => expect(cashOption).toHaveAttribute("aria-pressed", "true"));
  });

  it("submits the update with unrecalculated unitPrice and payment.amount matching the final items sum", async () => {
    const detail = buildOrderDetail();
    const mockMutate = mock();
    const onClose = mock();
    (orderHooks.useOrderDetail as any).mockReturnValue({ data: detail, isLoading: false });
    (orderHooks.useUpdateOrder as any).mockReturnValue({ mutate: mockMutate, isPending: false });

    renderWithProviders(<EditOrderModal orderId="order-1" open={true} onClose={onClose} />);

    const saveButton = await screen.findByRole("button", { name: "Guardar cambios" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });

    const [payload] = mockMutate.mock.calls[0] as [any, any];
    expect(payload).toEqual({
      orderId: "order-1",
      input: {
        items: [
          {
            productId: "product-1",
            quantity: 2,
            unitPrice: 2500,
            modifiers: [
              {
                groupId: "",
                groupName: "Tamaño",
                optionId: "opt-1",
                optionName: "Grande",
                priceDelta: 500,
                textValue: null,
              },
            ],
          },
          {
            productId: "product-2",
            quantity: 1,
            unitPrice: 1500,
            modifiers: [],
          },
        ],
        payment: {
          method: "cash",
          amount: 6500,
        },
      },
    });
  });

  it("shows a success toast and closes the modal when the update succeeds", async () => {
    const detail = buildOrderDetail();
    const onClose = mock();
    const mockMutate = mock((_payload: any, callbacks: any) => {
      callbacks.onSuccess();
    });
    (orderHooks.useOrderDetail as any).mockReturnValue({ data: detail, isLoading: false });
    (orderHooks.useUpdateOrder as any).mockReturnValue({ mutate: mockMutate, isPending: false });

    renderWithProviders(<EditOrderModal orderId="order-1" open={true} onClose={onClose} />);

    const saveButton = await screen.findByRole("button", { name: "Guardar cambios" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Pedido #42 actualizado");
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("shows an error toast and keeps the modal open when the update fails", async () => {
    const detail = buildOrderDetail();
    const onClose = mock();
    const mockMutate = mock((_payload: any, callbacks: any) => {
      callbacks.onError(new Error("boom"));
    });
    (orderHooks.useOrderDetail as any).mockReturnValue({ data: detail, isLoading: false });
    (orderHooks.useUpdateOrder as any).mockReturnValue({ mutate: mockMutate, isPending: false });

    renderWithProviders(<EditOrderModal orderId="order-1" open={true} onClose={onClose} />);

    const saveButton = await screen.findByRole("button", { name: "Guardar cambios" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("No se pudo actualizar el pedido.");
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it("shows a read-only view without edit controls when the order is already voided", async () => {
    const detail = buildOrderDetail({ isVoided: true });
    (orderHooks.useOrderDetail as any).mockReturnValue({ data: detail, isLoading: false });

    renderWithProviders(<EditOrderModal orderId="order-1" open={true} onClose={mock()} />);

    await waitFor(() => {
      expect(screen.getByText("Café")).toBeInTheDocument();
      expect(screen.queryByLabelText(/Cantidad Café/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Quitar Café/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    });
  });
});
