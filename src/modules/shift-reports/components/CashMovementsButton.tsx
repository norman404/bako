import { Banknote } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useActiveShift } from "../use-shift-reports";
import { CashMovementsDialog } from "./CashMovementsDialog";

export function CashMovementsButton() {
  const { t } = useTranslation("shift");
  const { data: activeShift } = useActiveShift();
  const [open, setOpen] = useState(false);

  if (!activeShift) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="relative h-7 w-7 rounded-card text-text-muted hover:bg-surface-sunken hover:text-text"
        aria-label={t("cashMovements")}
        title={t("cashMovements")}
      >
        <Banknote className="h-3.5 w-3.5" />
      </Button>

      <CashMovementsDialog
        open={open}
        onOpenChange={setOpen}
        shiftId={activeShift.id}
      />
    </>
  );
}