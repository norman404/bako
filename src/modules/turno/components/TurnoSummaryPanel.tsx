import { CreditCard, Package, Receipt, RefreshCw, Wallet } from "lucide-react";

import { useTurnoMetrics } from "@/modules/turno/hooks/use-turno-metrics";
import { formatPosCurrency } from "@/lib/currency";

function formatUpdatedAtLabel(updatedAt: Date | string): string {
  return new Date(updatedAt).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TurnoSummaryPanel() {
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
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Turno</h2>

        <button
          type="button"
          onClick={() => {
            void metricsQuery.refetch();
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-card border border-hairline bg-obsidian px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink transition-colors duration-150 hover:border-hairline-strong hover:text-champagne disabled:cursor-not-allowed disabled:opacity-40"
          disabled={metricsQuery.isFetching}
        >
          <RefreshCw className={["h-3.5 w-3.5 text-ink-dim", metricsQuery.isFetching ? "animate-spin" : ""].join(" ")} />
          Refrescar
        </button>
      </header>

      {metricsQuery.isError ? (
        <div className="rounded-card border border-danger/30 bg-danger/8 px-3 py-3 text-[12px] text-danger">
          {metricsQuery.error instanceof Error
            ? metricsQuery.error.message
            : "No pudimos cargar el turno."}
        </div>
      ) : null}

      {metricsQuery.isLoading ? (
        <div className="grid gap-2.5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="panel-solid-muted min-h-[156px] rounded-card border border-hairline animate-pulse" />
          <div className="grid gap-2.5">
            <div className="panel-solid-muted min-h-[104px] rounded-card border border-hairline animate-pulse" />
            <div className="panel-solid-muted min-h-[104px] rounded-card border border-hairline animate-pulse" />
          </div>
        </div>
      ) : null}

      {!metricsQuery.isLoading && metrics ? (
        <div className="grid gap-2.5 xl:grid-cols-[1fr_0.92fr]">
          <section className="rounded-card border border-hairline bg-white/[0.015] px-3 py-3">
            <div className="mb-2.5 flex items-center justify-between gap-3 border-b border-hairline pb-2">
              <h3 className="text-[15px] font-medium text-ink">Resumen</h3>
              <div className="flex items-center gap-2 text-[11px] text-ink-dim">
                <span>{metrics.tickets} tickets</span>
                {updatedAtLabel ? <span>{updatedAtLabel}</span> : null}
              </div>
            </div>

            <div className="grid gap-1.5">
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-card px-2 py-1.5">
                <span className="text-[12px] text-ink-muted">Ventas</span>
                <span className="font-display text-[26px] leading-none tracking-[-0.03em] text-champagne">
                  {formatPosCurrency(metrics.sales)}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-card px-2 py-1.5">
                <span className="text-[12px] text-ink-muted">Promedio</span>
                <span className="text-[20px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {formatPosCurrency(metrics.averageTicket)}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-card px-2 py-1.5">
                <span className="text-[12px] text-ink-muted">Tickets</span>
                <Receipt className="h-4 w-4 text-ink-dim" />
                <span className="text-[18px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {String(metrics.tickets).padStart(2, "0")}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-card px-2 py-1.5">
                <span className="text-[12px] text-ink-muted">Items</span>
                <Package className="h-4 w-4 text-ink-dim" />
                <span className="text-[18px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {String(metrics.itemsSold).padStart(2, "0")}
                </span>
              </div>
            </div>
          </section>

          <div className="grid gap-2.5">
            <section className="rounded-card border border-hairline bg-white/[0.015] px-3 py-3">
              <div className="mb-2.5 flex items-center justify-between gap-3 border-b border-hairline pb-2">
                <h3 className="text-[15px] font-medium text-ink">Medios de pago</h3>
                <CreditCard className="h-4 w-4 text-ink-dim" />
              </div>

              <div className="space-y-2.5">
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-[12px] text-ink-muted">
                    <span>Efectivo</span>
                    <span className="font-mono-tabular text-ink">
                      {formatPosCurrency(metrics.paymentBreakdown.cashSales)} · {cashShare}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-obsidian">
                    <div className="h-full rounded-full bg-champagne" style={{ width: `${cashShare}%` }} />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-[12px] text-ink-muted">
                    <span>Tarjeta</span>
                    <span className="font-mono-tabular text-ink">
                      {formatPosCurrency(metrics.paymentBreakdown.cardSales)} · {cardShare}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-obsidian">
                    <div className="h-full rounded-full bg-ink" style={{ width: `${cardShare}%` }} />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-card border border-hairline bg-white/[0.015] px-3 py-3">
              <div className="mb-2.5 flex items-center justify-between gap-3 border-b border-hairline pb-2">
                <h3 className="text-[15px] font-medium text-ink">Top productos</h3>
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
                        <p className="font-mono-tabular text-[10px] text-champagne">{product.quantitySold} uds.</p>
                        <p className="mt-1 text-[10px] text-ink-dim">{formatPosCurrency(product.sales)}</p>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-card border border-dashed border-hairline px-4 py-8 text-center text-[12px] text-ink-muted">
                    Sin ventas.
                  </p>
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
