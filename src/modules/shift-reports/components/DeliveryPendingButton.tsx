import { useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Bike, Check, ChevronRight, Clock, LoaderCircle, Printer, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatPosCurrency } from "@/lib/currency";
import { useCategories } from "@/modules/menu";
import { usePrinters } from "@/modules/printer";
import { useSettingsStore } from "@/modules/settings";
import { useFeatureFlagsStore } from "@/modules/feature-flags";
import { useConfirmDelivery, usePendingDeliveries } from "../use-deliveries";
import { useActiveShift } from "../use-shift-reports";
import { useFetchOrderDetail } from "../use-order-management";
import { DELIVERY_PAYMENT_METHOD, parseDeliveryAmount, type DeliveryPaymentMethod, type PendingDelivery } from "../delivery";
import { reprintCommand } from "../lib/reprint-command";
import { translateShiftError } from "../lib/translate-shift-error";
import { VoidOrderConfirm } from "./VoidOrderConfirm";

interface ConfirmDeliveryFormProps {
  order: PendingDelivery;
  onConfirmed: () => void;
}

function ConfirmDeliveryForm({ order, onConfirmed }: ConfirmDeliveryFormProps) {
  const { t } = useTranslation(["order", "shift"]);
  const [amountInput, setAmountInput] = useState("");
  const [method, setMethod] = useState<DeliveryPaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const mutation = useConfirmDelivery();
  const shiftEnabled = useFeatureFlagsStore((state) => state.flags.shift_management_enabled ?? false);
  const { data: activeShift, isPending: loadingShift } = useActiveShift();
  const amount = parseDeliveryAmount(amountInput);
  const needsShift = shiftEnabled && (loadingShift || !activeShift);
  const amountId = `delivery-amount-${order.id}`;
  const invalidAmount = amountInput.length > 0 && amount === null;
  const collectionHint = method === null ? "delivery.collectionHint"
    : method === DELIVERY_PAYMENT_METHOD.CASH ? "delivery.cashHint" : "delivery.platformHint";

  async function handleConfirm() {
    if (inFlight.current || amount === null || method === null || needsShift) return;
    inFlight.current = true;
    setError(null);
    try {
      await mutation.mutateAsync({ orderId: order.id, input: { amount, method, shiftId: shiftEnabled ? activeShift?.id ?? null : null } });
      toast.success(t("delivery.confirmedToast", { ticketNumber: order.ticketNumber }));
      onConfirmed();
    } catch (cause) {
      setError(translateShiftError(cause, t));
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <fieldset disabled={mutation.isPending} aria-label={t("delivery.confirm")} className="min-w-0 space-y-4">
          <div className="rounded-card border border-border bg-surface-sunken p-3">
            {order.deliveryReference ? <p className="text-sm leading-5">
              <span className="mr-2 text-text-dim">{t("delivery.referenceShort")}</span>
              <span className="font-mono-tabular break-all">{order.deliveryReference}</span>
            </p> : null}
            {order.orderName ? <p className="mt-1 break-words text-sm leading-5 text-text-muted">{order.orderName}</p> : null}
            <p className="mt-1 text-xs text-text-dim">{order.itemCount} {t("shift:itemCount")}</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={amountId} className="text-sm normal-case tracking-normal">{t("delivery.finalAmount")}</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-mono-tabular text-lg text-text-dim" aria-hidden="true">$</span>
              <Input
                id={amountId}
                value={amountInput}
                inputMode="decimal"
                autoComplete="off"
                autoFocus
                placeholder="0.00"
                className="h-14 pl-9 font-mono-tabular text-xl"
                aria-invalid={invalidAmount}
                aria-describedby={`${amountId}-hint${invalidAmount ? ` ${amountId}-error` : ""}`}
                onChange={(event) => { setAmountInput(event.currentTarget.value); setError(null); }}
              />
            </div>
            <p id={`${amountId}-hint`} className="text-xs leading-5 text-text-dim">{t("delivery.amountHint")}</p>
            {invalidAmount ? <p id={`${amountId}-error`} role="alert" className="text-xs leading-5 text-danger">{t("delivery.invalidAmount")}</p> : null}
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-semibold">{t("delivery.collection")}</span>
            <SegmentedControl
              compact
              ariaLabel={t("delivery.collection")}
              options={[
                { value: DELIVERY_PAYMENT_METHOD.CASH, label: t("delivery.cash") },
                { value: DELIVERY_PAYMENT_METHOD.PLATFORM, label: t("delivery.platform") },
              ]}
              activeValue={method ?? ""}
              onSelect={(value) => {
                if (value === DELIVERY_PAYMENT_METHOD.CASH || value === DELIVERY_PAYMENT_METHOD.PLATFORM) {
                  setMethod(value);
                  setError(null);
                }
              }}
            />
            <p className="text-xs leading-5 text-text-dim">{t(collectionHint)}</p>
          </div>
          {needsShift ? <p role="alert" className="rounded-card border border-warning/30 bg-warning/10 p-3 text-sm leading-5 text-warning">{t("shift:noActiveShiftAlert")}</p> : null}
          {error ? <p role="alert" className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm leading-5 text-danger">{error}</p> : null}
        </fieldset>
      </div>
      <footer className="shrink-0 border-t border-border bg-surface-raised p-4 sm:px-5">
        <Button
          size="medium"
          className="h-12 w-full gap-2 whitespace-normal rounded-card text-sm leading-5"
          disabled={amount === null || method === null || needsShift || mutation.isPending}
          aria-busy={mutation.isPending}
          onClick={() => { void handleConfirm(); }}
        >
          {mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
          {mutation.isPending ? t("delivery.confirming") : amount === null ? t("delivery.confirm") : t("delivery.confirmAmount", { amount: formatPosCurrency(amount) })}
        </Button>
      </footer>
    </div>
  );
}

export function DeliveryPendingButton() {
  const { t, i18n } = useTranslation(["order", "shift"]);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [voidOrder, setVoidOrder] = useState<PendingDelivery | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const printInFlight = useRef(false);
  const { data: pending = [], isLoading, isError, refetch } = usePendingDeliveries();
  const { data: printers = [] } = usePrinters({ enabled: open });
  const { data: categories = [] } = useCategories();
  const header = useSettingsStore((state) => state.comandaHeaderText);
  const fetchDetail = useFetchOrderDetail();
  const selectedOrder = pending.find((order) => order.id === selectedId) ?? null;

  async function handleReprint(order: PendingDelivery) {
    if (printInFlight.current) return;
    printInFlight.current = true;
    setPrintingId(order.id);
    try {
      const detail = await fetchDetail(order.id);
      if (detail.isVoided) throw new Error("Voided order");
      const result = await reprintCommand(detail, printers, categories, header?.trim() || "COMANDA");
      if (result.errors.length) toast.error(t("shift:reprintFailed"));
      else if (!result.printedCount) toast.error(t("shift:noCommandPrinterConfigured"));
      else toast.success(t("shift:commandReprinted", { ticketNumber: order.ticketNumber }));
    } catch {
      toast.error(t("shift:reprintFailed"));
    } finally {
      printInFlight.current = false;
      setPrintingId(null);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="small"
        className="h-7 gap-2 rounded-card px-2 text-xs normal-case tracking-normal text-text-muted"
        aria-label={isError ? t("delivery.loadFailed") : t("delivery.pendingButton", { count: pending.length })}
        onClick={() => setOpen(true)}
      >
        <Bike className="h-3.5 w-3.5" aria-hidden="true" />
        {t("delivery.toolbar")}
        {isError ? <AlertCircle className="h-3.5 w-3.5 text-warning" aria-hidden="true" /> : (
          <span className="font-mono-tabular inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-primary/10 px-1 text-2xs text-primary-strong">
            {isLoading ? "…" : pending.length}
          </span>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg flex-col overflow-hidden p-0">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-4 sm:px-5">
            <div className="flex min-w-0 items-start gap-2">
              {selectedOrder ? <Button variant="ghost" size="icon" className="-ml-2 h-11 w-11 shrink-0 rounded-card" onClick={() => setSelectedId(null)} aria-label={t("delivery.backToPending")}>
                <ArrowLeft className="h-4 w-4" />
              </Button> : null}
              <div className="min-w-0">
                <DialogTitle className="font-display text-xl leading-tight text-primary-strong">{t(selectedOrder ? "delivery.confirm" : "delivery.pendingTitle")}</DialogTitle>
                <DialogDescription className="mt-2 text-xs leading-5 text-text-dim">
                  {selectedOrder ? `${t(`channels.${selectedOrder.channel}`)} · #${selectedOrder.ticketNumber}` : t("delivery.pendingHint")}
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-card" onClick={() => setOpen(false)} aria-label={t("delivery.close")}>
              <X className="h-4 w-4" />
            </Button>
          </header>
          {selectedOrder ? <ConfirmDeliveryForm key={selectedOrder.id} order={selectedOrder} onConfirmed={() => setSelectedId(null)} /> : (
            <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
              {isLoading ? (
                <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-text-muted">
                  <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{t("delivery.loading")}
                </div>
              ) : isError ? (
                <div role="alert" className="grid justify-items-center gap-4 py-8 text-center">
                  <AlertCircle className="h-6 w-6 text-warning" aria-hidden="true" />
                  <p className="text-sm text-text-muted">{t("delivery.loadFailed")}</p>
                  <Button variant="outline" size="medium" className="h-11 rounded-card" onClick={() => { void refetch(); }}>{t("shift:retry")}</Button>
                </div>
              ) : pending.length === 0 ? (
                <div className="grid justify-items-center gap-3 py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-card bg-primary/10"><Bike className="h-6 w-6 text-primary" aria-hidden="true" /></span>
                  <p className="text-sm text-text-muted">{t("delivery.empty")}</p>
                </div>
              ) : pending.map((order) => {
                return (
                  <section key={order.id} className="rounded-card border border-border bg-surface-sunken p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="rounded-sm bg-primary/10 px-2 py-1 text-xs font-semibold text-primary-strong">{t(`channels.${order.channel}`)}</span>
                        <span className="font-mono-tabular text-sm font-semibold">#{order.ticketNumber}</span>
                      </div>
                      <span className="shrink-0 rounded-sm bg-warning/10 px-2 py-1 text-2xs font-medium text-warning">{t("delivery.pending")}</span>
                    </div>
                    {order.deliveryReference ? (
                      <p className="mt-3 flex flex-wrap gap-x-2 text-sm leading-5">
                        <span className="text-text-dim">{t("delivery.referenceShort")}</span>
                        <span className="font-mono-tabular min-w-0 break-all">{order.deliveryReference}</span>
                      </p>
                    ) : null}
                    {order.orderName ? <p className="mt-1 break-words text-sm leading-5 text-text-muted">{order.orderName}</p> : null}
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-dim">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      <time dateTime={order.createdAt.toISOString()} title={order.createdAt.toLocaleString(i18n.language)}>
                        {order.createdAt.toLocaleString(i18n.language, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}
                      </time>
                      <span aria-hidden="true">·</span>
                      <span>{order.itemCount} {t("shift:itemCount")}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
                      <Button
                        variant="default"
                        size="medium"
                        className="h-11 min-w-0 gap-2 whitespace-normal rounded-card px-3 text-sm leading-5"
                        onClick={() => setSelectedId(order.id)}
                      >
                        {t("delivery.confirm")}
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 rounded-card"
                        disabled={printingId !== null}
                        title={t("delivery.labels")}
                        aria-label={`${t("delivery.labels")} · #${order.ticketNumber}`}
                        onClick={() => { void handleReprint(order); }}
                      >
                        {printingId === order.id ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Printer className="h-4 w-4" aria-hidden="true" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 rounded-card text-text-dim hover:bg-danger/10 hover:text-danger"
                        title={t("delivery.cancelOrder")}
                        aria-label={`${t("delivery.cancelOrder")} · #${order.ticketNumber}`}
                        onClick={() => setVoidOrder(order)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {voidOrder ? <VoidOrderConfirm orderId={voidOrder.id} ticketNumber={voidOrder.ticketNumber} open onClose={() => setVoidOrder(null)} /> : null}
    </>
  );
}
