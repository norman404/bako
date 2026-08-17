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
  useOpenShift: mock(),
  useCloseShift: mock(),
  useShiftReport: mock(() => ({ data: null, isLoading: false })),
  useCashMovements: mock(() => ({ data: [], isLoading: false })),
  useAddCashMovement: mock(),
  useUpdateCashMovement: mock(),
  useDeleteCashMovement: mock(),
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

import { toast } from "sonner";
import { CloseShiftDialog } from "./CloseShiftDialog";
import * as shiftHooks from "@/modules/shift-reports/hooks/use-shift-reports";
import { renderWithProviders, screen, waitFor, fireEvent } from "@/test/test-utils";

const mockReport = {
  shiftId: "shift-1",
  openedAt: new Date(),
  closedAt: null,
  totalOrders: 2,
  totalItems: 5,
  totalSales: 5000,
  cashTotal: 3000,
  cardTotal: 2000,
  orders: [],
  openingCash: 10000,
  cashMovementsIn: 2000,
  cashMovementsOut: 1000,
  expectedCash: 14000,
  countedCash: null,
  cashDifference: null,
  cashMovements: [],
};

describe("CloseShiftDialog", () => {
  const mockCloseShift = mock();

  beforeEach(() => {
    mock.clearAllMocks();
    (shiftHooks.useShiftReport as any).mockReturnValue({
      data: mockReport,
      isLoading: false,
    });
    (shiftHooks.useCloseShift as any).mockReturnValue({
      mutate: mockCloseShift,
      isPending: false,
    });
  });

  it("renders the cash breakdown showing opening, sales, income, expense, and expected", async () => {
    renderWithProviders(
      <CloseShiftDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    await waitFor(() => {
      expect(screen.getByText("$100.00")).toBeInTheDocument();
      expect(screen.getByText("+$30.00")).toBeInTheDocument();
      expect(screen.getByText("+$20.00")).toBeInTheDocument();
      expect(screen.getByText("-$10.00")).toBeInTheDocument();
      expect(screen.getByText("$140.00")).toBeInTheDocument();
    });
  });

  it("renders input for counted cash", async () => {
    renderWithProviders(
      <CloseShiftDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/efectivo contado/i)).toBeInTheDocument();
    });
  });

  it("calculates difference in real time — zero difference", async () => {
    renderWithProviders(
      <CloseShiftDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    const input = await screen.findByLabelText(/efectivo contado/i);
    fireEvent.change(input, { target: { value: "140" } });

    await waitFor(() => {
      expect(screen.getByText(/cuadra perfecto/i)).toBeInTheDocument();
    });
  });

  it("calculates difference in real time — surplus", async () => {
    renderWithProviders(
      <CloseShiftDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    const input = await screen.findByLabelText(/efectivo contado/i);
    fireEvent.change(input, { target: { value: "145" } });

    await waitFor(() => {
      expect(screen.getByText(/sobrante/i)).toBeInTheDocument();
    });
  });

  it("calculates difference in real time — shortage", async () => {
    renderWithProviders(
      <CloseShiftDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    const input = await screen.findByLabelText(/efectivo contado/i);
    fireEvent.change(input, { target: { value: "130" } });

    await waitFor(() => {
      expect(screen.getByText(/faltante/i)).toBeInTheDocument();
    });
  });

  it("disables confirm button when counted cash is empty or invalid", async () => {
    renderWithProviders(
      <CloseShiftDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/efectivo contado/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: /cerrar turno/i });
    expect(confirmButton).toBeDisabled();
  });

  it("calls useCloseShift with shiftId and countedCash on confirm", async () => {
    renderWithProviders(
      <CloseShiftDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    const input = await screen.findByLabelText(/efectivo contado/i);
    fireEvent.change(input, { target: { value: "140" } });

    const confirmButton = screen.getByRole("button", { name: /cerrar turno/i });
    expect(confirmButton).not.toBeDisabled();
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockCloseShift).toHaveBeenCalledTimes(1);
      expect(mockCloseShift.mock.calls[0][0]).toEqual({
        shiftId: "shift-1",
        countedCash: 14000,
      });
    });
  });

  it("shows toast on success", async () => {
    mockCloseShift.mockImplementation((_args: unknown, options?: any) => {
      options?.onSuccess?.();
    });

    renderWithProviders(
      <CloseShiftDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    const input = await screen.findByLabelText(/efectivo contado/i);
    fireEvent.change(input, { target: { value: "140" } });
    fireEvent.click(screen.getByRole("button", { name: /cerrar turno/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledTimes(1);
    });
  });

  it("shows toast on error", async () => {
    mockCloseShift.mockImplementation((_args: unknown, options?: any) => {
      options?.onError?.(new Error("fail"));
    });

    renderWithProviders(
      <CloseShiftDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    const input = await screen.findByLabelText(/efectivo contado/i);
    fireEvent.change(input, { target: { value: "140" } });
    fireEvent.click(screen.getByRole("button", { name: /cerrar turno/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledTimes(1);
    });
  });
});