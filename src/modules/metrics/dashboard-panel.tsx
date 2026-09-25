import { BarChart3, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatPosCurrency } from "@/lib/currency";
import { useSettingsStore } from "@/modules/settings";

import type { SalesSeriesPoint } from "./metrics";
import { useSalesMetrics } from "./use-sales-metrics";

type Period = "day" | "week" | "month" | "custom";
type Granularity = "day" | "hour";

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

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function periodRange(period: Exclude<Period, "custom">): { start: Date; end: Date } {
  const today = startOfToday();
  const end = new Date(today);
  end.setDate(end.getDate() + 1);
  const start = new Date(today);
  if (period === "week") start.setDate(start.getDate() - 6);
  else if (period === "month") start.setDate(1);
  return { start, end };
}

function initialCustomRange(): { start: string; end: string } {
  const { start } = periodRange("week");
  return { start: toInputDate(start), end: toInputDate(startOfToday()) };
}

function HourlySalesChart({ hourlySales }: { hourlySales: number[] }) {
  const maximum = Math.max(...hourlySales, 1);
  return (
    <div>
      <div className="grid h-56 grid-cols-[repeat(24,minmax(0,1fr))] items-end gap-1">
        {hourlySales.map((amount, hour) => (
          <div key={hour} className="flex h-full flex-col justify-end" title={`${hour}:00 · ${formatPosCurrency(amount)}`}>
            <div className="rounded-t-sm bg-primary" style={{ height: `${Math.max((amount / maximum) * 100, 1)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1 text-2xs text-text-dim">
        {hourlySales.map((_, hour) => <span key={hour} className="text-center">{hour % 3 === 0 ? hour : ""}</span>)}
      </div>
    </div>
  );
}

function DailySalesChart({ points }: { points: SalesSeriesPoint[] }) {
  const { locale } = useSettingsStore();
  const values = points.map((point) => point.sales);
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
        {coordinates.map(({ x, y }, index) => <circle key={points[index].date} cx={x} cy={y} r="4" fill="var(--color-surface-raised)" stroke="var(--color-primary)" strokeWidth="3"><title>{formatPosCurrency(values[index])}</title></circle>)}
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
  const [period, setPeriod] = useState<Period>("week");
  const [customRange, setCustomRange] = useState(initialCustomRange);
  const [granularity, setGranularity] = useState<Granularity>("day");

  const dates = (() => {
    if (period !== "custom") return periodRange(period);
    const start = parseInputDate(customRange.start);
    const end = parseInputDate(customRange.end);
    end.setDate(end.getDate() + 1);
    return { start, end };
  })();
  const invalidRange = Number.isNaN(dates.start.getTime()) || Number.isNaN(dates.end.getTime()) || dates.start >= dates.end;
  const spanDays = invalidRange ? 0 : Math.round((dates.end.getTime() - dates.start.getTime()) / 86_400_000);
  const singleDay = spanDays <= 1;
  const showHourly = singleDay || granularity === "hour";
  const { data, isError, isFetching, isLoading, refetch } = useSalesMetrics(dates.start, dates.end, !invalidRange);

  const periodOptions = [
    { value: "day", label: t("dashboard.period.day") },
    { value: "week", label: t("dashboard.period.week") },
    { value: "month", label: t("dashboard.period.month") },
    { value: "custom", label: t("dashboard.period.custom") },
  ];
  const granularityOptions = [
    { value: "day", label: t("dashboard.chart.byDay") },
    { value: "hour", label: t("dashboard.chart.byHour") },
  ];

  if (isLoading) return <div className="mx-auto w-full max-w-5xl p-6 lg:p-8"><div className="h-8 w-48 animate-pulse rounded bg-surface-sunken" /><div className="mt-6 h-80 animate-pulse rounded-card bg-surface-sunken" /></div>;

  return (
    <div className="scrollbar-thin mx-auto h-full w-full max-w-5xl overflow-y-auto p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl text-text">{t("dashboard.title")}</h1>
        <Button variant="outline" size="small" onClick={() => { void refetch(); }} disabled={isFetching}>
          <RefreshCw className={isFetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          {t("dashboard.refresh")}
        </Button>
      </header>

      <section className="mt-5">
        <SegmentedControl compact options={periodOptions} activeValue={period} onSelect={(value) => setPeriod(value as Period)} ariaLabel={t("dashboard.period.ariaLabel")} className="w-full max-w-xl" />
        {period === "custom" ? (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-text-muted" htmlFor="metrics-start">{t("dashboard.period.from")}</label>
              <Input id="metrics-start" className="w-40" type="date" value={customRange.start} max={customRange.end} onChange={(event) => setCustomRange((current) => ({ ...current, start: event.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted" htmlFor="metrics-end">{t("dashboard.period.to")}</label>
              <Input id="metrics-end" className="w-40" type="date" value={customRange.end} min={customRange.start} onChange={(event) => setCustomRange((current) => ({ ...current, end: event.target.value }))} />
            </div>
          </div>
        ) : null}
      </section>

      {invalidRange || isError || !data ? (
        <div className="mt-6 rounded-card border border-danger/40 bg-surface-raised p-6 text-center">
          <h2 className="font-semibold text-text">{invalidRange ? t("dashboard.error.invalidRange") : t("dashboard.error.title")}</h2>
          <p className="mt-2 text-sm text-text-muted">{t("dashboard.error.description")}</p>
        </div>
      ) : (
        <>
          <section className="mt-6 rounded-card border border-border bg-surface-raised p-6 shadow-card">
            <p className="eyebrow">{t("dashboard.sales")}</p>
            <p className="font-mono-tabular mt-2 text-4xl font-semibold tracking-tight text-text">{formatPosCurrency(data.sales)}</p>
          </section>

          <section className="mt-6 rounded-card border border-border bg-surface-raised p-5 shadow-card">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-text">{t("dashboard.chart.title")}</h2>
              </div>
              {singleDay ? null : (
                <SegmentedControl compact options={granularityOptions} activeValue={granularity} onSelect={(value) => setGranularity(value as Granularity)} ariaLabel={t("dashboard.chart.granularityAriaLabel")} className="w-60" />
              )}
            </header>
            <div className="mt-5">
              {data.sales === 0 ? (
                <div className="flex h-56 items-center justify-center text-sm text-text-muted">{t("dashboard.chart.empty")}</div>
              ) : showHourly ? (
                <HourlySalesChart hourlySales={data.hourlySales} />
              ) : (
                <DailySalesChart points={data.series} />
              )}
            </div>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-card border border-border bg-surface-raised p-5 shadow-card">
              <h2 className="text-sm font-semibold text-text">{t("dashboard.products.title")}</h2>
              {data.products.length === 0 ? (
                <p className="py-12 text-center text-sm text-text-muted">{t("dashboard.products.empty")}</p>
              ) : (
                <div className="mt-5 space-y-4">
                  {data.products.slice(0, 5).map((product, index) => (
                    <div key={product.productId} className="flex items-center gap-3">
                      <span className="font-mono-tabular w-5 text-xs text-text-dim">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-3 text-xs">
                          <span className="truncate text-text">{product.productName}</span>
                          <span className="font-mono-tabular shrink-0 text-text-muted">{formatPosCurrency(product.sales)}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-surface-sunken">
                            <div className="h-full rounded-full bg-success" style={{ width: `${(product.sales / Math.max(data.products[0]?.sales ?? 1, 1)) * 100}%` }} />
                          </div>
                          <span className="text-2xs text-text-dim">{t("dashboard.products.units", { count: product.items })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-card border border-border bg-surface-raised p-5 shadow-card">
              <h2 className="text-sm font-semibold text-text">{t("dashboard.payments.title")}</h2>
              {data.payments.length === 0 ? (
                <p className="py-12 text-center text-sm text-text-muted">{t("dashboard.payments.empty")}</p>
              ) : (
                <div className="mt-5 space-y-4">
                  {data.payments.map((payment) => (
                    <div key={payment.method}>
                      <div className="flex justify-between text-xs">
                        <span className="capitalize text-text">{t(`dashboard.payments.${payment.method}`, { defaultValue: payment.method })}</span>
                        <span className="font-mono-tabular text-text-muted">{formatPosCurrency(payment.amount)} · {(payment.percentage * 100).toFixed(0)}%</span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-surface-sunken">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${payment.percentage * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
