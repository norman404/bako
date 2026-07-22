import { describe, expect, it, mock, beforeEach } from "bun:test";



mock.module("@/modules/shift-reports/hooks/use-shift-reports", () => ({
  useShiftReport: mock(() => ({ data: null, isLoading: false })),
  SHIFT_QUERY_KEYS: {
    active: ["shift", "active"],
    history: ["shift", "history"],
    report: (shiftId: string) => ["shift", "report", shiftId],
  },
}));

import { ShiftReportModal } from "./ShiftReportModal";
import * as shiftHooks from "@/modules/shift-reports/hooks/use-shift-reports";
import { renderWithProviders, screen, waitFor, fireEvent } from "@/test/test-utils";

const mockReport = {
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
    },
  ],
};

describe("ShiftReportModal", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("renders total items sold in the metrics grid", async () => {
    (shiftHooks.useShiftReport as any).mockReturnValue({ data: mockReport, isLoading: false });

    renderWithProviders(<ShiftReportModal shiftId="shift-1" open={true} onClose={mock()} />);

    await waitFor(() => {
      expect(screen.getByText(/Productos vendidos/i)).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  it("renders the sales list with order totals", async () => {
    (shiftHooks.useShiftReport as any).mockReturnValue({ data: mockReport, isLoading: false });

    renderWithProviders(<ShiftReportModal shiftId="shift-1" open={true} onClose={mock()} />);

    await waitFor(() => {
      expect(screen.getByText(/Listado de ventas/i)).toBeInTheDocument();
      expect(screen.getByText("#1")).toBeInTheDocument();
      expect(screen.getByText("#2")).toBeInTheDocument();
    });
  });

  it("expands an order to show its items", async () => {
    (shiftHooks.useShiftReport as any).mockReturnValue({ data: mockReport, isLoading: false });

    renderWithProviders(<ShiftReportModal shiftId="shift-1" open={true} onClose={mock()} />);

    const orderRow = await screen.findByText("#1");
    fireEvent.click(orderRow);

    await waitFor(() => {
      expect(screen.getByText("Café")).toBeInTheDocument();
      expect(screen.getByText("Medialuna")).toBeInTheDocument();
    });
  });
});
