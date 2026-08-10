import { describe, expect, it, mock, beforeEach } from "bun:test";
import { okAsync } from "neverthrow";

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

const useShiftHistoryMock = mock();
const useShiftReportMock = mock();

mock.module("@/modules/shift-reports/hooks/use-shift-reports", () => ({
  useShiftHistory: useShiftHistoryMock,
  useShiftReport: useShiftReportMock,
  SHIFT_QUERY_KEYS: {
    active: ["shift", "active"],
    history: ["shift", "history"],
    report: (shiftId: string) => ["shift", "report", shiftId],
  },
}));

import * as printerModule from "@/modules/printer";

// Snapshot del módulo real ANTES de mockearlo: el barrel también exporta
// PRINTER_ROLE, que el componente y este spec necesitan con su valor real.
const realPrinterModule = { ...printerModule };

const usePrintersMock = mock();
mock.module("@/modules/printer", () => ({
  ...realPrinterModule,
  usePrinters: usePrintersMock,
}));

const useCategoriesMock = mock();
mock.module("@/modules/menu/hooks/use-categories", () => ({
  useCategories: useCategoriesMock,
}));

const SETTINGS_STATE = { comandaHeaderText: "COMANDA", locale: "es-MX", currency: "MXN" };
const useSettingsStoreMock = mock((selector: (state: typeof SETTINGS_STATE) => unknown) =>
  selector(SETTINGS_STATE),
) as unknown as ((selector: (state: typeof SETTINGS_STATE) => unknown) => unknown) & {
  getState: () => typeof SETTINGS_STATE;
};
useSettingsStoreMock.getState = () => SETTINGS_STATE;
mock.module("@/modules/settings", () => ({
  useSettingsStore: useSettingsStoreMock,
}));

const fetchOrderDetailMock = mock();
const useFetchOrderDetailMock = mock(() => fetchOrderDetailMock);
const useOrderDetailMock = mock();
mock.module("@/modules/shift-reports/hooks/use-order-management", () => ({
  useFetchOrderDetail: useFetchOrderDetailMock,
  useOrderDetail: useOrderDetailMock,
}));

const reprintOrderMock = mock();
mock.module("@/modules/shift-reports/lib/reprint-order", () => ({
  reprintOrder: reprintOrderMock,
}));

const reprintCommandMock = mock();
mock.module("@/modules/shift-reports/lib/reprint-command", () => ({
  reprintCommand: reprintCommandMock,
}));

const reprintShiftReportMock = mock();
mock.module("@/modules/shift-reports/lib/reprint-shift-report", () => ({
  reprintShiftReport: reprintShiftReportMock,
}));

const editOrderModalMock = mock((props: { orderId: string | null; open: boolean }) => (
  <div
    data-testid="edit-order-modal-mock"
    data-order-id={props.orderId ?? ""}
    data-open={String(props.open)}
  />
));
mock.module("./EditOrderModal", () => ({
  EditOrderModal: editOrderModalMock,
}));

import { ShiftControlPanel } from "./ShiftControlPanel";
import { SHIFT_QUERY_KEYS } from "@/modules/shift-reports/hooks/use-shift-reports";
import { PRINTER_ROLE } from "@/modules/printer";
import { buildPrinter } from "@/modules/printer/test/factories";
import type { ShiftHistoryItem, ShiftReport } from "@/modules/shift-reports/domain/shift";
import type { OrderDetail } from "@/modules/shift-reports/domain/order-management";
import { toast } from "sonner";
import { QueryClient } from "@tanstack/react-query";
import { renderWithProviders, screen, waitFor, fireEvent } from "@/test/test-utils";

const receiptPrinter = buildPrinter({
  id: "printer-1",
  role: PRINTER_ROLE.RECEIPT,
  isDefault: true,
});

function buildHistoryItem(overrides: Partial<ShiftHistoryItem> = {}): ShiftHistoryItem {
  return {
    shiftId: "shift-1",
    openedAt: new Date("2026-06-04T08:00:00.000Z"),
    closedAt: new Date("2026-06-04T16:00:00.000Z"),
    totalOrders: 2,
    totalSales: 12500,
    openingCash: 10000,
    cashDifference: 0,
    ...overrides,
  };
}

