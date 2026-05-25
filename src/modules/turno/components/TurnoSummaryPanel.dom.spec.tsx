import type { SVGProps } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    return function Icon(props: SVGProps<SVGSVGElement>) {
      return <svg aria-hidden="true" data-icon={name} {...props} />;
    };
  };

  return {
    CreditCard: createIcon("CreditCard"),
    Package: createIcon("Package"),
    Receipt: createIcon("Receipt"),
    RefreshCw: createIcon("RefreshCw"),
    Wallet: createIcon("Wallet"),
  };
});

import * as turnoMetricsHooks from "@/modules/turno/hooks/use-turno-metrics";
import { TurnoSummaryPanel } from "@/modules/turno/components/TurnoSummaryPanel";
import { formatPosCurrency } from "@/lib/currency";
import { fireEvent, renderWithProviders, screen } from "@/test/test-utils";

const FIXED_DATE = new Date("2026-05-12T10:15:30.000Z");

type UseTurnoMetricsResult = ReturnType<typeof turnoMetricsHooks.useTurnoMetrics>;

const BASE_METRICS = {
  sales: 125000,
  tickets: 18,
  averageTicket: 6944,
  itemsSold: 42,
  paymentBreakdown: {
    cashSales: 75000,
    cardSales: 50000,
  },
  topProducts: [
    {
      productId: "flat-white",
      productName: "Flat white",
      quantitySold: 12,
      sales: 66000,
    },
  ],
  updatedAt: FIXED_DATE,
} as const;

function mockUseTurnoMetrics(overrides: Partial<UseTurnoMetricsResult> = {}) {
  return vi.spyOn(turnoMetricsHooks, "useTurnoMetrics").mockReturnValue({
    data: BASE_METRICS,
    error: null,
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
    ...overrides,
  } as UseTurnoMetricsResult);
}

describe("TurnoSummaryPanel", () => {
  it("should render an ultra minimal shift summary from the turno feature", () => {
    // CASE: shift metrics are available when the operator opens the summary section.
    // VALIDATES: metrics ownership moved out of pos into turno.
    mockUseTurnoMetrics();

    // Arrange
    renderWithProviders(<TurnoSummaryPanel />);

    // Assert
    expect(screen.getByRole("heading", { name: /^turno$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /resumen/i })).toBeInTheDocument();
    expect(screen.getByText(formatPosCurrency(BASE_METRICS.sales))).toBeInTheDocument();
  });

  it("should refresh the metrics when the operator requests fresh shift data", () => {
    // CASE: the operator wants to refresh the summary manually.
    // VALIDATES: the turno panel delegates the action to the turno metrics hook.
    const refetch = vi.fn();
    mockUseTurnoMetrics({ refetch });

    // Arrange
    renderWithProviders(<TurnoSummaryPanel />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: /refrescar/i }));

    // Assert
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
