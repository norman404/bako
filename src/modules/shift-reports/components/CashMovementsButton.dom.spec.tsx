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

mock.module("@/modules/shift-reports/hooks/use-shift-reports", () => ({
  useActiveShift: mock(),
  useCashMovements: mock(),
  useAddCashMovement: mock(),
  useUpdateCashMovement: mock(),
  useDeleteCashMovement: mock(),
  useOpenShift: mock(),
  useCloseShift: mock(),
  useShiftReport: mock(() => ({ data: null, isLoading: false })),
  SHIFT_QUERY_KEYS: {
    active: ["shift", "active"],
    history: ["shift", "history"],
    report: (id: string) => ["shift", "report", id],
    movements: (id: string) => ["shift", "movements", id],
  },
}));

mock.module("@/modules/shift-reports/persistence/shift-drizzle.repository", () => ({
  shiftDrizzleRepository: {
    openShift: mock(),
    closeShift: mock(),
    getActive: mock(),
    listHistory: mock(),
    getReport: mock(),
  },
}));

import { CashMovementsButton } from "./CashMovementsButton";
import * as shiftHooks from "@/modules/shift-reports/hooks/use-shift-reports";
import { renderWithProviders, screen, waitFor, fireEvent } from "@/test/test-utils";

describe("CashMovementsButton", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    (shiftHooks.useCashMovements as any).mockReturnValue({ data: [] });
    (shiftHooks.useAddCashMovement as any).mockReturnValue({
      mutate: mock(),
      isPending: false,
    });
    (shiftHooks.useUpdateCashMovement as any).mockReturnValue({
      mutate: mock(),
      isPending: false,
    });
    (shiftHooks.useDeleteCashMovement as any).mockReturnValue({
      mutate: mock(),
      isPending: false,
    });
  });

  it("renders button when active shift exists", async () => {
    (shiftHooks.useActiveShift as any).mockReturnValue({
      data: { id: "shift-1", openedAt: new Date(), closedAt: null, status: "active" },
      isLoading: false,
    });

    renderWithProviders(<CashMovementsButton />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /movimientos de caja/i }),
      ).toBeInTheDocument();
    });
  });

  it("does not render button when no active shift", async () => {
    (shiftHooks.useActiveShift as any).mockReturnValue({
      data: null,
      isLoading: false,
    });

    renderWithProviders(<CashMovementsButton />);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /movimientos de caja/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("opens dialog on click", async () => {
    (shiftHooks.useActiveShift as any).mockReturnValue({
      data: { id: "shift-1", openedAt: new Date(), closedAt: null, status: "active" },
      isLoading: false,
    });

    renderWithProviders(<CashMovementsButton />);

    const button = await screen.findByRole("button", { name: /movimientos de caja/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /movimientos de caja/i }),
      ).toBeInTheDocument();
    });
  });

  it("closes dialog on close", async () => {
    (shiftHooks.useActiveShift as any).mockReturnValue({
      data: { id: "shift-1", openedAt: new Date(), closedAt: null, status: "active" },
      isLoading: false,
    });

    renderWithProviders(<CashMovementsButton />);

    const button = await screen.findByRole("button", { name: /movimientos de caja/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /movimientos de caja/i }),
      ).toBeInTheDocument();
    });

    const closeButton = screen.getByRole("button", { name: /cancelar/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /movimientos de caja/i }),
      ).not.toBeInTheDocument();
    });
  });
});