function buildReport(overrides: Partial<ShiftReport> = {}): ShiftReport {
  return {
    shiftId: "shift-1",
    openedAt: new Date("2026-06-04T08:00:00.000Z"),
    closedAt: new Date("2026-06-04T16:00:00.000Z"),
    totalOrders: 2,
    totalItems: 5,
    totalSales: 12500,
    cashTotal: 8000,
    cardTotal: 4500,
    orders: [
      {
        orderId: "order-1",
        ticketNumber: 1,
        createdAt: new Date("2026-06-04T10:00:00.000Z"),
        total: 5000,
        paymentMethod: "cash",
        itemCount: 2,
        items: [
          { productId: "p1", productName: "Café", quantity: 1, unitPrice: 2500 },
          { productId: "p2", productName: "Medialuna", quantity: 1, unitPrice: 2500 },
        ],
        isVoided: false,
      },
      {
        orderId: "order-2",
        ticketNumber: 2,
        createdAt: new Date("2026-06-04T11:00:00.000Z"),
        total: 7500,
        paymentMethod: "card",
        itemCount: 3,
        items: [
          { productId: "p3", productName: "Tostado", quantity: 2, unitPrice: 3000 },
          { productId: "p4", productName: "Jugo", quantity: 1, unitPrice: 1500 },
        ],
        isVoided: true,
      },
    ],
    openingCash: 10000,
    cashMovementsIn: 0,
    cashMovementsOut: 0,
    expectedCash: 18000,
    countedCash: 18000,
    cashDifference: 0,
    cashMovements: [],
    ...overrides,
  };
}

function buildOrderDetail(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: "order-1",
    ticketNumber: 1,
    createdAt: new Date("2026-06-04T10:00:00.000Z"),
    total: 5000,
    paymentMethod: "cash",
    paymentAmount: 5000,
    fulfillmentType: "local",
    customer: null,
    items: [
      {
        id: "item-1",
        productId: "p1",
        productName: "Café",
        categoryId: "category-1",
        quantity: 1,
        unitPrice: 2500,
        modifiers: [],
      },
    ],
    isVoided: false,
    voidedAt: null,
    ...overrides,
  };
}

async function expandShift() {
  const shiftButton = await screen.findByText("2 Órdenes");
  fireEvent.click(shiftButton);
}

