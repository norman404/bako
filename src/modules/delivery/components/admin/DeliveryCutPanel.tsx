import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
  DELIVERY_PERSONS_CUT_QUERY_KEY,
  useTodayDeliveryCut,
} from "@/modules/delivery/hooks/use-delivery-persons";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPosCurrency } from "@/lib/currency";

function DeliveryCutPanel() {
  const { t } = useTranslation("delivery");
  const queryClient = useQueryClient();
  const { data, isLoading } = useTodayDeliveryCut();

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: DELIVERY_PERSONS_CUT_QUERY_KEY });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr_auto] gap-3">
      <header className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">
            {t("cut.title")}
          </h2>
          <p className="mt-0.5 text-[11px] text-ink-dim">{t("cut.subtitle")}</p>
        </div>

        <Button variant="secondary" size="small" onClick={handleRefresh}>
          {t("cut.refreshButton")}
        </Button>
      </header>

      <div className="min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="py-6 text-center text-[12px] text-ink-dim">Cargando...</div>
        ) : !data || data.rows.length === 0 ? (
          <EmptyState>{t("cut.empty")}</EmptyState>
        ) : (
          <div className="space-y-1">
            {data.rows.map((row) => (
              <div
                key={row.deliveryPersonId}
                className="flex items-center justify-between rounded-card border border-hairline px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="text-[13px] font-medium text-ink">{row.name}</span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <span className="text-[11px] text-ink-dim">
                    {row.ordersCount} {t("cut.orders")}
                  </span>
                  <span className="text-[13px] font-semibold text-ink">
                    {formatPosCurrency(row.totalSales)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {data && data.rows.length > 0 ? (
        <footer className="border-t border-hairline pt-3 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-dim">
              {t("cut.summary")}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-card bg-surface-mid px-3 py-2.5">
            <span className="text-[12px] text-ink-dim">
              {data.totalOrders} {t("cut.orders")}
            </span>
            <span className="text-[14px] font-bold text-ink">
              {formatPosCurrency(data.totalSales)}
            </span>
          </div>
          <p className="px-1 text-[10px] text-ink-muted">
            {t("cut.generatedAt", { time: formatTime(data.generatedAt) })}
          </p>
        </footer>
      ) : null}
    </div>
  );
}

export { DeliveryCutPanel };
