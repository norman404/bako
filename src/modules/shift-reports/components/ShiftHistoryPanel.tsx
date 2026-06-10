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
      <div className="border-t border-border bg-surface-raised/40 py-6 px-5">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-surface-sunken" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 rounded bg-surface-sunken" />
            <div className="h-16 rounded bg-surface-sunken" />
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="border-t border-border bg-surface-raised/40 overflow-hidden">
      <div className="p-5">
        {/* Fechas */}
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(report.openedAt).toLocaleString()}
          </span>
          {report.closedAt && (
            <>
              <span className="text-text-dim">→</span>
              <span>{new Date(report.closedAt).toLocaleString()}</span>
            </>
          )}
        </div>

        {/* Total hero */}
        <div className="mt-4 rounded-card border border-border/60 bg-surface-sunken p-4 text-center">
          <p className="text-2xs font-medium uppercase tracking-wider text-text-muted">
            {t("totalSales")}
          </p>
          <p className="font-mono-tabular mt-1 text-xl font-bold leading-none tracking-tight text-primary-strong">
            {formatPosCurrency(report.totalSales)}
          </p>
        </div>

        {/* Grid de métricas */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-card border border-border bg-surface-sunken p-3 text-center">
            <p className="text-2xs font-medium uppercase tracking-wider text-text-muted">
              {t("totalOrders")}
            </p>
            <p className="font-mono-tabular mt-1 text-lg font-bold text-text">
              {report.totalOrders}
            </p>
          </div>
          <div className="rounded-card border border-border bg-surface-sunken p-3 text-center">
            <p className="text-2xs font-medium uppercase tracking-wider text-text-muted">
              {t("cashTotal")}
            </p>
            <p className="font-mono-tabular mt-1 text-md font-semibold text-text">
              {formatPosCurrency(report.cashTotal)}
            </p>
          </div>
          <div className="rounded-card border border-border bg-surface-sunken p-3 text-center">
            <p className="text-2xs font-medium uppercase tracking-wider text-text-muted">
              {t("cardTotal")}
            </p>
            <p className="font-mono-tabular mt-1 text-md font-semibold text-text">
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
        <header className="flex flex-col gap-1 border-b border-border-strong pb-3">
          <h2 className="font-display text-lg text-primary-strong">{t("historyTitle")}</h2>
        </header>
        <div className="mt-2.5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-card border border-border bg-surface-sunken p-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-surface-raised" />
                <div className="h-4 w-16 rounded bg-surface-raised" />
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
        <header className="flex flex-col gap-1 border-b border-border-strong pb-3">
          <h2 className="font-display text-lg text-primary-strong">{t("historyTitle")}</h2>
        </header>
        <section className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-sunken">
            <Receipt className="h-6 w-6 text-text-dim" />
          </div>
          <p className="mt-4 text-md font-medium text-text">{t("emptyHistory")}</p>
          <p className="mt-1 text-sm text-text-muted">Los turnos cerrados aparecerán aquí</p>
        </section>
      </div>
    );
  }

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr] gap-3">
      <header className="flex flex-col gap-1 border-b border-border-strong pb-3">
        <h2 className="font-display text-lg text-primary-strong">{t("historyTitle")}</h2>
      </header>

      <div className="mt-2.5">
        <div className="grid gap-2">
          {history.map((shift) => {
            const isExpanded = expandedShiftId === shift.shiftId;
            const isActive = !shift.closedAt;

            return (
              <div
                key={shift.shiftId}
                className="rounded-card border border-border bg-surface-raised shadow-card overflow-hidden transition-colors hover:border-border-strong"
              >
                <button
                  onClick={() => setExpandedShiftId(isExpanded ? null : shift.shiftId)}
                  className="flex items-center justify-between w-full p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={[
                      "flex h-9 w-9 items-center justify-center rounded-card shrink-0",
                      isActive
                        ? "border border-primary bg-primary/10"
                        : "border border-border bg-surface-sunken",
                    ].join(" ")}>
                      <Clock className={[
                        "h-4 w-4",
                        isActive ? "text-primary-strong" : "text-text-dim",
                      ].join(" ")} />
                    </div>
                    <div className="grid gap-0.5">
                      <span className="text-sm font-medium text-text">
                        {new Date(shift.openedAt).toLocaleDateString()}
                      </span>
                      <span className="text-2xs text-text-muted">
                          {shift.closedAt
                            ? `${new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${new Date(shift.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : (
                              <span className="inline-flex items-center gap-1 text-primary-strong">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                {t("activeShift")}
                              </span>
                            )
                          }
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-mono-tabular text-md font-semibold text-primary-strong">
                        {formatPosCurrency(shift.totalSales)}
                      </span>
                      <p className="text-2xs text-text-muted">
                        {shift.totalOrders} {t("totalOrders")}
                      </p>
                    </div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-card border border-border bg-surface-raised text-text-dim transition-colors hover:bg-surface-sunken hover:text-text">
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
