import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Clock, Printer, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useShiftHistory, useShiftReport, SHIFT_QUERY_KEYS } from "../use-shift-reports";
import { useFetchOrderDetail } from "../use-order-management";
import { usePrinters } from "@/modules/printer";
import { PRINTER_ROLE } from "@/modules/printer";
import { useCategories } from "@/modules/menu";
import { useSettingsStore } from "@/modules/settings";
import { formatPosCurrency } from "@/lib/currency";
import { reprintOrder } from "../lib/reprint-order";
import { reprintShiftReport } from "../lib/reprint-shift-report";
import { reprintCommand } from "../lib/reprint-command";
import { sortShiftList } from "../list-order";
import { ShiftReportView } from "./ShiftReportView";
import { VoidOrderConfirm } from "./VoidOrderConfirm";
import { EditOrderModal } from "./EditOrderModal";
import { CommandReprintDialog } from "./CommandReprintDialog";
import type { ShiftReport, ShiftReportOrder } from "../shift";
import type { CommandItemSelection, OrderDetail } from "../order-management";

// ─── ShiftReportInline ──────────────────────────────────────────────────────

function ShiftReportInline({
  shiftId,
  onReprintOrder,
  onEditOrder,
  onVoidOrder,
  onReprintCommand,
  onReprintReport,
}: {
  shiftId: string;
  onReprintOrder: (order: ShiftReportOrder) => void;
  onEditOrder: (order: ShiftReportOrder) => void;
  onVoidOrder: (order: ShiftReportOrder) => void;
  onReprintCommand: (order: ShiftReportOrder) => void;
  onReprintReport: (shiftId: string) => void;
}) {
  const { t } = useTranslation("shift");
  const { data: report, isLoading } = useShiftReport(shiftId);

  if (isLoading) {
    return (
      <div className="border-t border-border bg-surface-raised/40 py-6 px-5">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-surface-sunken" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 rounded bg-surface-sunken" />
            <div className="h-16 rounded bg-surface-sunken" />
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="border-t border-border bg-surface-raised/40 overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            onClick={() => onReprintReport(shiftId)}
            className="h-7 gap-1.5 rounded-card text-2xs text-text-muted hover:bg-surface-sunken hover:text-text"
          >
            <Printer className="h-3 w-3" />
            {t("reprintShiftReport")}
          </Button>
        </div>

        <div className="mt-4">
          <ShiftReportView
            report={report}
            onReprintOrder={onReprintOrder}
            onEditOrder={onEditOrder}
            onVoidOrder={onVoidOrder}
            onReprintCommand={onReprintCommand}
          />
        </div>
      </div>
    </div>
  );
}

// ─── ShiftControlPanel ──────────────────────────────────────────────────────

export function ShiftControlPanel() {
  const { t } = useTranslation("shift");
  const { data: history = [], isLoading } = useShiftHistory();
  const { data: printers = [] } = usePrinters();
  const { data: categories = [] } = useCategories();
  const comandaHeaderText = useSettingsStore((state) => state.comandaHeaderText);
  const shiftListOrder = useSettingsStore((state) => state.shiftListOrder);
  const headerText = comandaHeaderText?.trim() || "COMANDA";
  const orderedHistory = sortShiftList(history, (shift) => shift.openedAt, shiftListOrder);
  const queryClient = useQueryClient();
  const fetchOrderDetail = useFetchOrderDetail();
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);

  // Void order state
  const [voidOrderId, setVoidOrderId] = useState<string | null>(null);
  const [voidTicketNumber, setVoidTicketNumber] = useState<number>(0);

  // Edit order state
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [commandOrderId, setCommandOrderId] = useState<string | null>(null);

  const defaultReceiptPrinter =
    printers.find((p) => p.role === PRINTER_ROLE.RECEIPT && p.isDefault) ??
    printers.find((p) => p.role === PRINTER_ROLE.RECEIPT) ??
    null;

  const handleReprintOrder = async (order: ShiftReportOrder) => {
    if (!defaultReceiptPrinter) {
      toast.error(t("noPrinterConfigured"));
      return;
    }

    try {
      const orderDetail = await fetchOrderDetail(order.orderId);
      const result = await reprintOrder(orderDetail, defaultReceiptPrinter);
      if (result.isErr()) {
        toast.error(t("reprintFailed"));
      } else {
        toast.success(t("orderReprinted", { ticketNumber: order.ticketNumber }));
      }
    } catch {
      toast.error(t("reprintFailed"));
    }
  };

  const handleEditOrder = (order: ShiftReportOrder) => {
    setEditOrderId(order.orderId);
  };

  const handleVoidOrder = (order: ShiftReportOrder) => {
    setVoidOrderId(order.orderId);
    setVoidTicketNumber(order.ticketNumber);
  };

  const handleReprintCommand = (order: ShiftReportOrder) => {
    setCommandOrderId(order.orderId);
  };

  const handlePrintSelectedCommand = async (
    orderDetail: OrderDetail,
    selections: CommandItemSelection[],
  ): Promise<boolean> => {
    try {
      const { printedCount, errors } = await reprintCommand(
        orderDetail,
        printers,
        categories,
        headerText,
        selections,
      );
      if (errors.length > 0) {
        toast.error(t("reprintFailed"));
        return false;
      }
      if (printedCount === 0) {
        toast.error(t("noCommandPrinterConfigured"));
        return false;
      }

      toast.success(t("commandReprinted", { ticketNumber: orderDetail.ticketNumber }));
      return true;
    } catch {
      toast.error(t("reprintFailed"));
      return false;
    }
  };

  const handleReprintReport = async (shiftId: string) => {
    if (!defaultReceiptPrinter) {
      toast.error(t("noPrinterConfigured"));
      return;
    }

    const reportData = queryClient.getQueryData(SHIFT_QUERY_KEYS.report(shiftId)) as ShiftReport | undefined;

    if (!reportData) {
      toast.error(t("reprintFailed"));
      return;
    }

    const result = await reprintShiftReport(reportData, defaultReceiptPrinter, {
      title: t("reportTitle"),
      ordersLabel: t("totalOrders"),
      itemsLabel: t("totalItems"),
      cashLabel: t("cashTotal"),
      cardLabel: t("cardTotal"),
      totalLabel: t("totalSales"),
      openingCashLabel: t("openingCashLabel"),
      expectedCashLabel: t("expectedCash"),
      countedCashLabel: t("countedCashLabel"),
      differenceLabel: t("cashDifference"),
    });
    if (result.isErr()) {
      toast.error(t("reprintFailed"));
    } else {
      toast.success(t("reportReprinted"));
    }
  };

  if (isLoading) {
    return (
      <div className="grid min-h-full grid-rows-[auto_1fr] gap-3">
        <header className="flex flex-col gap-1 border-b border-border-strong pb-3">
          <h2 className="font-display text-lg text-primary-strong">{t("historyTitle")}</h2>
        </header>
        <div className="mt-2.5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-card border border-border bg-surface-sunken p-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-surface-raised" />
                <div className="h-4 w-16 rounded bg-surface-raised" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="grid min-h-full grid-rows-[auto_1fr] gap-3">
        <header className="flex flex-col gap-1 border-b border-border-strong pb-3">
          <h2 className="font-display text-lg text-primary-strong">{t("historyTitle")}</h2>
        </header>
        <section className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-sunken">
            <Receipt className="h-6 w-6 text-text-dim" />
          </div>
          <p className="mt-4 text-md font-medium text-text">{t("emptyHistory")}</p>
          <p className="mt-1 text-sm text-text-muted">Los turnos cerrados aparecerán aquí</p>
        </section>
      </div>
    );
  }

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr] gap-3">
      <header className="flex flex-col gap-1 border-b border-border-strong pb-3">
        <h2 className="font-display text-lg text-primary-strong">{t("historyTitle")}</h2>
        <p className="text-xs text-text-muted">
          {t("totalShifts", { count: history.length })}
        </p>
      </header>

      <div className="mt-2.5">
        <div className="grid gap-2">
          {orderedHistory.map((shift) => {
            const isExpanded = expandedShiftId === shift.shiftId;
            const isActive = !shift.closedAt;

            return (
              <div
                key={shift.shiftId}
                className="rounded-card border border-border bg-surface-raised shadow-card overflow-hidden transition-colors hover:border-border-strong"
              >
                <Button
                  variant="ghost"
                  onClick={() => setExpandedShiftId(isExpanded ? null : shift.shiftId)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={[
                      "flex h-9 w-9 items-center justify-center rounded-card shrink-0",
                      isActive
                        ? "border border-primary bg-primary/10"
                        : "border border-border bg-surface-sunken",
                    ].join(" ")}>
                      <Clock className={[
                        "h-4 w-4",
                        isActive ? "text-primary-strong" : "text-text-dim",
                      ].join(" ")} />
                    </div>
                    <div className="grid gap-0.5">
                      <span className="text-sm font-medium text-text">
                        {new Date(shift.openedAt).toLocaleDateString()}
                      </span>
                      <span className="text-2xs text-text-muted">
                          {shift.closedAt
                            ? `${new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${new Date(shift.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : (
                              <span className="inline-flex items-center gap-1 text-primary-strong">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                {t("activeShift")}
                              </span>
                            )
                          }
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-mono-tabular text-md font-semibold text-primary-strong">
                        {formatPosCurrency(shift.totalSales)}
                      </span>
                      <p className="text-2xs text-text-muted">
                        {shift.totalOrders} {t("totalOrders")}
                      </p>
                    </div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-card border border-border bg-surface-raised text-text-dim transition-colors hover:bg-surface-sunken hover:text-text">
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </div>
                </Button>

                {isExpanded && (
                  <ShiftReportInline
                    shiftId={shift.shiftId}
                    onReprintOrder={handleReprintOrder}
                    onEditOrder={handleEditOrder}
                    onVoidOrder={handleVoidOrder}
                    onReprintCommand={handleReprintCommand}
                    onReprintReport={handleReprintReport}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Void order confirmation */}
      {voidOrderId && (
        <VoidOrderConfirm
          orderId={voidOrderId}
          ticketNumber={voidTicketNumber}
          open={true}
          onClose={() => setVoidOrderId(null)}
        />
      )}

      {/* Edit order modal */}
      <EditOrderModal
        orderId={editOrderId}
        open={editOrderId !== null}
        onClose={() => setEditOrderId(null)}
      />

      <CommandReprintDialog
        orderId={commandOrderId}
        open={commandOrderId !== null}
        onClose={() => setCommandOrderId(null)}
        onPrint={handlePrintSelectedCommand}
      />
    </div>
  );
}
