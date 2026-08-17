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

import { CashMovementsDialog } from "./CashMovementsDialog";
import * as shiftHooks from "@/modules/shift-reports/hooks/use-shift-reports";
import { toast } from "sonner";
import { formatPosCurrency } from "@/lib/currency";
import type { CashMovement } from "@/modules/shift-reports/domain/shift";
import { renderWithProviders, screen, waitFor, fireEvent } from "@/test/test-utils";

function buildCashMovement(overrides: Partial<CashMovement> = {}): CashMovement {
  return {
    id: overrides.id ?? "mv-1",
    shiftId: overrides.shiftId ?? "shift-1",
    type: overrides.type ?? "income",
    amount: overrides.amount ?? 5000,
    reason: overrides.reason ?? "Fondo adicional",
    createdAt: overrides.createdAt ?? new Date("2026-08-01T10:00:00.000Z"),
  };
}

describe("CashMovementsDialog", () => {
  const mockAddMutate = mock();
  const mockUpdateMutate = mock();
  const mockDeleteMutate = mock();

  beforeEach(() => {
    mock.clearAllMocks();
    (shiftHooks.useCashMovements as any).mockReturnValue({ data: [] });
    (shiftHooks.useAddCashMovement as any).mockReturnValue({
      mutate: mockAddMutate,
      isPending: false,
    });
    (shiftHooks.useUpdateCashMovement as any).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false,
    });
    (shiftHooks.useDeleteCashMovement as any).mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
    });
  });

  it("renders the form with type selector, amount input, and reason input", async () => {
    renderWithProviders(
      <CashMovementsDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /entrada/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /salida/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/monto/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/motivo/i)).toBeInTheDocument();
    });
  });

  it("disables add button when amount is empty", async () => {
    renderWithProviders(
      <CashMovementsDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/monto/i)).toBeInTheDocument();
    });

    const addButton = screen.getByRole("button", { name: /agregar/i });
    expect(addButton).toBeDisabled();
  });

  it("disables add button when reason is shorter than 3 characters", async () => {
    renderWithProviders(
      <CashMovementsDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    const amountInput = await screen.findByLabelText(/monto/i);
    fireEvent.change(amountInput, { target: { value: "50" } });

    const addButton = screen.getByRole("button", { name: /agregar/i });
    expect(addButton).toBeDisabled();
  });

  it("calls useAddCashMovement on submit with valid input", async () => {
    renderWithProviders(
      <CashMovementsDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    const amountInput = await screen.findByLabelText(/monto/i);
    const reasonInput = screen.getByLabelText(/motivo/i);
    fireEvent.change(amountInput, { target: { value: "50" } });
    fireEvent.change(reasonInput, { target: { value: "Fondo" } });

    const addButton = screen.getByRole("button", { name: /agregar/i });
    expect(addButton).not.toBeDisabled();
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockAddMutate).toHaveBeenCalledTimes(1);
      expect(mockAddMutate).toHaveBeenCalledWith(
        { shiftId: "shift-1", input: { type: "expense", amount: 5000, reason: "Fondo" } },
        expect.any(Object),
      );
    });
  });

  it("renders the list of movements", async () => {
    const movements = [
      buildCashMovement({ id: "mv-1", reason: "Fondo inicial" }),
      buildCashMovement({ id: "mv-2", reason: "Compra de insumos", type: "expense" }),
    ];
    (shiftHooks.useCashMovements as any).mockReturnValue({ data: movements });

    renderWithProviders(
      <CashMovementsDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    await waitFor(() => {
      expect(screen.getByText("Fondo inicial")).toBeInTheDocument();
      expect(screen.getByText("Compra de insumos")).toBeInTheDocument();
    });
  });

  it("clicking edit loads the movement into the form", async () => {
    const movements = [
      buildCashMovement({
        id: "mv-1",
        type: "expense",
        amount: 2500,
        reason: "Compra de insumos",
      }),
    ];
    (shiftHooks.useCashMovements as any).mockReturnValue({ data: movements });

    renderWithProviders(
      <CashMovementsDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    const editButton = await screen.findByRole("button", { name: /editar movimiento/i });
    fireEvent.click(editButton);

    await waitFor(() => {
      const reasonInput = screen.getByLabelText(/motivo/i);
      expect(reasonInput).toHaveValue("Compra de insumos");
      const amountInput = screen.getByLabelText(/monto/i);
      expect(amountInput).toHaveValue("25.00");
      expect(screen.getByRole("button", { name: /salida/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
  });

  it("clicking delete calls useDeleteCashMovement", async () => {
    const movements = [buildCashMovement({ id: "mv-1" })];
    (shiftHooks.useCashMovements as any).mockReturnValue({ data: movements });

    renderWithProviders(
      <CashMovementsDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    const deleteButton = await screen.findByRole("button", { name: /eliminar movimiento/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteMutate).toHaveBeenCalledTimes(1);
      expect(mockDeleteMutate).toHaveBeenCalledWith(
        { id: "mv-1", shiftId: "shift-1" },
        expect.any(Object),
      );
    });
  });

  it("shows income and expense totals", async () => {
    const movements = [
      buildCashMovement({ id: "mv-1", type: "income", amount: 100000 }),
      buildCashMovement({ id: "mv-2", type: "income", amount: 200000 }),
      buildCashMovement({ id: "mv-3", type: "expense", amount: 30000 }),
      buildCashMovement({ id: "mv-4", type: "expense", amount: 20000 }),
    ];
    (shiftHooks.useCashMovements as any).mockReturnValue({ data: movements });

    renderWithProviders(
      <CashMovementsDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    await waitFor(() => {
      expect(screen.getByText(formatPosCurrency(300000))).toBeInTheDocument();
      expect(screen.getByText(formatPosCurrency(50000))).toBeInTheDocument();
      expect(screen.getByText(formatPosCurrency(250000))).toBeInTheDocument();
    });
  });

  it("shows toast on add success", async () => {
    mockAddMutate.mockImplementation((_payload: any, callbacks: any) => {
      callbacks.onSuccess();
    });

    renderWithProviders(
      <CashMovementsDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    const amountInput = await screen.findByLabelText(/monto/i);
    const reasonInput = screen.getByLabelText(/motivo/i);
    fireEvent.change(amountInput, { target: { value: "50" } });
    fireEvent.change(reasonInput, { target: { value: "Fondo" } });

    fireEvent.click(screen.getByRole("button", { name: /agregar/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledTimes(1);
    });
  });

  it("shows toast on add error", async () => {
    mockAddMutate.mockImplementation((_payload: any, callbacks: any) => {
      callbacks.onError(new Error("boom"));
    });

    renderWithProviders(
      <CashMovementsDialog open={true} onOpenChange={() => {}} shiftId="shift-1" />,
    );

    const amountInput = await screen.findByLabelText(/monto/i);
    const reasonInput = screen.getByLabelText(/motivo/i);
    fireEvent.change(amountInput, { target: { value: "50" } });
    fireEvent.change(reasonInput, { target: { value: "Fondo" } });

    fireEvent.click(screen.getByRole("button", { name: /agregar/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledTimes(1);
    });
  });
});