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
mock.module("../use-shift-reports", () => ({
  useActiveShift: mock(),
  useOpenShift: mock(),
  useCloseShift: mock(),
  useShiftReport: mock(() => ({ data: null, isLoading: false })),
  SHIFT_QUERY_KEYS: {
    active: ["shift", "active"],
    history: ["shift", "history"],
    report: (shiftId: string) => ["shift", "report", shiftId],
  },
}));

mock.module("../repository", () => ({
  shiftDrizzleRepository: {
    openShift: mock(),
    closeShift: mock(),
    getActive: mock(),
    listHistory: mock(),
    getReport: mock(),
  },
}));

import { ShiftButton } from "./ShiftButton";
import * as shiftHooks from "../use-shift-reports";
import { renderWithProviders, screen, waitFor, fireEvent } from "@/test/test-utils";

describe("ShiftButton", () => {
  const mockOpenShift = mock();
  const mockCloseShift = mock();

  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("renders open shift button when no active shift", async () => {
    (shiftHooks.useActiveShift as any).mockReturnValue({ data: null, isLoading: false });
    (shiftHooks.useOpenShift as any).mockReturnValue({ mutate: mockOpenShift, isPending: false });
    (shiftHooks.useCloseShift as any).mockReturnValue({ mutate: mockCloseShift, isPending: false });

    renderWithProviders(<ShiftButton />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /abrir turno/i })).toBeInTheDocument();
    });
  });

  it("renders close shift button when active shift exists", async () => {
    (shiftHooks.useActiveShift as any).mockReturnValue({
      data: { id: "shift-1", openedAt: new Date(), closedAt: null, status: "active", openingCash: 0, countedCash: null, cashDifference: null },
      isLoading: false,
    });
    (shiftHooks.useOpenShift as any).mockReturnValue({ mutate: mockOpenShift, isPending: false });
    (shiftHooks.useCloseShift as any).mockReturnValue({ mutate: mockCloseShift, isPending: false });

    renderWithProviders(<ShiftButton />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cerrar turno/i })).toBeInTheDocument();
    });
  });

  it("opens OpenShiftDialog when clicked with no active shift", async () => {
    (shiftHooks.useActiveShift as any).mockReturnValue({ data: null, isLoading: false });
    (shiftHooks.useOpenShift as any).mockReturnValue({ mutate: mockOpenShift, isPending: false });
    (shiftHooks.useCloseShift as any).mockReturnValue({ mutate: mockCloseShift, isPending: false });

    renderWithProviders(<ShiftButton />);

    const button = await screen.findByRole("button", { name: /abrir turno/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByLabelText(/efectivo inicial/i)).toBeInTheDocument();
    });
  });

  it("opens CloseShiftDialog when clicked with active shift", async () => {
    (shiftHooks.useActiveShift as any).mockReturnValue({
      data: { id: "shift-1", openedAt: new Date(), closedAt: null, status: "active", openingCash: 0, countedCash: null, cashDifference: null },
      isLoading: false,
    });
    (shiftHooks.useOpenShift as any).mockReturnValue({ mutate: mockOpenShift, isPending: false });
    (shiftHooks.useCloseShift as any).mockReturnValue({ mutate: mockCloseShift, isPending: false });

    renderWithProviders(<ShiftButton />);

    const button = await screen.findByRole("button", { name: /cerrar turno/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByLabelText(/efectivo contado/i)).toBeInTheDocument();
    });
  });
});
