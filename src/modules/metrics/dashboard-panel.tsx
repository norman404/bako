import { BarChart3, Ban, Boxes, Clock, CreditCard, Receipt, RefreshCw, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPosCurrency } from "@/lib/currency";
import { useSettingsStore } from "@/modules/settings";

import type { SalesSeriesPoint } from "./metrics";
import { useSalesMetrics } from "./use-sales-metrics";

type ChartMetric = "sales" | "items";

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseInputDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function initialRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return { start: toInputDate(start), end: toInputDate(end) };
}

function MetricCard({ label, value, previous, current, icon: Icon }: { label: string; value: string | number; previous?: number; current?: number; icon: LucideIcon }) {
  const change = previous === undefined || current === undefined ? null : previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
  return (
    <article className="rounded-card border border-border bg-surface-raised p-4 shadow-card">
      <div className="flex items-center justify-between gap-3"><p className="eyebrow">{label}</p><Icon className="h-4 w-4 text-text-dim" /></div>
      <p className="font-mono-tabular mt-3 text-xl font-semibold tracking-tight text-text">{value}</p>
      {change !== null ? <p className={`mt-2 text-xs ${change >= 0 ? "text-success" : "text-danger"}`}>{change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}% <span className="text-text-dim">vs. periodo anterior</span></p> : null}
    </article>
  );
}

function SalesChart({ points, metric }: { points: SalesSeriesPoint[]; metric: ChartMetric }) {
  const { locale } = useSettingsStore();
  const values = points.map((point) => point[metric]);
  const maximum = Math.max(...values, 1);
  const width = 800;
  const height = 230;
  const padding = 24;
  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const coordinates = values.map((value, index) => ({
    x: padding + index * step,
    y: height - padding - (value / maximum) * (height - padding * 2),
  }));
  const line = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div>
      <svg className="h-60 w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img">
        {[0, 1, 2, 3].map((lineIndex) => {
          const y = padding + ((height - padding * 2) * lineIndex) / 3;
          return <line key={lineIndex} x1={padding} x2={width - padding} y1={y} y2={y} stroke="var(--color-border)" strokeWidth="1" />;
        })}
        {coordinates.length > 1 ? <polyline points={line} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" /> : null}
        {coordinates.map(({ x, y }, index) => <circle key={points[index].date} cx={x} cy={y} r="4" fill="var(--color-surface-raised)" stroke="var(--color-primary)" strokeWidth="3"><title>{values[index]}</title></circle>)}
      </svg>
      <div className="flex justify-between gap-2 text-2xs text-text-dim">
        {points.filter((_, index) => index % labelEvery === 0 || index === points.length - 1).map((point) => (
          <span key={point.date}>{parseInputDate(point.date).toLocaleDateString(locale, { day: "numeric", month: "short" })}</span>
        ))}
      </div>
    </div>
  );
}

