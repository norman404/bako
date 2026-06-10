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
  useActiveShift: vi.fn(),
  useOpenShift: vi.fn(),
  useCloseShift: vi.fn(),
  useShiftReport: vi.fn(() => ({ data: null, isLoading: false })),
  SHIFT_QUERY_KEYS: {
    active: ["shift", "active"],
    history: ["shift", "history"],
    report: (shiftId: string) => ["shift", "report", shiftId],
  },
}));

vi.mock("@/modules/shift-reports/persistence/shift-drizzle.repository", () => ({
  shiftDrizzleRepository: {
    openShift: vi.fn(),
    closeShift: vi.fn(),
    getActive: vi.fn(),
    listHistory: vi.fn(),
    getReport: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { ShiftButton } from "./ShiftButton";
import * as shiftHooks from "@/modules/shift-reports/hooks/use-shift-reports";
import { renderWithProviders, screen, waitFor, fireEvent } from "@/test/test-utils";

describe("ShiftButton", () => {
  const mockOpenShift = vi.fn();
  const mockCloseShift = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
