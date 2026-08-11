import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useShiftReport } from "../use-shift-reports";
import { ShiftReportView } from "./ShiftReportView";

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
          <header className="flex items-center justify-between border-b border-border-strong px-5 py-3">
            <span className="font-display text-xl text-primary-strong">
              {t("reportTitle")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-card text-text-muted hover:bg-surface-sunken hover:text-text"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5">
            {isLoading ? (
              <div className="space-y-4">
                <div className="animate-pulse rounded-card border border-border bg-surface-sunken p-4">
                  <div className="h-6 w-1/3 rounded bg-surface-raised" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="animate-pulse rounded-card border border-border bg-surface-sunken p-3">
                    <div className="h-4 w-full rounded bg-surface-raised" />
                  </div>
                  <div className="animate-pulse rounded-card border border-border bg-surface-sunken p-3">
                    <div className="h-4 w-full rounded bg-surface-raised" />
                  </div>
                </div>
              </div>
            ) : report ? (
              <ShiftReportView report={report} />
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
