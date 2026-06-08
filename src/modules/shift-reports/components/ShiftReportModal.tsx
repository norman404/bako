import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useShiftReport } from "@/modules/shift-reports/hooks/use-shift-reports";
import { formatPosCurrency } from "@/lib/currency";

interface ShiftReportModalProps {
  shiftId: string;
  open: boolean;
  onClose: () => void;
}

export function ShiftReportModal({ shiftId, open, onClose }: ShiftReportModalProps) {
  const { t } = useTranslation("shift");
  const { data: report, isLoading } = useShiftReport(shiftId);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-[28rem] p-0 overflow-hidden max-h-[calc(100dvh-2rem)]">
        <DialogTitle className="sr-only">{t("reportTitle")}</DialogTitle>
        <DialogDescription className="sr-only">{t("reportTitle")}</DialogDescription>

        <div className="flex flex-col">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-hairline px-5 py-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
              {t("reportTitle")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-card text-ink-muted hover:bg-obsidian-elevated hover:text-ink"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5">
            {isLoading ? (
              <div className="space-y-4">
                <div className="animate-pulse rounded-card border border-hairline bg-obsidian-elevated p-4">
                  <div className="h-6 w-1/3 rounded bg-obsidian-raised" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="animate-pulse rounded-card border border-hairline bg-obsidian-elevated p-3">
                    <div className="h-4 w-full rounded bg-obsidian-raised" />
                  </div>
                  <div className="animate-pulse rounded-card border border-hairline bg-obsidian-elevated p-3">
                    <div className="h-4 w-full rounded bg-obsidian-raised" />
                  </div>
                </div>
              </div>
            ) : report ? (
              <div className="grid gap-4">
                {/* Fechas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-card border border-hairline bg-obsidian-elevated p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                      {t("openedAt")}
                    </p>
                    <p className="mt-1 text-[13px] font-medium text-ink">
                      {report.openedAt.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-card border border-hairline bg-obsidian-elevated p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                      {t("closedAt")}
                    </p>
                    <p className="mt-1 text-[13px] font-medium text-ink">
                      {report.closedAt ? report.closedAt.toLocaleString() : "—"}
                    </p>
                  </div>
                </div>

                {/* Hero: Total Sales */}
                <div className="rounded-card border border-hairline/60 bg-gradient-to-b from-obsidian-elevated to-obsidian-raised p-5 text-center">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                    {t("totalSales")}
                  </p>
                  <p className="font-mono-tabular mt-2 text-[36px] font-bold leading-none tracking-tight text-champagne sm:text-[42px]">
                    {formatPosCurrency(report.totalSales)}
                  </p>
                </div>

                {/* Métricas secundarias */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-card border border-hairline bg-obsidian-elevated p-3 text-center">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                      {t("totalOrders")}
                    </p>
                    <p className="font-mono-tabular mt-1 text-[22px] font-bold text-ink">
                      {report.totalOrders}
                    </p>
                  </div>
                  <div className="rounded-card border border-hairline bg-obsidian-elevated p-3 text-center">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                      {t("cashTotal")}
                    </p>
                    <p className="font-mono-tabular mt-1 text-[18px] font-semibold text-ink">
                      {formatPosCurrency(report.cashTotal)}
                    </p>
                  </div>
                  <div className="rounded-card border border-hairline bg-obsidian-elevated p-3 text-center">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                      {t("cardTotal")}
                    </p>
                    <p className="font-mono-tabular mt-1 text-[18px] font-semibold text-ink">
                      {formatPosCurrency(report.cardTotal)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