describe("ShiftControlPanel", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    useShiftHistoryMock.mockReturnValue({ data: [], isLoading: false });
    useShiftReportMock.mockReturnValue({ data: null, isLoading: false });
    usePrintersMock.mockReturnValue({ data: [receiptPrinter] });
    useCategoriesMock.mockReturnValue({ data: [] });
    fetchOrderDetailMock.mockResolvedValue(buildOrderDetail());
    useOrderDetailMock.mockReturnValue({
      data: buildOrderDetail(),
      isLoading: false,
      isError: false,
      refetch: mock(),
    });
    reprintOrderMock.mockReturnValue(okAsync(undefined));
    reprintCommandMock.mockReturnValue(Promise.resolve({ printedCount: 1, errors: [] }));
    reprintShiftReportMock.mockReturnValue(okAsync(undefined));
  });

  // ─── Ported from ShiftHistoryPanel.dom.spec.tsx ──────────────────────────

  it("renders empty state when no shifts", async () => {
    useShiftHistoryMock.mockReturnValue({ data: [], isLoading: false });

    renderWithProviders(<ShiftControlPanel />);

    await waitFor(() => {
      expect(screen.getByText(/No hay turnos registrados/i)).toBeInTheDocument();
    });
  });

  it("renders shift list with totals", async () => {
    useShiftHistoryMock.mockReturnValue({ data: [buildHistoryItem()], isLoading: false });

    renderWithProviders(<ShiftControlPanel />);

    await waitFor(() => {
      expect(screen.getByText("2 Órdenes")).toBeInTheDocument();
    });
  });

  it("expands shift to show inline report with Efectivo/Tarjeta", async () => {
    useShiftHistoryMock.mockReturnValue({ data: [buildHistoryItem({ closedAt: null })], isLoading: false });
    useShiftReportMock.mockReturnValue({ data: buildReport(), isLoading: false });

    renderWithProviders(<ShiftControlPanel />);
    await expandShift();

    expect(screen.getByText("Turno activo")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText(/Efectivo/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Tarjeta/i).length).toBeGreaterThan(0);
    });
  });

  // ─── Voided vs non-voided order actions ──────────────────────────────────

  it("shows the voided badge and hides action buttons for a voided order", async () => {
    useShiftHistoryMock.mockReturnValue({ data: [buildHistoryItem()], isLoading: false });
    useShiftReportMock.mockReturnValue({ data: buildReport(), isLoading: false });

    renderWithProviders(<ShiftControlPanel />);
    await expandShift();

    const voidedRow = await screen.findByTestId("shift-report-order-order-2");
    await waitFor(() => {
      expect(screen.getByText("Anulado")).toBeInTheDocument();
    });
    expect(voidedRow.querySelector('[aria-label="Reimprimir"]')).toBeNull();
    expect(voidedRow.querySelector('[aria-label="Editar"]')).toBeNull();
    expect(voidedRow.querySelector('[aria-label="Anular pedido"]')).toBeNull();
    expect(voidedRow.querySelector('[aria-label="Reimprimir comanda"]')).toBeNull();
  });

  it("shows action buttons for a non-voided order", async () => {
    useShiftHistoryMock.mockReturnValue({ data: [buildHistoryItem()], isLoading: false });
    useShiftReportMock.mockReturnValue({ data: buildReport(), isLoading: false });

    renderWithProviders(<ShiftControlPanel />);
    await expandShift();

    const nonVoidedRow = await screen.findByTestId("shift-report-order-order-1");
    expect(nonVoidedRow.querySelector('[aria-label="Reimprimir"]')).not.toBeNull();
    expect(nonVoidedRow.querySelector('[aria-label="Editar"]')).not.toBeNull();
    expect(nonVoidedRow.querySelector('[aria-label="Anular pedido"]')).not.toBeNull();
    expect(nonVoidedRow.querySelector('[aria-label="Reimprimir comanda"]')).not.toBeNull();
  });

  // ─── Edit order ───────────────────────────────────────────────────────────

  it("opens EditOrderModal with the correct orderId when edit is clicked", async () => {
    useShiftHistoryMock.mockReturnValue({ data: [buildHistoryItem()], isLoading: false });
    useShiftReportMock.mockReturnValue({ data: buildReport(), isLoading: false });

    renderWithProviders(<ShiftControlPanel />);
    await expandShift();

    const nonVoidedRow = await screen.findByTestId("shift-report-order-order-1");
    const editButton = nonVoidedRow.querySelector('[aria-label="Editar"]') as HTMLElement;
    fireEvent.click(editButton);

    await waitFor(() => {
      const calls = editOrderModalMock.mock.calls;
      const lastCall = calls[calls.length - 1][0] as { orderId: string | null; open: boolean };
      expect(lastCall.orderId).toBe("order-1");
      expect(lastCall.open).toBe(true);
    });
  });

  // ─── Reprint order ────────────────────────────────────────────────────────

  it("fetches the order detail and reprints it using the fetched OrderDetail", async () => {
    useShiftHistoryMock.mockReturnValue({ data: [buildHistoryItem()], isLoading: false });
    useShiftReportMock.mockReturnValue({ data: buildReport(), isLoading: false });
    const fetchedDetail = buildOrderDetail({ id: "order-1", ticketNumber: 1 });
    fetchOrderDetailMock.mockResolvedValue(fetchedDetail);

    renderWithProviders(<ShiftControlPanel />);
    await expandShift();

    const nonVoidedRow = await screen.findByTestId("shift-report-order-order-1");
    const reprintButton = nonVoidedRow.querySelector('[aria-label="Reimprimir"]') as HTMLElement;
    fireEvent.click(reprintButton);

    await waitFor(() => {
      expect(fetchOrderDetailMock).toHaveBeenCalledWith("order-1");
      expect(reprintOrderMock).toHaveBeenCalledTimes(1);
    });
    expect(reprintOrderMock.mock.calls[0][0]).toBe(fetchedDetail);
    expect(toast.success).toHaveBeenCalledWith("Pedido #1 reenviado a imprimir");
  });

  // ─── Reprint command ──────────────────────────────────────────────────────

  it("reprints only the selected order item and quantity", async () => {
    // CASE: a sale contains two kitchen lines and the operator deselects one.
    // VALIDATES: the dialog sends an order-item selection, never the whole order.
    const orderDetail = buildOrderDetail({
      items: [
        {
          id: "item-taco",
          productId: "product-taco",
          productName: "Taco",
          categoryId: "category-1",
          quantity: 1,
          unitPrice: 2500,
          modifiers: [],
        },
        {
          id: "item-cafe",
          productId: "product-cafe",
          productName: "Café",
          categoryId: "category-1",
          quantity: 3,
          unitPrice: 1500,
          modifiers: [],
        },
      ],
    });
    useShiftHistoryMock.mockReturnValue({ data: [buildHistoryItem()], isLoading: false });
    useShiftReportMock.mockReturnValue({ data: buildReport(), isLoading: false });
    useOrderDetailMock.mockReturnValue({ data: orderDetail, isLoading: false, isError: false, refetch: mock() });
    reprintCommandMock.mockReturnValue(Promise.resolve({ printedCount: 2, errors: [] }));

    renderWithProviders(<ShiftControlPanel />);
    await expandShift();

    const nonVoidedRow = await screen.findByTestId("shift-report-order-order-1");
    const commandButton = nonVoidedRow.querySelector('[aria-label="Reimprimir comanda"]') as HTMLElement;
    fireEvent.click(commandButton);

    const tacoCheckbox = await screen.findByRole("checkbox", { name: "Seleccionar Taco, línea 1" });
    const cafeQuantity = screen.getByRole("spinbutton", { name: "Cantidad para Café" });
    expect(screen.getByRole("button", { name: "Imprimir seleccionados" })).toBeEnabled();

    fireEvent.click(tacoCheckbox);
    fireEvent.change(cafeQuantity, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Imprimir seleccionados" }));

    await waitFor(() => {
      expect(reprintCommandMock).toHaveBeenCalledWith(
        orderDetail,
        [receiptPrinter],
        [],
        "COMANDA",
        [{ orderItemId: "item-cafe", quantity: 2 }],
      );
    });
    expect(toast.success).toHaveBeenCalledWith("Comanda #1 reenviada a imprimir");
  });

  it("blocks command submission when no products are selected", async () => {
    // CASE: the operator deselects every line in the command dialog.
    // VALIDATES: an empty selection cannot accidentally print the complete sale.
    useShiftHistoryMock.mockReturnValue({ data: [buildHistoryItem()], isLoading: false });
    useShiftReportMock.mockReturnValue({ data: buildReport(), isLoading: false });

    renderWithProviders(<ShiftControlPanel />);
    await expandShift();

    const nonVoidedRow = await screen.findByTestId("shift-report-order-order-1");
    const commandButton = nonVoidedRow.querySelector('[aria-label="Reimprimir comanda"]') as HTMLElement;
    fireEvent.click(commandButton);

    const cafeCheckbox = await screen.findByRole("checkbox", { name: "Seleccionar Café, línea 1" });
    fireEvent.click(cafeCheckbox);

    expect(screen.getByRole("alert")).toHaveTextContent("Selecciona al menos un producto.");
    expect(screen.getByRole("button", { name: "Imprimir seleccionados" })).toBeDisabled();
    expect(reprintCommandMock).not.toHaveBeenCalled();
  });

  it("shows noCommandPrinterConfigured toast when selected products have no configured printer", async () => {
    // CASE: the selection is valid but no selected line can be routed to a printer.
    // VALIDATES: routing feedback remains available after introducing the dialog.
    useShiftHistoryMock.mockReturnValue({ data: [buildHistoryItem()], isLoading: false });
    useShiftReportMock.mockReturnValue({ data: buildReport(), isLoading: false });
    reprintCommandMock.mockReturnValue(Promise.resolve({ printedCount: 0, errors: [] }));

    renderWithProviders(<ShiftControlPanel />);
    await expandShift();

    const nonVoidedRow = await screen.findByTestId("shift-report-order-order-1");
    const commandButton = nonVoidedRow.querySelector('[aria-label="Reimprimir comanda"]') as HTMLElement;
    fireEvent.click(commandButton);
    await screen.findByRole("checkbox", { name: "Seleccionar Café, línea 1" });
    fireEvent.click(screen.getByRole("button", { name: "Imprimir seleccionados" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("No hay impresora de comanda configurada para los productos de este pedido.");
    });
  });

  it("shows reprintFailed toast when selected product printing reports errors", async () => {
    // CASE: a selected product reaches its printer but the print adapter fails.
    // VALIDATES: print errors are not reported as successful partial reprints.
    useShiftHistoryMock.mockReturnValue({ data: [buildHistoryItem()], isLoading: false });
    useShiftReportMock.mockReturnValue({ data: buildReport(), isLoading: false });
    reprintCommandMock.mockReturnValue(
      Promise.resolve({ printedCount: 1, errors: [new Error("boom")] }),
    );

    renderWithProviders(<ShiftControlPanel />);
    await expandShift();

    const nonVoidedRow = await screen.findByTestId("shift-report-order-order-1");
    const commandButton = nonVoidedRow.querySelector('[aria-label="Reimprimir comanda"]') as HTMLElement;
    fireEvent.click(commandButton);
    await screen.findByRole("checkbox", { name: "Seleccionar Café, línea 1" });
    fireEvent.click(screen.getByRole("button", { name: "Imprimir seleccionados" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("No se pudo reimprimir el pedido.");
    });
  });

  // ─── Reprint shift report reads from SHIFT_QUERY_KEYS.report cache ──────

  it("reprints the shift report using data preloaded under SHIFT_QUERY_KEYS.report(shiftId)", async () => {
    useShiftHistoryMock.mockReturnValue({ data: [buildHistoryItem()], isLoading: false });
    useShiftReportMock.mockReturnValue({ data: buildReport(), isLoading: false });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const preloadedReport = buildReport();
    queryClient.setQueryData(SHIFT_QUERY_KEYS.report("shift-1"), preloadedReport);

    renderWithProviders(<ShiftControlPanel />, { queryClient });
    await expandShift();

    const reprintReportButton = await screen.findByRole("button", { name: /Reimprimir reporte/i });
    fireEvent.click(reprintReportButton);

    await waitFor(() => {
      expect(reprintShiftReportMock).toHaveBeenCalledTimes(1);
    });
    expect(reprintShiftReportMock.mock.calls[0][0]).toBe(preloadedReport);
    expect(toast.success).toHaveBeenCalledWith("Reporte de turno reenviado a imprimir");
  });
});
