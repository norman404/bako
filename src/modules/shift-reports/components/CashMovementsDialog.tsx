import { useState } from "react";
import { ArrowDown, ArrowUp, Banknote, Pencil, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatPosCurrency } from "@/lib/currency";
import { parseProductPriceInput } from "@/modules/menu/lib/product-price";
import {
  useCashMovements,
  useAddCashMovement,
  useUpdateCashMovement,
  useDeleteCashMovement,
} from "@/modules/shift-reports/hooks/use-shift-reports";
import { translateShiftError } from "@/modules/shift-reports/lib/translate-shift-error";
import type { CashMovement, CashMovementType } from "@/modules/shift-reports/domain/shift";
import { CurrencyInput } from "./CurrencyInput";

interface CashMovementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId: string | null;
}

export function CashMovementsDialog({
  open,
  onOpenChange,
  shiftId,
}: CashMovementsDialogProps) {
  const { t } = useTranslation("shift");
  const { data: movements } = useCashMovements(shiftId);
  const addMutation = useAddCashMovement();
  const updateMutation = useUpdateCashMovement();
  const deleteMutation = useDeleteCashMovement();

  const [type, setType] = useState<CashMovementType>("expense");
  const [amountInput, setAmountInput] = useState("");
  const [reason, setReason] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const parsedAmount = parseProductPriceInput(amountInput);
  const isAmountValid = parsedAmount !== null && parsedAmount > 0;
  const isReasonValid = reason.trim().length >= 3;
  const isFormValid = isAmountValid && isReasonValid;
  const isPending = addMutation.isPending || updateMutation.isPending;

  const handleReset = () => {
    setType("expense");
    setAmountInput("");
    setReason("");
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!isFormValid || parsedAmount === null || !shiftId) return;
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, shiftId, input: { amount: parsedAmount, reason: reason.trim() } },
        {
          onSuccess: () => {
            toast.success(t("cashMovementSaved"));
            handleReset();
          },
          onError: (error) => toast.error(translateShiftError(error, t)),
        },
      );
    } else {
      addMutation.mutate(
        { shiftId, input: { type, amount: parsedAmount, reason: reason.trim() } },
        {
          onSuccess: () => {
            toast.success(t("cashMovementSaved"));
            handleReset();
          },
          onError: (error) => toast.error(translateShiftError(error, t)),
        },
      );
    }
  };

  const handleEdit = (movement: CashMovement) => {
    setEditingId(movement.id);
    setType(movement.type);
    setAmountInput((movement.amount / 100).toFixed(2));
    setReason(movement.reason);
  };

  const handleDelete = (movement: CashMovement) => {
    if (!shiftId) return;
    deleteMutation.mutate(
      { id: movement.id, shiftId },
      {
        onSuccess: () => toast.success(t("cashMovementDeleted")),
        onError: (error) => toast.error(translateShiftError(error, t)),
      },
    );
  };

  const movementsList = movements ?? [];
  const totalIn = movementsList
    .filter((m) => m.type === "income")
    .reduce((s, m) => s + m.amount, 0);
  const totalOut = movementsList
    .filter((m) => m.type === "expense")
    .reduce((s, m) => s + m.amount, 0);
  const net = totalIn - totalOut;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[calc(100dvh-2rem)]">
        <DialogTitle className="sr-only">{t("cashMovementsTitle")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("cashMovementsTitle")}
        </DialogDescription>

        <header className="flex items-center justify-between border-b border-border-strong px-5 py-3">
          <span className="flex items-center gap-2 font-display text-xl text-primary-strong">
            <Banknote className="h-4 w-4" />
            {t("cashMovementsTitle")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-card text-text-muted hover:bg-surface-sunken hover:text-text"
            aria-label={t("cancel")}
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="scrollbar-thin max-h-[26rem] overflow-y-auto p-5">
          <div className="grid gap-3">
            <div>
              <Label className="mb-2 block">{t("cashMovementType")}</Label>
              <SegmentedControl
                options={[
                  {
                    value: "expense",
                    label: t("cashMovementExpense"),
                    icon: ArrowDown,
                  },
                  {
                    value: "income",
                    label: t("cashMovementIncome"),
                    icon: ArrowUp,
                  },
                ]}
                activeValue={type}
                onSelect={(value) => setType(value as CashMovementType)}
              />
            </div>

            <div>
              <Label htmlFor="cash-movement-amount" className="mb-2 block">
                {t("cashMovementAmount")}
              </Label>
              <CurrencyInput
                id="cash-movement-amount"
                value={amountInput}
                onChange={setAmountInput}
                ariaLabel={t("cashMovementAmount")}
              />
              {!isAmountValid && amountInput.length > 0 && (
                <p role="alert" className="mt-1 text-2xs text-danger">
                  {t("cashMovementAmountInvalid")}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="cash-movement-reason" className="mb-2 block">
                {t("cashMovementReason")}
              </Label>
              <Input
                id="cash-movement-reason"
                type="text"
                value={reason}
                aria-label={t("cashMovementReason")}
                placeholder={t("cashMovementReasonPlaceholder")}
                onChange={(e) => setReason(e.target.value)}
                className="h-10"
              />
              {!isReasonValid && reason.length > 0 && (
                <p role="alert" className="mt-1 text-2xs text-danger">
                  {t("cashMovementReasonInvalid")}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <span className="eyebrow">{t("cashMovements")}</span>

            {movementsList.length === 0 ? (
              <EmptyState className="mt-3">{t("noCashMovements")}</EmptyState>
            ) : (
              <ul className="mt-3 grid gap-2">
                {movementsList.map((movement) => (
                  <li
                    key={movement.id}
                    className="flex items-center gap-3 rounded-card border border-border bg-surface-sunken p-3"
                  >
                    <span
                      className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-card border",
                        movement.type === "income"
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-danger/40 bg-danger/10 text-danger",
                      ].join(" ")}
                    >
                      {movement.type === "income" ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">
                        {movement.reason}
                      </p>
                      <p className="font-mono-tabular text-sm text-text-muted">
                        {formatPosCurrency(movement.amount)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(movement)}
                      aria-label={t("editMovement")}
                      className="h-7 w-7 shrink-0 text-text-muted hover:bg-surface-raised hover:text-text"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(movement)}
                      aria-label={t("deleteMovement")}
                      className="h-7 w-7 shrink-0 text-text-muted hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-border-strong px-5 py-3">
          <div className="flex items-center gap-4">
            <div className="grid gap-0.5">
              <span className="eyebrow">{t("cashMovementsNet")}</span>
              <span
                className={[
                  "font-mono-tabular text-sm font-semibold",
                  net >= 0 ? "text-text" : "text-danger",
                ].join(" ")}
              >
                {formatPosCurrency(net)}
              </span>
            </div>
            <div className="grid gap-0.5">
              <span className="eyebrow">{t("cashMovementsIn")}</span>
              <span className="font-mono-tabular text-sm font-semibold text-success">
                {formatPosCurrency(totalIn)}
              </span>
            </div>
            <div className="grid gap-0.5">
              <span className="eyebrow">{t("cashMovementsOut")}</span>
              <span className="font-mono-tabular text-sm font-semibold text-danger">
                {formatPosCurrency(totalOut)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editingId && (
              <Button
                variant="ghost"
                onClick={handleReset}
                disabled={isPending}
              >
                {t("cancelEdit")}
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isPending}
              size="medium"
            >
              {editingId ? t("updateCashMovement") : t("addCashMovement")}
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}