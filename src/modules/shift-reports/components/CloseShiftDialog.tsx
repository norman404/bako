import { useState } from "react";
import { X } from "lucide-react";
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
import { formatPosCurrency } from "@/lib/currency";
import { parseProductPriceInput } from "@/modules/menu/lib/product-price";
import { useShiftReport, useCloseShift } from "@/modules/shift-reports/hooks/use-shift-reports";
import { translateShiftError } from "@/modules/shift-reports/lib/translate-shift-error";
import { CurrencyInput } from "./CurrencyInput";

interface CloseShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId: string | null;
  onClosed?: (shiftId: string) => void;
}

interface BreakdownRowProps {
  label: string;
  value: number;
  sign?: "+" | "-";
}

function BreakdownRow({ label, value, sign }: BreakdownRowProps) {
  const display = sign === "-" ? `-${formatPosCurrency(value)}` : sign === "+" ? `+${formatPosCurrency(value)}` : formatPosCurrency(value);
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-mono-tabular text-text">{display}</span>
    </div>
  );
}

export function CloseShiftDialog({ open, onOpenChange, shiftId, onClosed }: CloseShiftDialogProps) {
  const { t } = useTranslation("shift");
  const { data: report } = useShiftReport(shiftId);
  const closeShiftMutation = useCloseShift();
  const [countedInput, setCountedInput] = useState("");

  const parsedCounted = parseProductPriceInput(countedInput);
  const isValid = parsedCounted !== null && parsedCounted >= 0;
  const isPending = closeShiftMutation.isPending;

  const openingCash = report?.openingCash ?? 0;
  const cashTotal = report?.cashTotal ?? 0;
  const cashMovementsIn = report?.cashMovementsIn ?? 0;
  const cashMovementsOut = report?.cashMovementsOut ?? 0;
  const expectedCash = report?.expectedCash ?? openingCash + cashTotal + cashMovementsIn - cashMovementsOut;

  const difference = parsedCounted !== null ? parsedCounted - expectedCash : null;

  const differenceLabel =
    difference === null
      ? ""
      : difference === 0
        ? t("cashDifferenceZero")
        : difference > 0
          ? t("cashDifferencePositive")
          : t("cashDifferenceNegative");

  const differenceClassName =
    difference === null
      ? ""
      : difference === 0
        ? "border-success/30 bg-success/10 text-success"
        : difference > 0
          ? "border-warning/30 bg-warning/10 text-warning"
          : "border-danger/30 bg-danger/10 text-danger";

  const differenceDisplay =
    difference !== null
      ? `${difference > 0 ? "+" : difference < 0 ? "-" : ""}${formatPosCurrency(Math.abs(difference))}`
      : "";

  function handleConfirm() {
    if (!isValid || parsedCounted === null || !shiftId) return;
    closeShiftMutation.mutate(
      { shiftId, countedCash: parsedCounted },
      {
        onSuccess: () => {
          toast.success(t("closeShift"));
          setCountedInput("");
          onOpenChange(false);
          onClosed?.(shiftId);
        },
        onError: (error) => {
          toast.error(translateShiftError(error, t));
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">{t("closeShift")}</DialogTitle>
        <DialogDescription className="sr-only">{t("closeShift")}</DialogDescription>

        <header className="flex items-center justify-between border-b border-border-strong px-5 py-3">
          <span className="font-display text-xl text-primary-strong">{t("closeShift")}</span>
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
          <div className="grid gap-1.5 rounded-card border border-border bg-surface-sunken p-4">
            <span className="eyebrow mb-1">
              {t("cashSummary")}
            </span>
            <BreakdownRow label={t("cashSummaryOpening")} value={openingCash} />
            <BreakdownRow label={t("cashSummarySales")} value={cashTotal} sign="+" />
            <BreakdownRow label={t("cashSummaryIncome")} value={cashMovementsIn} sign="+" />
            <BreakdownRow label={t("cashSummaryExpense")} value={cashMovementsOut} sign="-" />
            <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5 text-sm font-semibold">
              <span className="text-text">{t("cashSummaryExpected")}</span>
              <span className="font-mono-tabular text-primary-strong">{formatPosCurrency(expectedCash)}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <Label htmlFor="counted-cash" className="eyebrow">
              {t("countedCashLabel")}
            </Label>
            <CurrencyInput
              id="counted-cash"
              value={countedInput}
              onChange={setCountedInput}
              disabled={isPending}
              ariaLabel={t("countedCashLabel")}
            />
            {countedInput.length > 0 && !isValid && (
              <p className="text-2xs text-danger">{t("countedCashInvalid")}</p>
            )}
          </div>

          {difference !== null && (
            <div
              className={`mt-3 flex items-center justify-between rounded-card border px-3 py-2.5 ${differenceClassName}`}
            >
              <span className="text-sm font-medium">
                {t("cashDifference")} {differenceLabel}
              </span>
              <span className="font-mono-tabular text-lg font-bold">
                {differenceDisplay}
              </span>
            </div>
          )}
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
            {t("closeButton")}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}