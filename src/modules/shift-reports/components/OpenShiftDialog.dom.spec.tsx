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
    report: (id: string) => ["shift", "report", id],
    movements: (id: string) => ["shift", "movements", id],
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

import { toast } from "sonner";
import { OpenShiftDialog } from "./OpenShiftDialog";
import * as shiftHooks from "../use-shift-reports";
import { renderWithProviders, screen, waitFor, fireEvent } from "@/test/test-utils";

describe("OpenShiftDialog", () => {
  const mockOpenShift = mock();

  beforeEach(() => {
    mock.clearAllMocks();
    (shiftHooks.useOpenShift as any).mockReturnValue({
      mutate: mockOpenShift,
      isPending: false,
    });
  });

  it("renders input for opening cash when open", async () => {
    renderWithProviders(<OpenShiftDialog open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/efectivo inicial/i)).toBeInTheDocument();
    });
  });

  it("disables confirm button when amount is empty or zero", async () => {
    renderWithProviders(<OpenShiftDialog open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/efectivo inicial/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: /abrir turno/i });
    expect(confirmButton).toBeDisabled();
  });

  it("calls useOpenShift with cents when valid amount is entered", async () => {
    renderWithProviders(<OpenShiftDialog open={true} onOpenChange={() => {}} />);

    const input = await screen.findByLabelText(/efectivo inicial/i);
    fireEvent.change(input, { target: { value: "100" } });

    const confirmButton = screen.getByRole("button", { name: /abrir turno/i });
    expect(confirmButton).not.toBeDisabled();
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOpenShift).toHaveBeenCalledTimes(1);
      expect(mockOpenShift.mock.calls[0][0]).toBe(10000);
    });
  });

  it("shows toast success on open", async () => {
    mockOpenShift.mockImplementation((_amount: number, options?: any) => {
      options?.onSuccess?.();
    });

    renderWithProviders(<OpenShiftDialog open={true} onOpenChange={() => {}} />);

    const input = await screen.findByLabelText(/efectivo inicial/i);
    fireEvent.change(input, { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: /abrir turno/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledTimes(1);
    });
  });

  it("shows toast error on failure", async () => {
    mockOpenShift.mockImplementation((_amount: number, options?: any) => {
      options?.onError?.(new Error("fail"));
    });

    renderWithProviders(<OpenShiftDialog open={true} onOpenChange={() => {}} />);

    const input = await screen.findByLabelText(/efectivo inicial/i);
    fireEvent.change(input, { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: /abrir turno/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledTimes(1);
    });
  });
});