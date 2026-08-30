import { useState } from "react";
import { ArrowDown, ArrowUp, Banknote, ChefHat, ChevronDown, ChevronUp, Edit3, LayoutGrid, Package, Printer, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { formatPosCurrency } from "@/lib/currency";
import { useFeatureFlagsStore } from "@/modules/feature-flags";
import { useSettingsStore } from "@/modules/settings";
import { sortShiftList } from "../list-order";
import type { ShiftReport, ShiftReportCategory, ShiftReportOrder, ShiftReportPayment } from "../shift";

interface ShiftReportViewProps {
  report: ShiftReport;
  onReprintOrder?: (order: ShiftReportOrder) => void;
  onEditOrder?: (order: ShiftReportOrder) => void;
  onVoidOrder?: (order: ShiftReportOrder) => void;
  onReprintCommand?: (order: ShiftReportOrder) => void;
}

function formatPaymentMethod(method: string, t: (key: string) => string): string {
  const normalized = method.trim().toLowerCase();
  if (normalized === "cash") return t("cashTotal");
  if (normalized === "card") return t("cardTotal");
  return method || t("paymentMethodOther");
}

function formatPaymentMethods(payments: ShiftReportPayment[], t: (key: string) => string): string {
  const labels = payments.map((payment) => formatPaymentMethod(payment.method, t));
  return [...new Set(labels)].join(" + ") || t("paymentMethodOther");
}

interface CategorySalesBlockProps {
  categories: ShiftReportCategory[];
  t: (key: string) => string;
}

function CategorySalesBlock({ categories, t }: CategorySalesBlockProps) {
  return (
    <div
      className="rounded-card border border-border bg-surface-sunken p-4"
      data-testid="shift-report-category-summary"
    >
      <h3 className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-text-muted">
        <LayoutGrid className="h-3.5 w-3.5 text-primary" />
        {t("salesByCategory")}
      </h3>
      <div className="mt-3 grid gap-2">
        {categories.map((category) => (
          <section
            key={category.categoryId ?? "uncategorized"}
            className="rounded-card border border-border bg-surface-raised p-3"
            data-testid={`shift-report-category-${category.categoryId ?? "uncategorized"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">
                  {category.categoryName ?? t("uncategorizedCategory")}
                </p>
                <p className="mt-0.5 text-2xs text-text-muted">
                  {category.totalItems} {t("itemCount")}
                </p>
              </div>
              <span className="font-mono-tabular shrink-0 text-sm font-semibold text-primary-strong">
                {formatPosCurrency(category.totalSales)}
              </span>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

interface SalesListProps {
  orders: ShiftReportOrder[];
  t: (key: string) => string;
  onReprintOrder?: (order: ShiftReportOrder) => void;
  onEditOrder?: (order: ShiftReportOrder) => void;
  onVoidOrder?: (order: ShiftReportOrder) => void;
  onReprintCommand?: (order: ShiftReportOrder) => void;
}

function SalesList({ orders, t, onReprintOrder, onEditOrder, onVoidOrder, onReprintCommand }: SalesListProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const hasActions = Boolean(onReprintOrder || onEditOrder || onVoidOrder || onReprintCommand);

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
        <h3 className="flex items-center gap-2 eyebrow">
          <Package className="h-3.5 w-3.5 text-primary" />
          {t("salesList")}
        </h3>
      </div>
      <div className="scrollbar-thin max-h-[18rem] overflow-y-auto">
        <div className="grid divide-y divide-border">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.orderId;
            const showActions = hasActions && !order.isVoided;
            return (
              <div
                key={order.orderId}
                data-testid={`shift-report-order-${order.orderId}`}
                className="bg-surface-sunken"
              >
                <div className="flex w-full items-center justify-between px-4 py-3">
                  <Button
                    variant="ghost"
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.orderId)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:bg-surface-raised/40"
                  >
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-2xs font-bold text-primary-strong">
                      #{order.ticketNumber}
                    </span>
                    <div className="grid gap-0.5">
                      <span className="flex items-center gap-2 text-sm font-medium text-text">
                        {formatPaymentMethods(order.payments, t)}
                        {order.isVoided && (
                          <span className="rounded-card border border-danger/40 bg-danger/10 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide text-danger">
                            {t("orderVoidedBadge")}
                          </span>
                        )}
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
                  </Button>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono-tabular text-sm font-semibold text-text">
                      {formatPosCurrency(order.total)}
                    </span>
                    {showActions && (
                      <div className="flex items-center gap-1">
                        {onReprintOrder && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onReprintOrder(order)}
                            className="h-7 w-7 rounded-card text-text-muted hover:bg-surface-sunken hover:text-text"
                            title={t("reprintOrder")}
                            aria-label={t("reprintOrder")}
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onEditOrder && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditOrder(order)}
                            className="h-7 w-7 rounded-card text-text-muted hover:bg-surface-sunken hover:text-text"
                            title={t("editOrder")}
                            aria-label={t("editOrder")}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onVoidOrder && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onVoidOrder(order)}
                            className="h-7 w-7 rounded-card text-text-muted hover:bg-danger/10 hover:text-danger"
                            title={t("voidOrder")}
                            aria-label={t("voidOrder")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onReprintCommand && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onReprintCommand(order)}
                            className="h-7 w-7 rounded-card text-text-muted hover:bg-surface-sunken hover:text-text"
                            title={t("reprintCommand")}
                            aria-label={t("reprintCommand")}
                          >
                            <ChefHat className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                    <span className="flex h-6 w-6 items-center justify-center rounded-card text-text-dim">
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border bg-surface-raised/30 px-4 py-3">
                    <div className="grid gap-2">
                      {order.payments.map((payment, index) => (
                        <div
                          key={`${order.orderId}-payment-${index}`}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-text-muted">
                            {formatPaymentMethod(payment.method, t)}
                          </span>
                          <span className="font-mono-tabular text-text">
                            {formatPosCurrency(payment.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-2 border-t border-border pt-3">
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

export function ShiftReportView({ report, onReprintOrder, onEditOrder, onVoidOrder, onReprintCommand }: ShiftReportViewProps) {
  const { t } = useTranslation("shift");
  const shiftListOrder = useSettingsStore((state) => state.shiftListOrder);
  const categoriesEnabled = useFeatureFlagsStore((state) => state.flags.categories_enabled ?? false);
  const orderedOrders = sortShiftList(report.orders, (order) => order.createdAt, shiftListOrder);

  return (
    <div className="grid gap-4">
      {/* Fechas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-card border border-border bg-surface-sunken p-3">
          <p className="eyebrow">
            {t("openedAt")}
          </p>
          <p className="mt-1 text-sm font-medium text-text">{report.openedAt.toLocaleString()}</p>
        </div>
        <div className="rounded-card border border-border bg-surface-sunken p-3">
          <p className="eyebrow">
            {t("closedAt")}
          </p>
          <p className="mt-1 text-sm font-medium text-text">
            {report.closedAt ? report.closedAt.toLocaleString() : "—"}
          </p>
        </div>
      </div>

      {/* Hero: Total Sales */}
      <div className="rounded-card border border-border/40 bg-surface-sunken p-6 text-center">
        <p className="eyebrow">
          {t("totalSales")}
        </p>
        <p className="font-mono-tabular mt-2 text-display font-bold leading-none tracking-tight text-primary-strong">
          {formatPosCurrency(report.totalSales)}
        </p>
        <p className="mt-1.5 text-xs text-text-dim">
          {report.openedAt.toLocaleString([], {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
          })}
          {" — "}
          {report.closedAt
            ? report.closedAt.toLocaleString([], {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
              })
            : "—"}
        </p>
      </div>

      {/* Métricas secundarias */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-card border border-border bg-surface-sunken p-4">
          <p className="eyebrow">
            {t("totalOrders")}
          </p>
          <p className="font-mono-tabular mt-1 text-lg font-semibold text-text">{report.totalOrders}</p>
        </div>
        <div className="rounded-card border border-border bg-surface-sunken p-4">
          <p className="eyebrow">
            {t("totalItems")}
          </p>
          <p className="font-mono-tabular mt-1 text-lg font-semibold text-text">{report.totalItems}</p>
        </div>
        <div className="rounded-card border border-border bg-surface-sunken p-4">
          <p className="eyebrow">
            {t("cashTotal")}
          </p>
          <p className="font-mono-tabular mt-1 text-lg font-semibold text-text">
            {formatPosCurrency(report.cashTotal)}
          </p>
        </div>
        <div className="rounded-card border border-border bg-surface-sunken p-4">
          <p className="eyebrow">
            {t("cardTotal")}
          </p>
          <p className="font-mono-tabular mt-1 text-lg font-semibold text-text">
            {formatPosCurrency(report.cardTotal)}
          </p>
        </div>
      </div>

      {categoriesEnabled && report.salesByCategory.length > 0 ? (
        <CategorySalesBlock categories={report.salesByCategory} t={t} />
      ) : null}

      {/* Resumen de efectivo */}
      <div className="rounded-card border border-border bg-surface-sunken p-4">
        <h3 className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-text-muted">
          <Banknote className="h-3.5 w-3.5 text-primary" />
          {t("cashSummary")}
        </h3>
        <div className="mt-3">
          <div className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-text-muted">{t("cashSummaryOpening")}</span>
            <span className="font-mono-tabular text-text">{formatPosCurrency(report.openingCash)}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-text-muted">{t("cashSummarySales")}</span>
            <span className="font-mono-tabular text-text">+{formatPosCurrency(report.cashTotal)}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-text-muted">{t("cashSummaryIncome")}</span>
            <span className="font-mono-tabular text-text">+{formatPosCurrency(report.cashMovementsIn)}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-text-muted">{t("cashSummaryExpense")}</span>
            <span className="font-mono-tabular text-text">-{formatPosCurrency(report.cashMovementsOut)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border-strong pt-2 mt-1 text-sm font-semibold">
            <span className="text-text">{t("cashSummaryExpected")}</span>
            <span className="font-mono-tabular text-text">{formatPosCurrency(report.expectedCash)}</span>
          </div>
          {report.countedCash !== null && (
            <div className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-text-muted">{t("cashSummaryCounted")}</span>
              <span className="font-mono-tabular text-text">{formatPosCurrency(report.countedCash)}</span>
            </div>
          )}
          {report.cashDifference !== null && (
            <div
              className={[
                "mt-2 flex items-center justify-between rounded-card px-2.5 py-2 text-sm font-semibold",
                report.cashDifference === 0
                  ? "bg-success/5"
                  : report.cashDifference > 0
                    ? "bg-warning/5"
                    : "bg-danger/5",
              ].join(" ")}
            >
              <span className="text-text">{t("cashSummaryDifference")}</span>
              <span
                className={`font-mono-tabular ${
                  report.cashDifference === 0
                    ? "text-success"
                    : report.cashDifference > 0
                      ? "text-warning"
                      : "text-danger"
                }`}
              >
                {report.cashDifference > 0 ? "+" : ""}
                {formatPosCurrency(report.cashDifference)}
              </span>
            </div>
          )}
        </div>

        {report.cashMovements.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <div className="grid gap-1.5">
              {report.cashMovements.map((movement) => (
                <div key={movement.id} className="flex items-center justify-between text-2xs">
                  <span className="flex items-center gap-1.5 text-text-muted">
                    {movement.type === "income" ? (
                      <ArrowDown className="h-3 w-3 text-success" />
                    ) : (
                      <ArrowUp className="h-3 w-3 text-danger" />
                    )}
                    {movement.reason}
                  </span>
                  <span
                    className={`font-mono-tabular ${movement.type === "income" ? "text-success" : "text-danger"}`}
                  >
                    {movement.type === "income" ? "+" : "-"}
                    {formatPosCurrency(movement.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Listado de ventas */}
      <SalesList
        orders={orderedOrders}
        t={t}
        onReprintOrder={onReprintOrder}
        onEditOrder={onEditOrder}
        onVoidOrder={onVoidOrder}
        onReprintCommand={onReprintCommand}
      />
    </div>
  );
}
