import { Clock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import {
  useActiveShift,
  SHIFT_QUERY_KEYS,
} from "@/modules/shift-reports/hooks/use-shift-reports";
import { ShiftReportModal } from "./ShiftReportModal";
import { OpenShiftDialog } from "./OpenShiftDialog";
import { CloseShiftDialog } from "./CloseShiftDialog";

export function ShiftButton() {
  const { t } = useTranslation("shift");
  const { data: activeShift, isLoading } = useActiveShift();
  const queryClient = useQueryClient();

  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [closedShiftId, setClosedShiftId] = useState<string | null>(null);

  const hasActiveShift = activeShift != null;

  const handleClick = () => {
    if (hasActiveShift && activeShift) {
      queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEYS.report(activeShift.id) });
      setShowCloseDialog(true);
    } else {
      setShowOpenDialog(true);
    }
  };

  const handleClosed = (shiftId: string) => {
    setClosedShiftId(shiftId);
    setShowReport(true);
  };

  if (isLoading) {
    return (
      <Button
        variant="ghost"
        size="icon"
        disabled
        className="h-7 w-7 rounded-card text-text-muted"
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
        onClick={handleClick}
        className={[
          "relative h-7 w-7 rounded-card text-text-muted transition-all duration-200",
          "hover:bg-surface-sunken hover:text-text",
          hasActiveShift
            ? "border border-primary text-primary-strong hover:border-primary-strong hover:bg-primary/10"
            : "",
        ].join(" ")}
        aria-label={hasActiveShift ? t("closeButton") : t("openButton")}
        title={hasActiveShift ? t("closeButton") : t("openButton")}
      >
        <Clock className="h-3.5 w-3.5" />
        {hasActiveShift ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
        ) : null}
      </Button>

      <OpenShiftDialog open={showOpenDialog} onOpenChange={setShowOpenDialog} />

      <CloseShiftDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        shiftId={activeShift?.id ?? null}
        onClosed={handleClosed}
      />

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
