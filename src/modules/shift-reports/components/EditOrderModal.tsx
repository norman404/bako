import { useState } from "react";
import { CreditCard, Trash2, Wallet, X } from "lucide-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
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
import { useOrderDetail, useUpdateOrder } from "../use-order-management";
import type { OrderDetail, OrderDetailItem, UpdateOrderInput } from "../order-management";

type EditOrderPaymentMethod = "cash" | "card";

interface EditOrderModalProps {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
}

function normalizePaymentMethod(method: string): EditOrderPaymentMethod {
  // eslint-disable-next-line no-console -- debug temporal, ver instrucciones en el mensaje del PR/chat
  console.log("[DEBUG normalizePaymentMethod] method =", method, "| typeof =", typeof method);
  return String(method ?? "").trim().toLowerCase() === "card" ? "card" : "cash";
}

function calculateTotal(items: OrderDetailItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-border-strong px-5 py-3">
      <span className="font-display text-xl text-primary-strong">{title}</span>
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
  );
}

function VoidedOrderNotice({
  orderDetail,
  onClose,
  t,
}: {
  orderDetail: OrderDetail;
  onClose: () => void;
  t: TFunction;
}) {
  return (
    <>
      <ModalHeader
        title={t("editOrderTitle", { ticketNumber: orderDetail.ticketNumber })}
        onClose={onClose}
      />
      <div className="p-5">
        <p className="mb-3 inline-flex items-center rounded-card border border-danger/40 bg-danger/10 px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-danger">
          {t("orderVoidedBadge")}
        </p>
        <div className="grid gap-2">
          {orderDetail.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-text">
                {item.productName}
                <span className="ml-1 text-text-muted">× {item.quantity}</span>
              </span>
              <span className="font-mono-tabular text-text-muted">
                {formatPosCurrency(item.unitPrice * item.quantity)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end border-t border-border pt-3">
          <span className="font-mono-tabular text-lg font-semibold text-text">
            {formatPosCurrency(orderDetail.total)}
          </span>
        </div>
      </div>
    </>
  );
}

function EditOrderForm({
  orderDetail,
  onClose,
  t,
}: {
  orderDetail: OrderDetail;
  onClose: () => void;
  t: TFunction;
}) {
  const [items, setItems] = useState<OrderDetailItem[]>(() =>
    orderDetail.items.map((item) => ({ ...item })),
  );
  const [paymentMethod, setPaymentMethod] = useState<EditOrderPaymentMethod>(() =>
    normalizePaymentMethod(orderDetail.paymentMethod),
  );
  const [removeError, setRemoveError] = useState(false);

  const updateOrderMutation = useUpdateOrder();
  const isSaving = updateOrderMutation.isPending;
  const total = calculateTotal(items);

  function handleQuantityChange(itemId: string, rawValue: string) {
    const parsed = Number.parseInt(rawValue, 10);
    const quantity = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    );
  }

  function handleRemoveItem(itemId: string) {
    if (items.length <= 1) {
      setRemoveError(true);
      return;
    }
    setRemoveError(false);
    setItems((current) => current.filter((item) => item.id !== itemId));
  }

  function handleSave() {
    const input: UpdateOrderInput = {
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        modifiers: item.modifiers.map((mod) => ({
          groupId: mod.groupId ?? "",
          groupName: mod.groupName,
          optionId: mod.optionId,
          optionName: mod.optionName,
          priceDelta: mod.priceDelta,
          textValue: mod.textValue,
        })),
      })),
      payment: {
        method: paymentMethod,
        amount: total,
      },
    };

    updateOrderMutation.mutate(
      { orderId: orderDetail.id, input },
      {
        onSuccess: () => {
          toast.success(t("orderUpdated", { ticketNumber: orderDetail.ticketNumber }));
          onClose();
        },
        onError: () => {
          toast.error(t("updateFailed"));
        },
      },
    );
  }

  return (
    <>
      <ModalHeader
        title={t("editOrderTitle", { ticketNumber: orderDetail.ticketNumber })}
        onClose={onClose}
      />

      <div className="scrollbar-thin max-h-[26rem] overflow-y-auto p-5">
        <div className="grid gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-card border border-border bg-surface-sunken p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">{item.productName}</p>
                <p className="font-mono-tabular text-2xs text-text-muted">
                  {formatPosCurrency(item.unitPrice * item.quantity)}
                </p>
              </div>
              <Input
                type="number"
                min={1}
                value={item.quantity}
                aria-label={`${t("quantity")} ${item.productName}`}
                onChange={(event) => handleQuantityChange(item.id, event.target.value)}
                className="h-9 w-16 text-center"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveItem(item.id)}
                aria-label={`${t("removeItem")} ${item.productName}`}
                className="h-9 w-9 shrink-0 text-text-muted hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {removeError && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {t("itemsEmptyError")}
          </p>
        )}

        <div className="mt-4">
          <Label className="mb-2 block">{t("paymentMethodLabel")}</Label>
          <SegmentedControl
            options={[
              { value: "cash", label: t("cashTotal"), icon: Wallet },
              { value: "card", label: t("cardTotal"), icon: CreditCard },
            ]}
            activeValue={paymentMethod}
            onSelect={(value) => setPaymentMethod(value as EditOrderPaymentMethod)}
          />
        </div>
      </div>

      <footer className="flex items-center justify-between border-t border-border-strong px-5 py-3">
        <span
          data-testid="edit-order-total"
          className="font-mono-tabular text-lg font-semibold text-text"
        >
          {formatPosCurrency(total)}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {t("saveChanges")}
          </Button>
        </div>
      </footer>
    </>
  );
}

export function EditOrderModal({ orderId, open, onClose }: EditOrderModalProps) {
  const { t } = useTranslation("shift");
  const { data: orderDetail, isLoading } = useOrderDetail(open ? orderId : null);

  const title = orderDetail
    ? t("editOrderTitle", { ticketNumber: orderDetail.ticketNumber })
    : t("editOrder");

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[calc(100dvh-2rem)]">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{title}</DialogDescription>

        {orderDetail ? (
          orderDetail.isVoided ? (
            <VoidedOrderNotice orderDetail={orderDetail} onClose={onClose} t={t} />
          ) : (
            <EditOrderForm key={orderDetail.id} orderDetail={orderDetail} onClose={onClose} t={t} />
          )
        ) : (
          <>
            <ModalHeader title={title} onClose={onClose} />
            {isLoading && (
              <div className="p-5">
                <div className="animate-pulse rounded-card border border-border bg-surface-sunken p-4">
                  <div className="h-6 w-1/3 rounded bg-surface-raised" />
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
