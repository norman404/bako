import { useState } from "react";
import { ArrowDown, ArrowUp, Banknote, ChefHat, ChevronDown, ChevronUp, Edit3, LayoutGrid, Package, Printer, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { formatPosCurrency } from "@/lib/currency";
import { ORDER_CHANNEL } from "@/modules/order";
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
  if (normalized === "platform") return t("platformTotal");
  return method || t("paymentMethodOther");
}

function formatPaymentMethods(payments: ShiftReportPayment[], t: (key: string) => string): string {
  const collected = payments.filter((payment) => payment.amount > 0);
  if (payments.length > 0 && collected.length === 0) return "";
  const labels = collected.map((payment) => formatPaymentMethod(payment.method, t));
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
  const { i18n } = useTranslation("shift");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface-sunken p-6 text-center">
        <p className="text-sm text-text-muted">{t("emptySalesList")}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-card border border-border bg-surface-sunken">
      <div className="border-b border-border bg-surface-raised/40 px-4 py-3">
        <h3 className="flex items-center gap-2 eyebrow">
          <Package className="h-3.5 w-3.5 text-primary" />
          {t("salesList")}
        </h3>
      </div>
      <div className="scrollbar-thin max-h-96 overflow-y-auto">
        <div className="grid min-w-0 divide-y divide-border">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.orderId;
            const isDelivery = order.channel !== ORDER_CHANNEL.LOCAL;
            const showReceipt = Boolean(onReprintOrder && !order.isPending && !order.isVoided);
            const showEdit = Boolean(onEditOrder && !isDelivery && !order.isVoided);
            const showVoid = Boolean(onVoidOrder && order.canModify && !order.isVoided);
            const showCommand = Boolean(onReprintCommand && (order.canModify || !order.isPending) && !order.isVoided);
            const showActions = showReceipt || showEdit || showVoid || showCommand;
            const detailId = `shift-order-detail-${order.orderId}`;
            return (
              <div key={order.orderId} data-testid={`shift-report-order-${order.orderId}`} className="min-w-0 bg-surface-sunken">
                <Button
                  variant="ghost"
                  size="medium"
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.orderId)}
                  aria-expanded={isExpanded}
                  aria-controls={isExpanded ? detailId : undefined}
                  className="h-auto min-h-16 w-full min-w-0 flex-col items-stretch gap-2 whitespace-normal rounded-none px-4 py-3 text-left hover:bg-surface-raised/40"
                >
                  <span className="flex min-w-0 items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="font-mono-tabular shrink-0 rounded-sm border border-border px-2 py-1 text-xs font-semibold text-primary-strong">#{order.ticketNumber}</span>
                      {order.orderName ? <span className="truncate text-sm font-medium text-text">{order.orderName}</span> : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-mono-tabular whitespace-nowrap text-sm font-semibold text-text">{order.isPending ? "—" : formatPosCurrency(order.total)}</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-text-dim" /> : <ChevronDown className="h-4 w-4 text-text-dim" />}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-xs font-normal text-text-muted">
                    {isDelivery ? <span className="rounded-sm bg-primary/10 px-2 py-1 font-semibold text-primary-strong">{order.channel === ORDER_CHANNEL.DIDI ? "DiDi" : "Uber Eats"}</span> : null}
                    {order.isPending ? <span className="rounded-sm bg-warning/10 px-2 py-1 text-warning">{t("order:delivery.pending")}</span> : formatPaymentMethods(order.payments, t)}
                    {order.isVoided ? <span className="rounded-sm bg-danger/10 px-2 py-1 text-danger">{t("orderVoidedBadge")}</span> : null}
                  </span>
                  {order.deliveryReference ? <span className="font-mono-tabular break-all text-xs font-normal leading-5 text-text-muted">{order.deliveryReference}</span> : null}
                  <span className="text-xs font-normal leading-5 text-text-dim">
                    <time dateTime={order.createdAt.toISOString()}>
                      {order.createdAt.toLocaleString(i18n.language, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short", hour12: false })}
                    </time>
                    {" · "}{order.itemCount} {t("itemCount")}
                  </span>
                </Button>
                {showActions ? (
                  <div className="flex flex-wrap justify-end gap-1 border-t border-border/60 bg-surface-raised/20 px-3 py-1">
                    {showReceipt ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onReprintOrder?.(order)}
                        className="h-11 w-11 rounded-card"
                        title={t("reprintOrder")}
                        aria-label={t("reprintOrder")}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    ) : null}
                    {showEdit ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditOrder?.(order)}
                        className="h-11 w-11 rounded-card"
                        title={t("editOrder")}
                        aria-label={t("editOrder")}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    ) : null}
                    {showCommand ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onReprintCommand?.(order)}
                        className="h-11 w-11 rounded-card"
                        title={t("reprintCommand")}
                        aria-label={t("reprintCommand")}
                      >
                        <ChefHat className="h-4 w-4" />
                      </Button>
                    ) : null}
                    {showVoid ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onVoidOrder?.(order)}
                        className="h-11 w-11 rounded-card hover:bg-danger/10 hover:text-danger"
                        title={t("voidOrder")}
                        aria-label={t("voidOrder")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {isExpanded ? (
                  <div id={detailId} className="border-t border-border bg-surface-raised/30 px-4 py-3">
                    {order.orderName ? <p className="mb-3 break-words text-sm font-semibold text-text">{order.orderName}</p> : null}
                    <div className="grid gap-2">
                      {order.payments.filter((payment) => payment.amount > 0).map((payment, index) => (
                        <div key={`${order.orderId}-payment-${index}`} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-text-muted">{formatPaymentMethod(payment.method, t)}</span>
                          <span className="font-mono-tabular shrink-0 text-text">{formatPosCurrency(payment.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-2 border-t border-border pt-3">
                      {order.items.map((item, index) => (
                        <div key={`${order.orderId}-item-${index}`} className="flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 break-words text-text">{item.productName}<span className="ml-1 text-text-muted">× {item.quantity}</span></span>
                          {!isDelivery ? <span className="font-mono-tabular shrink-0 text-text-muted">{formatPosCurrency(item.unitPrice)}</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
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
    <div className="grid min-w-0 gap-4">
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

      <div className="rounded-card border border-border bg-surface-sunken p-4">
        <h3 className="eyebrow">{t("salesByChannel")}</h3>
        <dl className="mt-3 grid gap-2 text-sm">
          {[
            { label: t("localSales"), amount: report.localTotal, channel: ORDER_CHANNEL.LOCAL },
            { label: "Uber Eats", amount: report.uberTotal, channel: ORDER_CHANNEL.UBER },
            { label: "DiDi", amount: report.didiTotal, channel: ORDER_CHANNEL.DIDI },
          ].map(({ label, amount, channel }) => {
            const breakdown = report.deliveryByChannel.find((entry) => entry.channel === channel);
            return (
              <div key={label}>
                <div className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-mono-tabular">{formatPosCurrency(amount)}</dd></div>
                {breakdown && (breakdown.cash > 0 || breakdown.platform > 0) ? (
                  <div className="mt-1 grid gap-1 pl-3 text-xs text-text-muted">
                    {breakdown.cash > 0 ? <div className="flex justify-between gap-3"><dt>{t("cashTotal")}</dt><dd className="font-mono-tabular">{formatPosCurrency(breakdown.cash)}</dd></div> : null}
                    {breakdown.platform > 0 ? <div className="flex justify-between gap-3"><dt>{t("platformTotal")}</dt><dd className="font-mono-tabular">{formatPosCurrency(breakdown.platform)}</dd></div> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </dl>
      </div>
      {report.platformTotal > 0 ? (
        <div className="rounded-card border border-border bg-surface-sunken p-4">
          <p className="eyebrow">{t("platformTotal")}</p>
          <p className="font-mono-tabular mt-1 text-lg font-semibold">{formatPosCurrency(report.platformTotal)}</p>
          <p className="mt-2 text-xs text-text-muted">{t("platformHint")}</p>
        </div>
      ) : null}
      {report.pendingDeliveries > 0 ? <div className="rounded-card border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
        {t("pendingDeliveries", { count: report.pendingDeliveries })}
        <p className="mt-1 text-xs">{t("pendingDeliveriesHint")}</p>
      </div> : null}

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
