import { CreditCard, Package, Receipt, RefreshCw, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTurnoMetrics } from "@/modules/turno/hooks/use-turno-metrics";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPosCurrency } from "@/lib/currency";

function formatUpdatedAtLabel(updatedAt: Date | string): string {
  return new Date(updatedAt).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TurnoSummaryPanel() {
  const { t } = useTranslation('turno');
  const metricsQuery = useTurnoMetrics();
  const metrics = metricsQuery.data;

  const paymentTotal = metrics
    ? metrics.paymentBreakdown.cashSales + metrics.paymentBreakdown.cardSales
    : 0;
  const cashShare = paymentTotal === 0 || !metrics ? 0 : Math.round((metrics.paymentBreakdown.cashSales / paymentTotal) * 100);
  const cardShare = paymentTotal === 0 || !metrics ? 0 : Math.max(0, 100 - cashShare);
  const updatedAtLabel = metrics ? formatUpdatedAtLabel(metrics.updatedAt) : null;

  return (
    <div className="grid min-h-full grid-rows-[auto_auto_1fr] gap-3">
      <header className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">{t('panel.title')}</h2>

        <Button
          variant="secondary"
          size="small"
          onClick={() => {
            void metricsQuery.refetch();
          }}
          disabled={metricsQuery.isFetching}
        >
          <RefreshCw className={["h-3.5 w-3.5 text-ink-dim", metricsQuery.isFetching ? "animate-spin" : ""].join(" ")} />
          {t('panel.refreshButton')}
        </Button>
      </header>

      {metricsQuery.isError ? (
        <div className="rounded-card border border-danger/30 bg-danger/8 px-3 py-3 text-[12px] text-danger">
          {metricsQuery.error instanceof Error
            ? metricsQuery.error.message
            : t('panel.error')}
        </div>
      ) : null}

      {metricsQuery.isLoading ? (
        <div className="grid gap-2.5 xl:grid-cols-[1.05fr_0.95fr]">
          {/* Resumen skeleton */}
          <div className="rounded-card border border-hairline bg-surface-low px-3 py-3">
            <div className="mb-2.5 flex items-center justify-between border-b border-hairline pb-2">
              <div className="h-4 w-20 animate-pulse rounded-card bg-obsidian-elevated" />
              <div className="h-3 w-24 animate-pulse rounded-card bg-obsidian-elevated" />
            </div>
            <div className="grid gap-2 pt-1">
              <div className="h-8 w-32 animate-pulse rounded-card bg-obsidian-elevated" />
              <div className="h-6 w-24 animate-pulse rounded-card bg-obsidian-elevated" />
              <div className="h-5 w-16 animate-pulse rounded-card bg-obsidian-elevated" />
              <div className="h-5 w-16 animate-pulse rounded-card bg-obsidian-elevated" />
            </div>
          </div>
          <div className="grid gap-2.5">
            {/* Medios de pago skeleton */}
            <div className="rounded-card border border-hairline bg-surface-low px-3 py-3">
              <div className="mb-2.5 flex items-center justify-between border-b border-hairline pb-2">
                <div className="h-4 w-28 animate-pulse rounded-card bg-obsidian-elevated" />
              </div>
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-3 w-16 animate-pulse rounded-card bg-obsidian-elevated" />
                    <div className="h-3 w-20 animate-pulse rounded-card bg-obsidian-elevated" />
                  </div>
                  <div className="h-1.5 rounded-full bg-obsidian-elevated animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-3 w-14 animate-pulse rounded-card bg-obsidian-elevated" />
                    <div className="h-3 w-20 animate-pulse rounded-card bg-obsidian-elevated" />
                  </div>
                  <div className="h-1.5 rounded-full bg-obsidian-elevated animate-pulse" />
                </div>
              </div>
            </div>
            {/* Top productos skeleton */}
            <div className="rounded-card border border-hairline bg-surface-low px-3 py-3">
              <div className="mb-2.5 flex items-center justify-between border-b border-hairline pb-2">
                <div className="h-4 w-24 animate-pulse rounded-card bg-obsidian-elevated" />
              </div>
              <div className="space-y-2 pt-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-4 flex-1 animate-pulse rounded-card bg-obsidian-elevated" />
                    <div className="h-4 w-10 animate-pulse rounded-card bg-obsidian-elevated" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!metricsQuery.isLoading && metrics ? (
        <div className="grid gap-2.5 xl:grid-cols-[1fr_0.92fr]">
          <section className="rounded-card border border-hairline bg-surface-low px-3 py-3">
            <div className="mb-2.5 flex items-center justify-between gap-3 border-b border-hairline pb-2">
              <h3 className="text-[15px] font-medium text-ink">{t('summary.title')}</h3>
              <div className="flex items-center gap-2 text-[11px] text-ink-dim">
                <span>{t('summary.ticketsLabel', { count: metrics.tickets })}</span>
                {updatedAtLabel ? <span>{updatedAtLabel}</span> : null}
              </div>
            </div>

            <div className="grid gap-1.5">
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-card px-2 py-1.5">
                <span className="text-[12px] text-ink-muted">{t('summary.sales')}</span>
                <span className="font-display text-[26px] leading-none tracking-[-0.03em] text-champagne">
                  {formatPosCurrency(metrics.sales)}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-card px-2 py-1.5">
                <span className="text-[12px] text-ink-muted">{t('summary.average')}</span>
                <span className="text-[20px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {formatPosCurrency(metrics.averageTicket)}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-card px-2 py-1.5">
                <span className="text-[12px] text-ink-muted">{t('summary.tickets')}</span>
                <Receipt className="h-4 w-4 text-ink-dim" />
                <span className="text-[18px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {String(metrics.tickets).padStart(2, "0")}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-card px-2 py-1.5">
                <span className="text-[12px] text-ink-muted">{t('summary.items')}</span>
                <Package className="h-4 w-4 text-ink-dim" />
                <span className="text-[18px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {String(metrics.itemsSold).padStart(2, "0")}
                </span>
              </div>
            </div>
          </section>

          <div className="grid gap-2.5">
            <section className="rounded-card border border-hairline bg-surface-low px-3 py-3">
              <div className="mb-2.5 flex items-center justify-between gap-3 border-b border-hairline pb-2">
                <h3 className="text-[15px] font-medium text-ink">{t('paymentMethods.title')}</h3>
                <CreditCard className="h-4 w-4 text-ink-dim" />
              </div>

              <div className="space-y-2.5">
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-[12px] text-ink-muted">
                    <span>{t('paymentMethods.cash')}</span>
                    <span className="font-mono-tabular text-ink">
                      {formatPosCurrency(metrics.paymentBreakdown.cashSales)} · {cashShare}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-obsidian">
                    <div className="h-full rounded-full bg-champagne transition-[width] duration-500 ease-out" style={{ width: `${cashShare}%` }} />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-[12px] text-ink-muted">
                    <span>{t('paymentMethods.card')}</span>
                    <span className="font-mono-tabular text-ink">
                      {formatPosCurrency(metrics.paymentBreakdown.cardSales)} · {cardShare}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-obsidian">
                    <div className="h-full rounded-full bg-ink transition-[width] duration-500 ease-out" style={{ width: `${cardShare}%` }} />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-card border border-hairline bg-surface-low px-3 py-3">
              <div className="mb-2.5 flex items-center justify-between gap-3 border-b border-hairline pb-2">
                <h3 className="text-[15px] font-medium text-ink">{t('topProducts.title')}</h3>
                <Wallet className="h-4 w-4 text-ink-dim" />
              </div>

              <div className="space-y-1">
                {metrics.topProducts.length > 0 ? (
                  metrics.topProducts.slice(0, 5).map((product, index) => (
                    <article
                      key={product.productId}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-card px-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-ink-dim">
                          #{String(index + 1).padStart(2, "0")}
                        </p>
                        <p className="mt-1 truncate text-[12px] font-medium text-ink">{product.productName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono-tabular text-[10px] text-champagne">{product.quantitySold} {t('topProducts.unitSuffix')}</p>
                        <p className="mt-1 text-[10px] text-ink-dim">{formatPosCurrency(product.sales)}</p>
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyState>{t('topProducts.empty')}</EmptyState>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { TurnoSummaryPanel };
