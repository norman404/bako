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
  SHIFT_QUERY_KEYS: {
    active: ["shift", "active"],
    history: ["shift", "history"],
    report: (shiftId: string) => ["shift", "report", shiftId],
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

import { ShiftButton } from "./ShiftButton";
import * as shiftHooks from "@/modules/shift-reports/hooks/use-shift-reports";
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
      data: { id: "shift-1", openedAt: new Date(), closedAt: null, status: "active" },
      isLoading: false,
    });
    (shiftHooks.useOpenShift as any).mockReturnValue({ mutate: mockOpenShift, isPending: false });
    (shiftHooks.useCloseShift as any).mockReturnValue({ mutate: mockCloseShift, isPending: false });

    renderWithProviders(<ShiftButton />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cerrar turno/i })).toBeInTheDocument();
    });
  });

  it("opens shift when clicked", async () => {
    (shiftHooks.useActiveShift as any).mockReturnValue({ data: null, isLoading: false });
    (shiftHooks.useOpenShift as any).mockReturnValue({ mutate: mockOpenShift, isPending: false });
    (shiftHooks.useCloseShift as any).mockReturnValue({ mutate: mockCloseShift, isPending: false });

    renderWithProviders(<ShiftButton />);

    const button = await screen.findByRole("button", { name: /abrir turno/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOpenShift).toHaveBeenCalledTimes(1);
    });
  });

  it("shows confirm dialog when closing", async () => {
    (shiftHooks.useActiveShift as any).mockReturnValue({
      data: { id: "shift-1", openedAt: new Date(), closedAt: null, status: "active" },
      isLoading: false,
    });
    (shiftHooks.useOpenShift as any).mockReturnValue({ mutate: mockOpenShift, isPending: false });
    (shiftHooks.useCloseShift as any).mockReturnValue({ mutate: mockCloseShift, isPending: false });

    renderWithProviders(<ShiftButton />);

    const button = await screen.findByRole("button", { name: /cerrar turno/i });
    fireEvent.click(button);

    // Dialog opens — verify by checking for action buttons in the dialog
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cerrar turno/i })).toBeInTheDocument();
    });
  });
});
