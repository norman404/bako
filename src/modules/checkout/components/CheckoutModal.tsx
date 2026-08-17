import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { calculateCartTotals, type CartItem } from "@/modules/order";
import { CheckoutModalFooterActions } from "./CheckoutModal.Footer";
import { CheckoutModalOrderSummary } from "./CheckoutModal.OrderSummary";
import { CheckoutModalPaymentPanel } from "./CheckoutModal.Payment";
import type { CreateOrderInput } from "../use-checkout";
import { useCheckoutForm } from "../use-checkout-form";

interface CheckoutModalProps {
  open: boolean;
  items: CartItem[];
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirmCheckout: (input: CreateOrderInput) => Promise<void>;
}

function CheckoutModal({
  open,
  items,
  isSubmitting = false,
  onClose,
  onConfirmCheckout,
}: CheckoutModalProps) {
  const { t } = useTranslation("checkout");
  const totals = calculateCartTotals(items);

  const {
    paymentMode,
    cashAmountInput,
    formError,
    cashAppliedAmount,
    cashReceivedAmount,
    cardAmount,
    changeAmount,
    paymentValidationMessage,
    isDisabled,
    handleCloseRequest,
    handlePaymentModeChange,
    handleCashInputChange,
    handleConfirm,
  } = useCheckoutForm({
    open,
    items,
    totals,
    isSubmitting,
    onClose,
    onConfirmCheckout,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSubmitting) handleCloseRequest();
      }}
    >
      <DialogContent
        layout="fullscreen"
        className="flex items-end justify-center p-3 sm:items-center sm:p-5 lg:p-6"
        onInteractOutside={(event) => {
          if (isSubmitting) event.preventDefault();
        }}
      >
        <DialogTitle className="sr-only">{t("modal.ariaLabel")}</DialogTitle>
        <div className="modal-shell-solid flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[58rem] flex-col overflow-hidden rounded-modal animate-modal-in sm:max-h-[calc(100dvh-3rem)]">
          <header className="shrink-0 flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
            <div>
              <p className="eyebrow text-primary">{t("modal.eyebrow")}</p>
              <h2 className="font-display mt-1 text-xl text-primary-strong">
                {t("modal.title")}
              </h2>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseRequest}
              disabled={isSubmitting}
              className="rounded-card"
              aria-label={t("modal.closeAriaLabel")}
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="scrollbar-thin min-h-0 max-h-[calc(100dvh-9.5rem)] space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:max-h-[calc(100dvh-11rem)] sm:px-5 sm:py-4">
            <div className="grid items-start gap-4 lg:grid-cols-[0.84fr_1.16fr]">
              <CheckoutModalOrderSummary items={items} totals={totals} />

              <CheckoutModalPaymentPanel
                totals={totals}
                paymentMode={paymentMode}
                cashAmountInput={cashAmountInput}
                cashAppliedAmount={cashAppliedAmount}
                cashReceivedAmount={cashReceivedAmount}
                cardAmount={cardAmount}
                changeAmount={changeAmount}
                onPaymentModeChange={handlePaymentModeChange}
                onCashInputChange={handleCashInputChange}
                paymentValidationMessage={paymentValidationMessage}
              />
            </div>

            {formError ? (
              <p className="rounded-card border border-danger/40 bg-danger/10 px-3 py-2.5 text-xs text-danger">
                {formError}
              </p>
            ) : null}
          </div>

          <CheckoutModalFooterActions
            onClose={handleCloseRequest}
            onConfirm={handleConfirm}
            isDisabled={isDisabled}
            isSubmitting={isSubmitting}
            totals={totals}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { CheckoutModal };
