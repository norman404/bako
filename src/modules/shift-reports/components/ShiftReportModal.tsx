import { useState } from "react";
import { ChevronDown, ChevronUp, Package, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useShiftReport } from "@/modules/shift-reports/hooks/use-shift-reports";
import { formatPosCurrency } from "@/lib/currency";
import type { ShiftReportOrder } from "@/modules/shift-reports/domain/shift";

interface ShiftReportModalProps {
  shiftId: string;
  open: boolean;
  onClose: () => void;
}

function formatPaymentMethod(method: string, t: (key: string) => string): string {
  const normalized = method.trim().toLowerCase();
  if (normalized === "cash") return t("cashTotal");
  if (normalized === "card") return t("cardTotal");
  return method || t("paymentMethodOther");
}

function SalesList({ orders, t }: { orders: ShiftReportOrder[]; t: (key: string) => string }) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface-sunken p-6 text-center">
        <p className="text-sm text-text-muted">{t("emptySalesList")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface-sunken overflow-hidden">
      <div className="border-b border-border bg-surface-raised/40 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text">
          <Package className="h-4 w-4 text-primary" />
          {t("salesList")}
        </h3>
      </div>
      <div className="scrollbar-thin max-h-[18rem] overflow-y-auto">
        <div className="grid divide-y divide-border">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.orderId;
            return (
              <div key={order.orderId} className="bg-surface-sunken">
                <button
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.orderId)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface-raised/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-2xs font-bold text-primary-strong">
                      #{order.ticketNumber}
                    </span>
                    <div className="grid gap-0.5">
                      <span className="text-sm font-medium text-text">
                        {formatPaymentMethod(order.paymentMethod, t)}
                      </span>
                      <span className="text-2xs text-text-muted">
                        {order.createdAt.toLocaleString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                        {" · "}
                        {order.itemCount} {t("itemCount")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono-tabular text-sm font-semibold text-text">
                      {formatPosCurrency(order.total)}
                    </span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-card text-text-dim">
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border bg-surface-raised/30 px-4 py-3">
                    <div className="grid gap-2">
                      {order.items.map((item, index) => (
                        <div
                          key={`${order.orderId}-item-${index}`}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-text">
                            {item.productName}
                            <span className="ml-1 text-text-muted">× {item.quantity}</span>
                          </span>
                          <span className="font-mono-tabular text-text-muted">
                            {formatPosCurrency(item.unitPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ShiftReportModal({ shiftId, open, onClose }: ShiftReportModalProps) {
  const { t } = useTranslation("shift");
  const { data: report, isLoading } = useShiftReport(shiftId);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-[28rem] p-0 overflow-hidden max-h-[calc(100dvh-2rem)]">
        <DialogTitle className="sr-only">{t("reportTitle")}</DialogTitle>
        <DialogDescription className="sr-only">{t("reportTitle")}</DialogDescription>

        <div className="flex flex-col">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-border-strong px-5 py-3">
            <span className="font-display text-xl text-primary-strong">
              {t("reportTitle")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-card text-text-muted hover:bg-surface-sunken hover:text-text"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5">
            {isLoading ? (
              <div className="space-y-4">
                <div className="animate-pulse rounded-card border border-border bg-surface-sunken p-4">
                  <div className="h-6 w-1/3 rounded bg-surface-raised" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="animate-pulse rounded-card border border-border bg-surface-sunken p-3">
                    <div className="h-4 w-full rounded bg-surface-raised" />
                  </div>
                  <div className="animate-pulse rounded-card border border-border bg-surface-sunken p-3">
                    <div className="h-4 w-full rounded bg-surface-raised" />
                  </div>
                </div>
              </div>
            ) : report ? (
              <div className="grid gap-4">
                {/* Fechas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-card border border-border bg-surface-sunken p-3">
                    <p className="text-2xs font-medium uppercase tracking-wider text-text-muted">
                      {t("openedAt")}
                    </p>
                    <p className="mt-1 text-sm font-medium text-text">
                      {report.openedAt.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-card border border-border bg-surface-sunken p-3">
                    <p className="text-2xs font-medium uppercase tracking-wider text-text-muted">
                      {t("closedAt")}
                    </p>
                    <p className="mt-1 text-sm font-medium text-text">
                      {report.closedAt ? report.closedAt.toLocaleString() : "—"}
                    </p>
                  </div>
                </div>

                {/* Hero: Total Sales */}
                <div className="rounded-card border border-border/60 bg-surface-sunken p-5 text-center">
                  <p className="text-2xs font-medium uppercase tracking-wider text-text-muted">
                    {t("totalSales")}
                  </p>
                  <p className="font-mono-tabular mt-2 text-display font-bold leading-none tracking-tight text-primary-strong">
                    {formatPosCurrency(report.totalSales)}
                  </p>
                </div>

                {/* Métricas secundarias */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-card border border-border bg-surface-sunken p-3 text-center">
                    <p className="text-2xs font-medium uppercase tracking-wider text-text-muted">
                      {t("totalOrders")}
                    </p>
                    <p className="font-mono-tabular mt-1 text-xl font-bold text-text">
                      {report.totalOrders}
                    </p>
                  </div>
                  <div className="rounded-card border border-border bg-surface-sunken p-3 text-center">
                    <p className="text-2xs font-medium uppercase tracking-wider text-text-muted">
                      {t("totalItems")}
                    </p>
                    <p className="font-mono-tabular mt-1 text-xl font-bold text-text">
                      {report.totalItems}
                    </p>
                  </div>
                  <div className="rounded-card border border-border bg-surface-sunken p-3 text-center">
                    <p className="text-2xs font-medium uppercase tracking-wider text-text-muted">
                      {t("cashTotal")}
                    </p>
                    <p className="font-mono-tabular mt-1 text-lg font-semibold text-text">
                      {formatPosCurrency(report.cashTotal)}
                    </p>
                  </div>
                  <div className="rounded-card border border-border bg-surface-sunken p-3 text-center">
                    <p className="text-2xs font-medium uppercase tracking-wider text-text-muted">
                      {t("cardTotal")}
                    </p>
                    <p className="font-mono-tabular mt-1 text-lg font-semibold text-text">
                      {formatPosCurrency(report.cardTotal)}
                    </p>
                  </div>
                </div>

                {/* Listado de ventas */}
                <SalesList orders={report.orders} t={t} />
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
