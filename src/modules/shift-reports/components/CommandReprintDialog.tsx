import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  CommandItemSelection,
  OrderDetail,
  OrderDetailItemModifier,
} from "../order-management";
import { useOrderDetail } from "../use-order-management";

interface CommandReprintDialogProps {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  onPrint: (orderDetail: OrderDetail, selections: CommandItemSelection[]) => Promise<boolean>;
}

interface CommandReprintFormProps {
  orderDetail: OrderDetail;
  onClose: () => void;
  onPrint: (orderDetail: OrderDetail, selections: CommandItemSelection[]) => Promise<boolean>;
}

function formatModifier(modifier: OrderDetailItemModifier): string {
  const value = [modifier.optionName, modifier.textValue].filter(Boolean).join(" — ");
  return value ? `${modifier.groupName}: ${value}` : modifier.groupName;
}

function CommandReprintForm({ orderDetail, onClose, onPrint }: CommandReprintFormProps) {
  const { t } = useTranslation("shift");
  const [selections, setSelections] = useState<CommandItemSelection[]>(() =>
    orderDetail.items.map((item) => ({ orderItemId: item.id, quantity: item.quantity })),
  );
  const [isPrinting, setIsPrinting] = useState(false);

  const selectionsByItemId = new Map(
    selections.map((selection) => [selection.orderItemId, selection.quantity]),
  );
  const hasSelection = selections.length > 0;
  const allSelected = selections.length === orderDetail.items.length;

  function handleToggleItem(itemId: string, originalQuantity: number, checked: boolean) {
    setSelections((current) => {
      if (checked) {
        return [...current, { orderItemId: itemId, quantity: originalQuantity }];
      }
      return current.filter((selection) => selection.orderItemId !== itemId);
    });
  }

  function handleQuantityChange(itemId: string, originalQuantity: number, rawValue: string) {
    const parsed = Number(rawValue);
    const quantity = Number.isInteger(parsed)
      ? Math.min(Math.max(parsed, 1), originalQuantity)
      : 1;

    setSelections((current) =>
      current.map((selection) =>
        selection.orderItemId === itemId ? { ...selection, quantity } : selection,
      ),
    );
  }

  function handleToggleAll() {
    setSelections(
      allSelected
        ? []
        : orderDetail.items.map((item) => ({ orderItemId: item.id, quantity: item.quantity })),
    );
  }

  async function handlePrint() {
    if (!hasSelection || isPrinting) return;

    setIsPrinting(true);
    try {
      const didPrint = await onPrint(orderDetail, selections);
      if (didPrint) onClose();
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-border-strong px-5 py-3">
        <div>
          <h2 className="font-display text-xl text-primary-strong">
            {t("commandSelectionTitle", { ticketNumber: orderDetail.ticketNumber })}
          </h2>
          <p className="mt-0.5 text-sm text-text-muted">{t("commandSelectionDescription")}</p>
        </div>
        <Button variant="ghost" onClick={handleToggleAll} disabled={isPrinting}>
          {allSelected ? t("clearCommandSelection") : t("selectAllCommandItems")}
        </Button>
      </header>

      <div className="scrollbar-thin max-h-[26rem] overflow-y-auto p-5">
        {orderDetail.isVoided ? (
          <p role="alert" className="rounded-card border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            {t("reprintCommandUnavailable")}
          </p>
        ) : (
          <div className="grid gap-3">
            {orderDetail.items.map((item, index) => {
              const selectedQuantity = selectionsByItemId.get(item.id);
              const isSelected = selectedQuantity !== undefined;
              const lineNumber = index + 1;

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-card border border-border bg-surface-sunken p-3"
                >
                  <Checkbox
                    id={`command-item-${item.id}`}
                    checked={isSelected}
                    disabled={isPrinting}
                    aria-label={t("selectCommandItem", { productName: item.productName, line: lineNumber })}
                    onCheckedChange={(checked) =>
                      handleToggleItem(item.id, item.quantity, checked === true)
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor={`command-item-${item.id}`}
                      className="cursor-pointer text-sm font-medium text-text"
                    >
                      {item.productName}
                      <span className="ml-1 text-text-muted">· {t("commandItemLine", { line: lineNumber })}</span>
                    </Label>
                    {item.modifiers.length > 0 && (
                      <ul className="mt-1 grid gap-0.5 text-2xs text-text-muted">
                        {item.modifiers.map((modifier, modifierIndex) => (
                          <li key={`${modifier.groupName}-${modifier.optionName}-${modifierIndex}`}>
                            {formatModifier(modifier)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={item.quantity}
                    step={1}
                    value={selectedQuantity ?? item.quantity}
                    disabled={!isSelected || isPrinting}
                    aria-label={t("commandQuantity", { productName: item.productName })}
                    onChange={(event) => handleQuantityChange(item.id, item.quantity, event.target.value)}
                    className="h-9 w-16 text-center"
                  />
                </div>
              );
            })}
          </div>
        )}

        {!orderDetail.isVoided && !hasSelection && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {t("commandSelectionRequired")}
          </p>
        )}
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-border-strong px-5 py-3">
        <Button variant="ghost" onClick={onClose} disabled={isPrinting}>
          {t("cancel")}
        </Button>
        <Button onClick={handlePrint} disabled={!hasSelection || orderDetail.isVoided || isPrinting}>
          {isPrinting ? t("printingCommand") : t("printSelectedCommand")}
        </Button>
      </footer>
    </>
  );
}

export function CommandReprintDialog({ orderId, open, onClose, onPrint }: CommandReprintDialogProps) {
  const { t } = useTranslation("shift");
  const { data: orderDetail, isLoading, isError, refetch } = useOrderDetail(open ? orderId : null);
  const title = orderDetail
    ? t("commandSelectionTitle", { ticketNumber: orderDetail.ticketNumber })
    : t("reprintCommand");

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{t("commandSelectionDescription")}</DialogDescription>

        {orderDetail ? (
          <CommandReprintForm key={orderDetail.id} orderDetail={orderDetail} onClose={onClose} onPrint={onPrint} />
        ) : (
          <div className="p-5">
            {isLoading && (
              <div className="animate-pulse rounded-card border border-border bg-surface-sunken p-4">
                <div className="h-6 w-1/2 rounded bg-surface-raised" />
              </div>
            )}
            {isError && (
              <div className="grid gap-3">
                <p role="alert" className="text-sm text-danger">{t("commandItemsLoadFailed")}</p>
                <div>
                  <Button variant="secondary" onClick={() => { void refetch(); }}>
                    {t("retry")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
