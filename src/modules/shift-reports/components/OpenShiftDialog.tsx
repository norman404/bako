import { useState } from "react";
import { Clock, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { parseProductPriceInput } from "@/modules/menu";
import { useOpenShift } from "@/modules/shift-reports/hooks/use-shift-reports";
import { translateShiftError } from "@/modules/shift-reports/lib/translate-shift-error";
import { CurrencyInput } from "./CurrencyInput";

interface OpenShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpenShiftDialog({ open, onOpenChange }: OpenShiftDialogProps) {
  const { t } = useTranslation("shift");
  const openShiftMutation = useOpenShift();
  const [amountInput, setAmountInput] = useState("");

  const parsedAmount = parseProductPriceInput(amountInput);
  const isValid = parsedAmount !== null && parsedAmount > 0;
  const isPending = openShiftMutation.isPending;

  function handleConfirm() {
    if (!isValid || parsedAmount === null) return;
    openShiftMutation.mutate(parsedAmount, {
      onSuccess: () => {
        toast.success(t("openShift"));
        setAmountInput("");
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(translateShiftError(error, t));
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">{t("openShift")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("openingCashDescription")}
        </DialogDescription>

        <header className="flex items-center justify-between border-b border-border-strong px-5 py-3">
          <span className="flex items-center gap-2 font-display text-xl text-primary-strong">
            <Clock className="h-4 w-4" />
            {t("openShift")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="h-8 w-8 rounded-card text-text-muted hover:bg-surface-sunken hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="p-5">
          <div className="grid gap-2">
            <Label htmlFor="opening-cash" className="eyebrow">
              {t("openingCashLabel")}
            </Label>
            <CurrencyInput
              id="opening-cash"
              value={amountInput}
              onChange={setAmountInput}
              disabled={isPending}
              ariaLabel={t("openingCashLabel")}
            />
            {!isValid && amountInput.length > 0 && (
              <p className="text-2xs text-danger">{t("openingCashInvalid")}</p>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-border-strong px-5 py-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            size="medium"
            onClick={handleConfirm}
            disabled={!isValid || isPending}
          >
            {t("openButton")}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}