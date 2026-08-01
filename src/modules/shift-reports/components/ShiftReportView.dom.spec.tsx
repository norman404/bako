import { describe, expect, it, mock } from "bun:test";

import { ShiftReportView } from "./ShiftReportView";
import { renderWithProviders, screen, fireEvent } from "@/test/test-utils";
import type { ShiftReport } from "@/modules/shift-reports/domain/shift";

const baseReport: ShiftReport = {
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
      isVoided: false,
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
      isVoided: true,
    },
  ],
};

describe("ShiftReportView", () => {
  it("renders opened/closed dates and the totals grid", () => {
    renderWithProviders(<ShiftReportView report={baseReport} />);

    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Cierre")).toBeInTheDocument();
    expect(screen.getByText(/Productos vendidos/i)).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("expands an order to show its items", async () => {
    renderWithProviders(<ShiftReportView report={baseReport} />);

    const orderRow = screen.getByText("#1");
    fireEvent.click(orderRow);

    expect(await screen.findByText("Café")).toBeInTheDocument();
    expect(screen.getByText("Medialuna")).toBeInTheDocument();
  });

  it("shows the voided badge and hides action buttons for a voided order even when callbacks are passed", () => {
    renderWithProviders(
      <ShiftReportView
        report={baseReport}
        onReprintOrder={mock()}
        onEditOrder={mock()}
        onVoidOrder={mock()}
      />,
    );

    expect(screen.getByText("Anulado")).toBeInTheDocument();

    const voidedRow = screen.getByTestId("shift-report-order-order-2");
    expect(voidedRow.querySelector('[aria-label="Reimprimir"]')).toBeNull();
    expect(voidedRow.querySelector('[aria-label="Editar"]')).toBeNull();
    expect(voidedRow.querySelector('[aria-label="Anular pedido"]')).toBeNull();
  });

  it("shows action buttons for a non-voided order when callbacks are passed", () => {
    renderWithProviders(
      <ShiftReportView
        report={baseReport}
        onReprintOrder={mock()}
        onEditOrder={mock()}
        onVoidOrder={mock()}
      />,
    );

    expect(screen.getAllByLabelText("Reimprimir").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Editar").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Anular pedido").length).toBeGreaterThan(0);
  });

  it("does not show any action buttons when no callbacks are passed (read-only mode)", () => {
    renderWithProviders(<ShiftReportView report={baseReport} />);

    expect(screen.queryByLabelText("Reimprimir")).toBeNull();
    expect(screen.queryByLabelText("Editar")).toBeNull();
    expect(screen.queryByLabelText("Anular pedido")).toBeNull();
    expect(screen.queryByText("Anulado")).not.toBeNull(); // order-2 badge still shows regardless
  });

  it("invokes onReprintOrder with the correct order when the reprint button is clicked", () => {
    const onReprintOrder = mock();
    renderWithProviders(
      <ShiftReportView
        report={baseReport}
        onReprintOrder={onReprintOrder}
        onEditOrder={mock()}
        onVoidOrder={mock()}
      />,
    );

    const reprintButtons = screen.getAllByLabelText("Reimprimir");
    fireEvent.click(reprintButtons[0]);

    expect(onReprintOrder).toHaveBeenCalledTimes(1);
    expect(onReprintOrder.mock.calls[0][0].orderId).toBe("order-1");
  });

  it("invokes onEditOrder with the correct order when the edit button is clicked", () => {
    const onEditOrder = mock();
    renderWithProviders(
      <ShiftReportView
        report={baseReport}
        onReprintOrder={mock()}
        onEditOrder={onEditOrder}
        onVoidOrder={mock()}
      />,
    );

    const editButtons = screen.getAllByLabelText("Editar");
    fireEvent.click(editButtons[0]);

    expect(onEditOrder).toHaveBeenCalledTimes(1);
    expect(onEditOrder.mock.calls[0][0].orderId).toBe("order-1");
  });

  it("invokes onVoidOrder with the correct order when the void button is clicked", () => {
    const onVoidOrder = mock();
    renderWithProviders(
      <ShiftReportView
        report={baseReport}
        onReprintOrder={mock()}
        onEditOrder={mock()}
        onVoidOrder={onVoidOrder}
      />,
    );

    const voidButtons = screen.getAllByLabelText("Anular pedido");
    fireEvent.click(voidButtons[0]);

    expect(onVoidOrder).toHaveBeenCalledTimes(1);
    expect(onVoidOrder.mock.calls[0][0].orderId).toBe("order-1");
  });
});

describe("ShiftReportView — reprint command", () => {
  it("shows the reprint command button for a non-voided order and hides it for a voided one", () => {
    renderWithProviders(
      <ShiftReportView report={baseReport} onReprintCommand={mock()} />,
    );

    const nonVoidedRow = screen.getByTestId("shift-report-order-order-1");
    expect(nonVoidedRow.querySelector('[aria-label="Reimprimir comanda"]')).not.toBeNull();

    const voidedRow = screen.getByTestId("shift-report-order-order-2");
    expect(voidedRow.querySelector('[aria-label="Reimprimir comanda"]')).toBeNull();
  });

  it("does not show the reprint command button when no onReprintCommand callback is passed", () => {
    renderWithProviders(<ShiftReportView report={baseReport} />);

    expect(screen.queryByLabelText("Reimprimir comanda")).toBeNull();
  });

  it("invokes onReprintCommand with the correct order when the button is clicked", () => {
    const onReprintCommand = mock();
    renderWithProviders(
      <ShiftReportView report={baseReport} onReprintCommand={onReprintCommand} />,
    );

    const commandButtons = screen.getAllByLabelText("Reimprimir comanda");
    fireEvent.click(commandButtons[0]);

    expect(onReprintCommand).toHaveBeenCalledTimes(1);
    expect(onReprintCommand.mock.calls[0][0].orderId).toBe("order-1");
  });
});
