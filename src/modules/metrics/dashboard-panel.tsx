import { Banknote, Clock, CreditCard, Receipt, RefreshCw, TrendingUp, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { formatPosCurrency } from "@/lib/currency";

import { useTodayMetrics } from "./use-today-metrics";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
}

function MetricCard({ label, value, icon: Icon }: MetricCardProps) {
  return (
    <article className="rounded-card border border-border bg-surface-raised p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">{label}</p>
        <Icon className="h-4 w-4 text-text-dim" />
      </div>
      <p className="font-mono-tabular mt-3 text-xl font-semibold tracking-tight text-text">
        {value}
      </p>
    </article>
  );
}

function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl p-6 lg:p-8">
      <div className="h-7 w-32 animate-pulse rounded bg-surface-sunken" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-card border border-border bg-surface-sunken"
          />
        ))}
      </div>
    </div>
  );
}

export function DashboardPanel() {
  const { t } = useTranslation("admin");
  const { data, isError, isFetching, isLoading, refetch } = useTodayMetrics();

  if (isLoading) return <DashboardLoading />;

  if (isError || !data) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-sm rounded-card border border-border bg-surface-raised p-6 text-center shadow-card">
          <h2 className="text-base font-semibold text-text">{t("dashboard.error.title")}</h2>
          <p className="mt-2 text-sm text-text-muted">{t("dashboard.error.description")}</p>
          <Button className="mt-5" variant="outline" size="small" onClick={() => { void refetch(); }}>
            <RefreshCw className="h-3.5 w-3.5" />
            {t("dashboard.retry")}
          </Button>
        </div>
      </div>
    );
  }

  const activeShift = data.activeShift;

  return (
    <div className="mx-auto w-full max-w-6xl p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="eyebrow">{t("dashboard.eyebrow")}</p>
          <h1 className="mt-1 font-display text-2xl text-text">{t("dashboard.title")}</h1>
        </div>
        <Button
          variant="outline"
          size="small"
          onClick={() => { void refetch(); }}
          disabled={isFetching}
        >
          <RefreshCw className={isFetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          {t("dashboard.refresh")}
        </Button>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-3" aria-label={t("dashboard.summaryAriaLabel")}>
        <MetricCard
          label={t("dashboard.metrics.sales")}
          value={formatPosCurrency(data.sales)}
          icon={TrendingUp}
        />
        <MetricCard
          label={t("dashboard.metrics.orders")}
          value={data.totalOrders}
          icon={Receipt}
        />
        <MetricCard
          label={t("dashboard.metrics.averageTicket")}
          value={formatPosCurrency(data.averageTicket)}
          icon={CreditCard}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-border bg-surface-raised p-5 shadow-card">
          <header className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-text">{t("dashboard.payments.title")}</h2>
          </header>
          <dl className="mt-5 grid gap-3">
            <div className="flex items-center justify-between text-sm">
              <dt className="text-text-muted">{t("dashboard.payments.cash")}</dt>
              <dd className="font-mono-tabular font-medium text-text">
                {formatPosCurrency(data.paymentBreakdown.cash)}
              </dd>
            </div>
            <div className="flex items-center justify-between text-sm">
              <dt className="text-text-muted">{t("dashboard.payments.card")}</dt>
              <dd className="font-mono-tabular font-medium text-text">
                {formatPosCurrency(data.paymentBreakdown.card)}
              </dd>
            </div>
            {data.paymentBreakdown.other > 0 ? (
              <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                <dt className="text-text-muted">{t("dashboard.payments.other")}</dt>
                <dd className="font-mono-tabular font-medium text-text">
                  {formatPosCurrency(data.paymentBreakdown.other)}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="rounded-card border border-border bg-surface-raised p-5 shadow-card">
          <header className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-text">{t("dashboard.activeShift.title")}</h2>
          </header>
          {activeShift ? (
            <div className="mt-5">
              <p className="text-sm text-text-muted">
                {t("dashboard.activeShift.openedAt", {
                  time: activeShift.openedAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-card bg-surface-sunken p-3">
                  <p className="eyebrow">{t("dashboard.metrics.orders")}</p>
                  <p className="font-mono-tabular mt-1 text-lg font-semibold text-text">
                    {activeShift.totalOrders}
                  </p>
                </div>
                <div className="rounded-card bg-surface-sunken p-3">
                  <p className="eyebrow">{t("dashboard.metrics.sales")}</p>
                  <p className="font-mono-tabular mt-1 text-lg font-semibold text-text">
                    {formatPosCurrency(activeShift.totalSales)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-text-muted">{t("dashboard.activeShift.empty")}</p>
          )}
        </section>
      </div>
    </div>
  );
}
