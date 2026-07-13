import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("lucide-react", async () => {
  const React = await import("react");
  const createIcon = (name: string) => {
    return React.forwardRef(function Icon(props: any, ref: any) {
      return React.createElement("svg", { ref, "aria-hidden": "true", "data-icon": name, ...props });
    });
  };

  return new Proxy({}, {
    get(target: any, prop: string | symbol) {
      if (prop === 'default' || prop === '__esModule' || typeof prop !== 'string') {
        return target[prop];
      }
      if (!target[prop]) {
        target[prop] = createIcon(prop);
      }
      return target[prop];
    }
  });
});

vi.mock("@/modules/shift-reports/hooks/use-shift-reports", () => ({
  useShiftHistory: vi.fn(),
  useShiftReport: vi.fn(() => ({ data: null, isLoading: false })),
  SHIFT_QUERY_KEYS: {
    active: ["shift", "active"],
    history: ["shift", "history"],
    report: (shiftId: string) => ["shift", "report", shiftId],
  },
}));

import { ShiftHistoryPanel } from "./ShiftHistoryPanel";
import * as shiftHooks from "@/modules/shift-reports/hooks/use-shift-reports";
import { renderWithProviders, screen, waitFor, fireEvent } from "@/test/test-utils";

describe("ShiftHistoryPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no shifts", async () => {
    (shiftHooks.useShiftHistory as any).mockReturnValue({ data: [], isLoading: false });

    renderWithProviders(<ShiftHistoryPanel />);

    await waitFor(() => {
      expect(screen.getByText(/No hay turnos registrados/i)).toBeInTheDocument();
    });
  });

  it("renders shift list with totals", async () => {
    (shiftHooks.useShiftHistory as any).mockReturnValue({
      data: [
        {
          shiftId: "shift-1",
          openedAt: new Date("2026-06-04T08:00:00.000Z"),
          closedAt: new Date("2026-06-04T16:00:00.000Z"),
          totalOrders: 5,
          totalSales: 12500,
        },
      ],
      isLoading: false,
    });

    renderWithProviders(<ShiftHistoryPanel />);

    await waitFor(() => {
      expect(screen.getByText("5 Órdenes")).toBeInTheDocument();
    });
  });

  it("expands shift to show inline report on click", async () => {
    (shiftHooks.useShiftHistory as any).mockReturnValue({
      data: [
        {
          shiftId: "shift-1",
          openedAt: new Date("2026-06-04T08:00:00.000Z"),
          closedAt: null,
          totalOrders: 3,
          totalSales: 5000,
        },
      ],
      isLoading: false,
    });
    (shiftHooks.useShiftReport as any).mockReturnValue({
      data: {
        shiftId: "shift-1",
        openedAt: new Date("2026-06-04T08:00:00.000Z"),
        closedAt: null,
        totalOrders: 3,
        totalItems: 7,
        totalSales: 5000,
        cashTotal: 3000,
        cardTotal: 2000,
        orders: [
          {
            orderId: "order-1",
            ticketNumber: 1,
            createdAt: new Date("2026-06-04T10:00:00.000Z"),
            total: 5000,
            paymentMethod: "cash",
            itemCount: 7,
            items: [
              {
                productId: "product-1",
                productName: "Café con leche",
                quantity: 7,
                unitPrice: 2500,
              },
            ],
          },
        ],
      },
      isLoading: false,
    });

    renderWithProviders(<ShiftHistoryPanel />);

    const shiftButton = await screen.findByText("3 Órdenes");
    fireEvent.click(shiftButton);

    await waitFor(() => {
      expect(screen.getByText(/Efectivo/i)).toBeInTheDocument();
      expect(screen.getByText(/Tarjeta/i)).toBeInTheDocument();
    });
  });
});
