import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Banknote, ChefHat, ChevronDown, ChevronUp, Edit3, LayoutGrid, Package, Printer, Trash2, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { formatPosCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { ORDER_CHANNEL, type OrderChannel } from "@/modules/order";
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

function formatPaymentMethod(method: string, t: (key: string) => string, short = false): string {
  const normalized = method.trim().toLowerCase();
  if (normalized === "cash") return t("cashTotal");
  if (normalized === "card") return t("cardTotal");
  if (normalized === "platform") return short ? t("appPayment") : t("platformTotal");
  return method || t("paymentMethodOther");
}

function paymentLabels(payments: ShiftReportPayment[], t: (key: string) => string): string[] {
  const collected = payments.filter((payment) => payment.amount > 0);
  if (payments.length > 0 && collected.length === 0) return [];
  const labels = collected.map((payment) => formatPaymentMethod(payment.method, t, true));
  return [...new Set(labels)];
}

type PillTone = "neutral" | "channel" | "warning" | "danger";

const PILL_TONES: Record<PillTone, string> = {
  neutral: "border-transparent bg-surface-raised text-text-muted",
  channel: "border-primary/20 bg-primary/10 text-primary-strong",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
};

function Pill({ tone = "neutral", className, children }: { tone?: PillTone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-sm border px-1.5 py-0.5 text-2xs font-semibold", PILL_TONES[tone], className)}>
      {children}
    </span>
  );
}

interface ActionCellProps {
  icon: LucideIcon;
  label: string;
  ariaLabel?: string;
  danger?: boolean;
  onClick: () => void;
}

function ActionCell({ icon: Icon, label, ariaLabel, danger = false, onClick }: ActionCellProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={cn(
        "h-14 flex-col items-center justify-center gap-1.5 px-1 text-2xs font-semibold",
        danger && "text-danger hover:bg-danger/10 hover:text-danger",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="leading-none">{label}</span>
    </Button>
  );
}

interface CategorySalesBlockProps {
  categories: ShiftReportCategory[];
  t: (key: string) => string;
}

function CategorySalesBlock({ categories, t }: CategorySalesBlockProps) {
  const ordered = [...categories].sort((a, b) => b.totalSales - a.totalSales);
  const totalItems = categories.reduce((sum, category) => sum + category.totalItems, 0);
  const totalSales = categories.reduce((sum, category) => sum + category.totalSales, 0);

  return (
    <div
      className="rounded-card border border-border bg-surface-sunken p-4"
      data-testid="shift-report-category-summary"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 eyebrow">
          <LayoutGrid className="h-3.5 w-3.5 text-primary" />
          {t("salesByCategory")}
        </h3>
        <span className="font-mono-tabular shrink-0 text-2xs font-semibold text-text-dim">
          {totalItems} {t("itemCount")}
        </span>
      </div>
      <div className="mt-4 grid gap-3.5">
        {ordered.map((category) => {
          const share = totalSales > 0 ? (category.totalSales / totalSales) * 100 : 0;
          return (
            <section
              key={category.categoryId ?? "uncategorized"}
              className="grid gap-1.5"
              data-testid={`shift-report-category-${category.categoryId ?? "uncategorized"}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-medium text-text">
                  {category.categoryName ?? t("uncategorizedCategory")}
                </p>
                <span className="font-mono-tabular shrink-0 text-sm font-semibold text-primary-strong">
                  {formatPosCurrency(category.totalSales)}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-sm bg-surface-raised">
                  <div
                    className="h-full rounded-sm bg-primary/70"
                    style={{ width: `${Math.max(share, 2)}%` }}
                  />
                </div>
                <span className="font-mono-tabular shrink-0 text-2xs text-text-muted">
                  {category.totalItems} {t("itemCount")} · {Math.round(share)}%
                </span>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}


interface SalesListProps {
  orders: ShiftReportOrder[];
  onReprintOrder?: (order: ShiftReportOrder) => void;
  onEditOrder?: (order: ShiftReportOrder) => void;
  onVoidOrder?: (order: ShiftReportOrder) => void;
  onReprintCommand?: (order: ShiftReportOrder) => void;
}

type SalesFilter = "all" | "pending" | "voided" | OrderChannel;

function SalesList({ orders, onReprintOrder, onEditOrder, onVoidOrder, onReprintCommand }: SalesListProps) {
  const { t, i18n } = useTranslation("shift");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<SalesFilter>("all");

  if (orders.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface-sunken p-6 text-center">
        <p className="text-sm text-text-muted">{t("emptySalesList")}</p>
      </div>
    );
  }

  const countBy = (predicate: (order: ShiftReportOrder) => boolean) => orders.filter(predicate).length;
  const filters: { value: SalesFilter; label: string; count: number }[] = [
    { value: "all", label: t("filterAll"), count: orders.length },
    { value: ORDER_CHANNEL.LOCAL, label: t("localSales"), count: countBy((order) => order.channel === ORDER_CHANNEL.LOCAL) },
    { value: ORDER_CHANNEL.UBER, label: "Uber Eats", count: countBy((order) => order.channel === ORDER_CHANNEL.UBER) },
    { value: ORDER_CHANNEL.DIDI, label: "DiDi", count: countBy((order) => order.channel === ORDER_CHANNEL.DIDI) },
    { value: "pending", label: t("filterPending"), count: countBy((order) => order.isPending) },
    { value: "voided", label: t("filterVoided"), count: countBy((order) => order.isVoided) },
  ];

  const visibleOrders = orders.filter((order) => {
    if (filter === "all") return true;
    if (filter === "pending") return order.isPending;
    if (filter === "voided") return order.isVoided;
    return order.channel === filter;
  });

  const confirmedOrders = orders.filter((order) => !order.isPending && !order.isVoided);
  const confirmedTotal = confirmedOrders.reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="min-w-0 overflow-hidden rounded-card border border-border bg-surface-sunken">
      <div className="border-b border-border bg-surface-raised/40 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 eyebrow">
            <Package className="h-3.5 w-3.5 text-primary" />
            {t("salesList")}
          </h3>
          <span className="font-mono-tabular shrink-0 text-2xs font-semibold text-text-dim">
            {t("salesCount", { count: orders.length })}
          </span>
        </div>
        {orders.length > 1 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label={t("salesList")}>
            {filters.map(({ value, label, count }) => {
              const isActive = filter === value;
              return (
                <Button
                  key={value}
                  variant="ghost"
                  onClick={() => setFilter(value)}
                  aria-pressed={isActive}
                  className={cn(
                    "h-7 gap-1 rounded-card border px-2.5 text-2xs font-semibold",
                    isActive
                      ? "segmented-option-active"
                      : "segmented-option-inactive border-transparent text-text-muted hover:border-border-strong hover:text-text",
                  )}
                >
                  {label}
                  <span className="font-mono-tabular opacity-70">{count}</span>
                </Button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="grid min-w-0 divide-y divide-border">
        {visibleOrders.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-text-muted">{t("emptyFilteredSales")}</p>
            <Button
              variant="ghost"
              size="small"
              onClick={() => setFilter("all")}
              className="mt-2 rounded-card text-primary-strong hover:bg-primary/10 hover:text-primary-strong"
            >
              {t("filterAll")}
            </Button>
          </div>
        ) : (
          visibleOrders.map((order) => {
            const isExpanded = expandedOrderId === order.orderId;
            const isDelivery = order.channel !== ORDER_CHANNEL.LOCAL;
            const showReceipt = Boolean(onReprintOrder && !order.isPending && !order.isVoided);
            const showEdit = Boolean(onEditOrder && !isDelivery && !order.isVoided);
            const showVoid = Boolean(onVoidOrder && order.canModify && !order.isVoided);
            const showCommand = Boolean(onReprintCommand && (order.canModify || !order.isPending) && !order.isVoided);
            const showActions = showReceipt || showEdit || showVoid || showCommand;
            const detailId = `shift-order-detail-${order.orderId}`;
            const labels = paymentLabels(order.payments, t);
            return (
              <div
                key={order.orderId}
                data-testid={`shift-report-order-${order.orderId}`}
                className={cn("min-w-0 border-l-2 bg-surface-sunken", isExpanded ? "border-l-primary" : "border-l-transparent")}
              >
                <Button
                  variant="ghost"
                  size="medium"
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.orderId)}
                  aria-expanded={isExpanded}
                  aria-controls={isExpanded ? detailId : undefined}
                  className={cn(
                    "grid h-auto min-h-12 w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center justify-normal gap-x-3 gap-y-1 whitespace-normal rounded-none px-3.5 py-2.5 text-left font-normal",
                    isExpanded ? "bg-surface-raised/40 hover:bg-surface-raised/40" : "hover:bg-surface-raised/30",
                    order.isVoided && "opacity-60",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="font-mono-tabular shrink-0 rounded-sm border border-border px-2 py-0.5 text-xs font-semibold text-primary-strong">
                      #{order.ticketNumber}
                    </span>
                    {order.orderName ? (
                      <span className={cn("truncate text-sm font-medium text-text", order.isVoided && "line-through")}>
                        {order.orderName}
                      </span>
                    ) : null}
                    {isDelivery ? (
                      <Pill tone="channel" className="shrink-0">
                        {order.channel === ORDER_CHANNEL.DIDI ? "DiDi" : "Uber Eats"}
                      </Pill>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={cn("font-mono-tabular whitespace-nowrap text-sm font-semibold", order.isVoided ? "text-text-muted line-through" : "text-text")}>
                      {order.isPending ? "—" : formatPosCurrency(order.total)}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-text-dim" /> : <ChevronDown className="h-4 w-4 text-text-dim" />}
                  </span>
                  <span className="col-span-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-normal text-text-muted">
                    <span className="text-text-dim">
                      <time dateTime={order.createdAt.toISOString()}>
                        {order.createdAt.toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit", hour12: false })}
                      </time>
                    </span>
                    <span className="text-text-dim">·</span>
                    <span>
                      {order.itemCount} {t("itemCount")}
                    </span>
                    {labels.map((label) => (
                      <Pill key={label}>{label}</Pill>
                    ))}
                    {order.isPending ? <Pill tone="warning">{t("order:delivery.pending")}</Pill> : null}
                    {order.isVoided ? <Pill tone="danger">{t("orderVoidedBadge")}</Pill> : null}
                  </span>
                </Button>

                {isExpanded ? (
                  <div id={detailId} className="border-t border-border bg-surface-raised/30 px-3.5 py-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-text-dim">
                      <time dateTime={order.createdAt.toISOString()}>
                        {order.createdAt.toLocaleString(i18n.language, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
                      </time>
                      {order.deliveryReference ? (
                        <>
                          <span>·</span>
                          <span className="font-mono-tabular break-all">{order.deliveryReference}</span>
                        </>
                      ) : null}
                    </div>
                    <div className="mt-3 grid gap-2">
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
                          <span className="min-w-0 break-words text-text">
                            {item.productName}
                            <span className="ml-1 text-text-muted">× {item.quantity}</span>
                          </span>
                          {!isDelivery ? <span className="font-mono-tabular shrink-0 text-text-muted">{formatPosCurrency(item.unitPrice)}</span> : null}
                        </div>
                      ))}
                    </div>
                    {showActions ? (
                      <div
                        role="group"
                        aria-label={t("orderActions")}
                        className="mt-3 grid auto-cols-fr grid-flow-col divide-x divide-border overflow-hidden rounded-card border border-border bg-surface-sunken/60"
                      >
                        {showReceipt ? (
                          <ActionCell
                            icon={Printer}
                            label={t("reprintOrder")}
                            onClick={() => onReprintOrder?.(order)}
                          />
                        ) : null}
                        {showEdit ? (
                          <ActionCell
                            icon={Edit3}
                            label={t("editOrder")}
                            onClick={() => onEditOrder?.(order)}
                          />
                        ) : null}
                        {showCommand ? (
                          <ActionCell
                            icon={ChefHat}
                            label={t("reprintCommandShort")}
                            ariaLabel={t("reprintCommand")}
                            onClick={() => onReprintCommand?.(order)}
                          />
                        ) : null}
                        {showVoid ? (
                          <ActionCell
                            icon={Trash2}
                            label={t("voidOrderShort")}
                            ariaLabel={t("voidOrder")}
                            danger
                            onClick={() => onVoidOrder?.(order)}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-raised/40 px-4 py-2.5">
        <span className="text-xs text-text-muted">{t("confirmedSalesSummary", { count: confirmedOrders.length })}</span>
        <span className="font-mono-tabular shrink-0 text-sm font-semibold text-text">{formatPosCurrency(confirmedTotal)}</span>
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
        onReprintOrder={onReprintOrder}
        onEditOrder={onEditOrder}
        onVoidOrder={onVoidOrder}
        onReprintCommand={onReprintCommand}
      />
    </div>
  );
}
