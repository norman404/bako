import { Clock, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useActiveShift,
  useOpenShift,
  useCloseShift,
} from "@/modules/shift-reports/hooks/use-shift-reports";
import { ShiftReportModal } from "./ShiftReportModal";

export function ShiftButton() {
  const { t } = useTranslation("shift");
  const { data: activeShift, isLoading } = useActiveShift();
  const openShiftMutation = useOpenShift();
  const closeShiftMutation = useCloseShift();

  const [showReport, setShowReport] = useState(false);
  const [closedShiftId, setClosedShiftId] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const hasActiveShift = activeShift != null;
  const isMutating = openShiftMutation.isPending || closeShiftMutation.isPending;

  const handleOpen = () => {
    openShiftMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("openShift"));
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : String(error));
      },
    });
  };

  const handleClose = () => {
    setConfirmClose(true);
  };

  const confirmCloseShift = () => {
    if (!activeShift) return;
    const shiftId = activeShift.id;
    setConfirmClose(false);
    closeShiftMutation.mutate(shiftId, {
      onSuccess: () => {
        toast.success(t("closeShift"));
        setClosedShiftId(shiftId);
        setShowReport(true);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : String(error));
      },
    });
  };

  if (isLoading) {
    return (
      <Button
        variant="ghost"
        size="icon"
        disabled
        className="h-7 w-7 rounded-card text-ink-muted"
        aria-label="Shift"
      >
        <Clock className="h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={hasActiveShift ? handleClose : handleOpen}
        disabled={isMutating}
        className={[
          "relative h-7 w-7 rounded-card text-ink-muted transition-all duration-150",
          "hover:bg-obsidian-elevated hover:text-ink",
          hasActiveShift
            ? "border border-champagne/30 text-champagne hover:border-champagne/50 hover:bg-champagne/5"
            : "",
        ].join(" ")}
        aria-label={hasActiveShift ? t("closeButton") : t("openButton")}
        title={hasActiveShift ? t("closeButton") : t("openButton")}
      >
        <Clock className="h-3.5 w-3.5" />
        {hasActiveShift ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-champagne/40" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-champagne" />
          </span>
        ) : null}
      </Button>

      {/* Confirm close dialog */}
      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogTitle className="sr-only">{t("confirmClose")}</DialogTitle>
          <DialogDescription className="sr-only">{t("confirmCloseDescription")}</DialogDescription>
          
          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-obsidian-elevated">
                <Clock className="h-5 w-5 text-champagne" />
              </div>
              
              <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.01em] text-ink">
                {t("confirmClose")}
              </h3>
              <p className="mt-2 max-w-[16rem] text-[13px] leading-relaxed text-ink-muted">
                {t("confirmCloseDescription")}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="ghost"
                onClick={() => setConfirmClose(false)}
                className="h-10 rounded-card text-[13px] font-medium text-ink-muted hover:bg-obsidian-elevated hover:text-ink"
              >
                Cancelar
              </Button>
              <Button
                variant="secondary"
                onClick={confirmCloseShift}
                disabled={closeShiftMutation.isPending}
                className="group h-10 rounded-card bg-champagne text-[13px] font-semibold text-obsidian hover:bg-champagne-bright"
              >
                <span className="flex items-center gap-1.5">
                  {t("closeButton")}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report modal after close */}
      {closedShiftId ? (
        <ShiftReportModal
          shiftId={closedShiftId}
          open={showReport}
          onClose={() => setShowReport(false)}
        />
      ) : null}
    </>
  );
}