export function DashboardPanel() {
  const { t } = useTranslation("admin");
  const [range, setRange] = useState(initialRange);
  const [metric, setMetric] = useState<ChartMetric>("sales");
  const dates = useMemo(() => {
    const start = parseInputDate(range.start);
    const end = parseInputDate(range.end);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }, [range]);
  const invalidRange = dates.start >= dates.end;
  const { data, isError, isFetching, isLoading, refetch } = useSalesMetrics(dates.start, dates.end);

  function selectPreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    setRange({ start: toInputDate(start), end: toInputDate(end) });
  }

  if (isLoading) return <div className="mx-auto w-full max-w-7xl p-6 lg:p-8"><div className="h-8 w-48 animate-pulse rounded bg-surface-sunken" /><div className="mt-6 h-80 animate-pulse rounded-card bg-surface-sunken" /></div>;

  return (
    <div className="scrollbar-thin mx-auto h-full w-full max-w-7xl overflow-y-auto p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div><p className="eyebrow">{t("dashboard.eyebrow")}</p><h1 className="mt-1 font-display text-2xl text-text">{t("dashboard.title")}</h1><p className="mt-2 text-sm text-text-muted">{t("dashboard.description")}</p></div>
        <Button variant="outline" size="small" onClick={() => { void refetch(); }} disabled={isFetching}><RefreshCw className={isFetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />{t("dashboard.refresh")}</Button>
      </header>

      <section className="mt-5 flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface-raised p-4">
        <div><label className="mb-1 block text-xs text-text-muted" htmlFor="metrics-start">{t("dashboard.filters.from")}</label><Input id="metrics-start" className="w-40" type="date" value={range.start} max={range.end} onChange={(event) => setRange((current) => ({ ...current, start: event.target.value }))} /></div>
        <div><label className="mb-1 block text-xs text-text-muted" htmlFor="metrics-end">{t("dashboard.filters.to")}</label><Input id="metrics-end" className="w-40" type="date" value={range.end} min={range.start} onChange={(event) => setRange((current) => ({ ...current, end: event.target.value }))} /></div>
        <div className="flex gap-2"><Button variant="outline" size="small" onClick={() => selectPreset(7)}>{t("dashboard.filters.days", { count: 7 })}</Button><Button variant="outline" size="small" onClick={() => selectPreset(30)}>{t("dashboard.filters.days", { count: 30 })}</Button><Button variant="outline" size="small" onClick={() => { const now = new Date(); setRange({ start: toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)), end: toInputDate(now) }); }}>{t("dashboard.filters.month")}</Button></div>
      </section>

      {invalidRange || isError || !data ? <div className="mt-6 rounded-card border border-danger/40 bg-surface-raised p-6 text-center"><h2 className="font-semibold text-text">{invalidRange ? t("dashboard.error.invalidRange") : t("dashboard.error.title")}</h2><p className="mt-2 text-sm text-text-muted">{t("dashboard.error.description")}</p></div> : <>
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("dashboard.summaryAriaLabel")}><MetricCard label={t("dashboard.metrics.sales")} value={formatPosCurrency(data.sales)} current={data.sales} previous={data.previous.sales} icon={TrendingUp} /><MetricCard label={t("dashboard.metrics.products")} value={data.totalItems} current={data.totalItems} previous={data.previous.totalItems} icon={Boxes} /><MetricCard label={t("dashboard.metrics.orders")} value={data.totalOrders} current={data.totalOrders} previous={data.previous.totalOrders} icon={Receipt} /><MetricCard label={t("dashboard.metrics.averageTicket")} value={formatPosCurrency(data.averageTicket)} current={data.averageTicket} previous={data.previous.averageTicket} icon={CreditCard} /></section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
          <section className="rounded-card border border-border bg-surface-raised p-5 shadow-card">
            <header className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold text-text">{t("dashboard.chart.title")}</h2></div><div className="flex rounded-card border border-border p-1"><button className={`rounded-sm px-3 py-1 text-xs ${metric === "sales" ? "bg-primary text-on-primary" : "text-text-muted"}`} onClick={() => setMetric("sales")}>{t("dashboard.metrics.sales")}</button><button className={`rounded-sm px-3 py-1 text-xs ${metric === "items" ? "bg-primary text-on-primary" : "text-text-muted"}`} onClick={() => setMetric("items")}>{t("dashboard.metrics.products")}</button></div></header>
            <div className="mt-5">{data.series.every((point) => point[metric] === 0) ? <div className="flex h-60 items-center justify-center text-sm text-text-muted">{t("dashboard.chart.empty")}</div> : <SalesChart points={data.series} metric={metric} />}</div>
          </section>

          <section className="rounded-card border border-border bg-surface-raised p-5 shadow-card">
            <h2 className="text-sm font-semibold text-text">{t("dashboard.categories.title")}</h2><p className="mt-1 text-xs text-text-muted">{t("dashboard.categories.description")}</p>
            <div className="scrollbar-thin mt-5 max-h-72 space-y-4 overflow-y-auto pr-2">{data.categories.length === 0 ? <p className="py-12 text-center text-sm text-text-muted">{t("dashboard.categories.empty")}</p> : data.categories.map((category) => { const value = metric === "sales" ? category.sales : category.items; const max = Math.max(...data.categories.map((item) => metric === "sales" ? item.sales : item.items), 1); return <div key={category.categoryId ?? "uncategorized"}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate text-text">{category.categoryName ?? t("dashboard.categories.uncategorized")}</span><span className="font-mono-tabular text-text-muted">{metric === "sales" ? formatPosCurrency(value) : value}</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-sunken"><div className="h-full rounded-full bg-primary" style={{ width: `${(value / max) * 100}%` }} /></div></div>; })}</div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <section className="rounded-card border border-border bg-surface-raised p-5 shadow-card">
            <h2 className="text-sm font-semibold text-text">{t("dashboard.products.title")}</h2>
            <div className="mt-4 space-y-3">{data.products.slice(0, 7).map((product, index) => <div key={product.productId} className="flex items-center gap-3"><span className="font-mono-tabular w-5 text-xs text-text-dim">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-3 text-xs"><span className="truncate text-text">{product.productName}</span><span className="font-mono-tabular text-text-muted">{metric === "sales" ? formatPosCurrency(product.sales) : product.items}</span></div><div className="mt-1 h-1.5 rounded-full bg-surface-sunken"><div className="h-full rounded-full bg-success" style={{ width: `${(product[metric] / Math.max(data.products[0]?.[metric] ?? 1, 1)) * 100}%` }} /></div></div></div>)}</div>
          </section>

          <section className="rounded-card border border-border bg-surface-raised p-5 shadow-card">
            <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold text-text">{t("dashboard.profit.title")}</h2></div>
            <dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between"><dt className="text-text-muted">{t("dashboard.profit.cost")}</dt><dd className="font-mono-tabular">{formatPosCurrency(data.cost)}</dd></div><div className="flex justify-between"><dt className="text-text-muted">{t("dashboard.profit.gross")}</dt><dd className="font-mono-tabular text-success">{formatPosCurrency(data.profit)}</dd></div><div className="flex justify-between border-t border-border pt-4"><dt className="text-text-muted">{t("dashboard.profit.margin")}</dt><dd className="font-mono-tabular">{(data.margin * 100).toFixed(1)}%</dd></div></dl>
            <p className="mt-5 text-xs text-text-dim">{t("dashboard.profit.note")}</p>
          </section>

          <section className="rounded-card border border-border bg-surface-raised p-5 shadow-card">
            <h2 className="text-sm font-semibold text-text">{t("dashboard.payments.title")}</h2>
            <div className="mt-5 space-y-4">{data.payments.map((payment) => <div key={payment.method}><div className="flex justify-between text-xs"><span className="capitalize text-text">{t(`dashboard.payments.${payment.method}`, { defaultValue: payment.method })}</span><span className="font-mono-tabular text-text-muted">{formatPosCurrency(payment.amount)} · {(payment.percentage * 100).toFixed(0)}%</span></div><div className="mt-1.5 h-2 rounded-full bg-surface-sunken"><div className="h-full rounded-full bg-primary" style={{ width: `${payment.percentage * 100}%` }} /></div></div>)}</div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-card border border-border bg-surface-raised p-5 shadow-card">
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold text-text">{t("dashboard.peaks.title")}</h2></div>
            <div className="mt-5 grid h-40 grid-cols-12 items-end gap-1">{data.hourlySales.map((amount, hour) => { const max = Math.max(...data.hourlySales, 1); return <div key={hour} className="flex h-full flex-col justify-end gap-1" title={`${hour}:00 · ${formatPosCurrency(amount)}`}><div className="min-h-0.5 rounded-t-sm bg-primary" style={{ height: `${Math.max((amount / max) * 100, 1)}%` }} />{hour % 3 === 0 ? <span className="text-center text-[9px] text-text-dim">{hour}</span> : <span className="h-3" />}</div>; })}</div>
            <div className="mt-5 grid grid-cols-7 gap-1">{data.weekdaySales.map((amount, day) => { const max = Math.max(...data.weekdaySales, 1); const labels = t("dashboard.peaks.days", { returnObjects: true }) as string[]; return <div key={day} className="text-center"><div className="rounded-card bg-primary p-2" style={{ opacity: 0.2 + (amount / max) * 0.8 }}><span className="font-mono-tabular text-xs text-on-primary">{amount ? formatPosCurrency(amount) : "—"}</span></div><span className="mt-1 block text-2xs text-text-dim">{labels[day]}</span></div>; })}</div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-card border border-border bg-surface-raised p-5 shadow-card"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">{t("dashboard.shifts.title")}</h2></div><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-text-muted">{t("dashboard.shifts.count")}</dt><dd>{data.shifts.count}</dd></div><div className="flex justify-between"><dt className="text-text-muted">{t("dashboard.shifts.averageSales")}</dt><dd className="font-mono-tabular">{formatPosCurrency(data.shifts.averageSales)}</dd></div><div className="flex justify-between"><dt className="text-text-muted">{t("dashboard.shifts.duration")}</dt><dd>{Math.round(data.shifts.averageDurationMinutes / 60)} h</dd></div><div className="flex justify-between"><dt className="text-text-muted">{t("dashboard.shifts.difference")}</dt><dd className="font-mono-tabular">{formatPosCurrency(data.shifts.cashDifference)}</dd></div></dl></article>
            <article className="rounded-card border border-border bg-surface-raised p-5 shadow-card"><div className="flex items-center gap-2"><Ban className="h-4 w-4 text-danger" /><h2 className="text-sm font-semibold">{t("dashboard.voids.title")}</h2></div><p className="font-mono-tabular mt-5 text-2xl font-semibold">{data.voids.count}</p><p className="mt-1 text-xs text-text-muted">{formatPosCurrency(data.voids.amount)} · {(data.voids.rate * 100).toFixed(1)}% {t("dashboard.voids.rate")}</p></article>
          </section>
        </div>
      </>}
    </div>
  );
}
