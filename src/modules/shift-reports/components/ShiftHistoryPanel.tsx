import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Clock, Receipt } from "lucide-react";

import { useShiftHistory, useShiftReport } from "@/modules/shift-reports/hooks/use-shift-reports";
import { formatPosCurrency } from "@/lib/currency";

function ShiftReportInline({ shiftId }: { shiftId: string }) {
  const { t } = useTranslation("shift");
  const { data: report, isLoading } = useShiftReport(shiftId);

  if (isLoading) {
    return (
      <div className="border-t border-hairline bg-obsidian-raised/40 py-6 px-5">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-obsidian-elevated" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 rounded bg-obsidian-elevated" />
            <div className="h-16 rounded bg-obsidian-elevated" />
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="border-t border-hairline bg-obsidian-raised/40 overflow-hidden">
      <div className="p-5">
        {/* Fechas */}
        <div className="flex items-center gap-3 text-[12px] text-ink-muted">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(report.openedAt).toLocaleString()}
          </span>
          {report.closedAt && (
            <>
              <span className="text-ink-dim">→</span>
              <span>{new Date(report.closedAt).toLocaleString()}</span>
            </>
          )}
        </div>

        {/* Total hero */}
        <div className="mt-4 rounded-card border border-hairline/60 bg-gradient-to-b from-obsidian-elevated to-obsidian-raised p-4 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
            {t("totalSales")}
          </p>
          <p className="font-mono-tabular mt-1 text-[28px] font-bold leading-none tracking-tight text-champagne">
            {formatPosCurrency(report.totalSales)}
          </p>
        </div>

        {/* Grid de métricas */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-card border border-hairline bg-obsidian-elevated p-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
              {t("totalOrders")}
            </p>
            <p className="font-mono-tabular mt-1 text-[18px] font-bold text-ink">
              {report.totalOrders}
            </p>
          </div>
          <div className="rounded-card border border-hairline bg-obsidian-elevated p-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
              {t("cashTotal")}
            </p>
            <p className="font-mono-tabular mt-1 text-[15px] font-semibold text-ink">
              {formatPosCurrency(report.cashTotal)}
            </p>
          </div>
          <div className="rounded-card border border-hairline bg-obsidian-elevated p-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
              {t("cardTotal")}
            </p>
            <p className="font-mono-tabular mt-1 text-[15px] font-semibold text-ink">
              {formatPosCurrency(report.cardTotal)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShiftHistoryPanel() {
  const { t } = useTranslation("shift");
  const { data: history = [], isLoading } = useShiftHistory();
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="grid min-h-full grid-rows-[auto_1fr] gap-3">
        <header className="flex flex-col gap-1 border-b border-hairline pb-3">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">{t("historyTitle")}</h2>
        </header>
        <div className="mt-2.5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-card border border-hairline bg-obsidian-elevated p-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-obsidian-raised" />
                <div className="h-4 w-16 rounded bg-obsidian-raised" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="grid min-h-full grid-rows-[auto_1fr] gap-3">
        <header className="flex flex-col gap-1 border-b border-hairline pb-3">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">{t("historyTitle")}</h2>
        </header>
        <section className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-hairline bg-obsidian-elevated">
            <Receipt className="h-6 w-6 text-ink-dim" />
          </div>
          <p className="mt-4 text-[15px] font-medium text-ink">{t("emptyHistory")}</p>
          <p className="mt-1 text-[13px] text-ink-muted">Los turnos cerrados aparecerán aquí</p>
        </section>
      </div>
    );
  }

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr] gap-3">
      <header className="flex flex-col gap-1 border-b border-hairline pb-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">{t("historyTitle")}</h2>
      </header>

      <div className="mt-2.5">
        <div className="grid gap-2">
          {history.map((shift) => {
            const isExpanded = expandedShiftId === shift.shiftId;
            const isActive = !shift.closedAt;

            return (
              <div
                key={shift.shiftId}
                className="rounded-card border border-hairline bg-obsidian-elevated overflow-hidden transition-colors hover:border-hairline-strong"
              >
                <button
                  onClick={() => setExpandedShiftId(isExpanded ? null : shift.shiftId)}
                  className="flex items-center justify-between w-full p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={[
                      "flex h-9 w-9 items-center justify-center rounded-card shrink-0",
                      isActive
                        ? "border border-champagne/30 bg-champagne/5"
                        : "border border-hairline bg-obsidian-raised",
                    ].join(" ")}>
                      <Clock className={[
                        "h-4 w-4",
                        isActive ? "text-champagne" : "text-ink-dim",
                      ].join(" ")} />
                    </div>
                    <div className="grid gap-0.5">
                      <span className="text-[13px] font-medium text-ink">
                        {new Date(shift.openedAt).toLocaleDateString()}
                      </span>
                      <span className="text-[11px] text-ink-muted">
                          {shift.closedAt
                            ? `${new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${new Date(shift.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : (
                              <span className="inline-flex items-center gap-1 text-champagne">
                                <span className="h-1.5 w-1.5 rounded-full bg-champagne" />
                                {t("activeShift")}
                              </span>
                            )
                          }
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-mono-tabular text-[15px] font-semibold text-champagne">
                        {formatPosCurrency(shift.totalSales)}
                      </span>
                      <p className="text-[11px] text-ink-muted">
                        {shift.totalOrders} {t("totalOrders")}
                      </p>
                    </div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-card border border-hairline bg-obsidian-raised text-ink-dim transition-colors hover:bg-obsidian-elevated hover:text-ink">
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && <ShiftReportInline shiftId={shift.shiftId} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
