import { X } from "lucide-react";

import { CheckoutModalFooterActions } from "@/features/checkout/components/checkout-modal.footer";
import { CheckoutModalFulfillmentPanel } from "@/features/checkout/components/checkout-modal.fulfillment";
import { CheckoutModalOrderSummary } from "@/features/checkout/components/checkout-modal.order-summary";
import { CheckoutModalPaymentPanel } from "@/features/checkout/components/checkout-modal.payment";
import type { CreateOrderInput } from "@/features/checkout/hooks/use-checkout";
import { useCheckoutForm } from "@/features/checkout/hooks/use-checkout-form";
import { calculateCartTotals, type CartItem } from "@/features/order/domain/cart";

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
  const totals = calculateCartTotals(items);

  const {
    fulfillmentType,
    cashAmountInput,
    customerSearch,
    selectedCustomerId,
    customerForm,
    formError,
    isDelivery,
    isSearchCustomerMode,
    isNewCustomerMode,
    isCashPayment,
    paymentValidationMessage,
    registeredPaymentAmount,
    changeAmount,
    isDisabled,
    customerQuery,
    customerOptions,
    trimmedCustomerSearch,
    customerSectionLabel,
    handleCloseRequest,
    handleFulfillmentChange,
    handlePaymentMethodChange,
    handleSelectCustomer,
    handleShowSearchCustomers,
    handleStartNewCustomer,
    handleCustomerFieldChange,
    handleCashInputChange,
    handleCustomerSearchChange,
    handleConfirm,
  } = useCheckoutForm({
    open,
    items,
    totals,
    isSubmitting,
    onClose,
    onConfirmCheckout,
  });

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#020202]/96 p-3 animate-fade-in sm:items-center sm:p-5 lg:p-6"
      onClick={handleCloseRequest}
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar checkout"
    >
      <div
        className="modal-shell-solid flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[50rem] flex-col overflow-hidden rounded-modal border border-hairline animate-modal-in sm:max-h-[calc(100dvh-3rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-hairline px-4 py-3 sm:px-5">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink sm:text-[22px]">
            Cobro
          </h2>

          <button
            type="button"
            onClick={handleCloseRequest}
            disabled={isSubmitting}
            className="flex h-8 w-8 items-center justify-center rounded-card text-ink-muted transition-colors duration-150 hover:bg-white/[0.04] hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="scrollbar-thin min-h-0 max-h-[calc(100dvh-9.5rem)] space-y-4 overflow-y-auto px-4 py-4 sm:max-h-[calc(100dvh-11rem)] sm:px-5 sm:py-4">
          <div className="grid gap-2.5 lg:grid-cols-[1.08fr_0.92fr]">
            <CheckoutModalOrderSummary items={items} totals={totals} />

            <section className="grid gap-2.5">
              <CheckoutModalPaymentPanel
                totals={totals}
                isCashPayment={isCashPayment}
                cashAmountInput={cashAmountInput}
                onPaymentMethodChange={handlePaymentMethodChange}
                onCashInputChange={handleCashInputChange}
                paymentValidationMessage={paymentValidationMessage}
                registeredPaymentAmount={registeredPaymentAmount}
                changeAmount={changeAmount}
              />
            </section>
          </div>

          <CheckoutModalFulfillmentPanel
            fulfillmentType={fulfillmentType}
            onFulfillmentChange={handleFulfillmentChange}
            isDelivery={isDelivery}
            isSearchCustomerMode={isSearchCustomerMode}
            isNewCustomerMode={isNewCustomerMode}
            onShowSearchCustomers={handleShowSearchCustomers}
            onStartNewCustomer={handleStartNewCustomer}
            customerSearch={customerSearch}
            onCustomerSearchChange={handleCustomerSearchChange}
            selectedCustomerId={selectedCustomerId}
            customerQuery={customerQuery}
            customerOptions={customerOptions}
            trimmedCustomerSearch={trimmedCustomerSearch}
            customerSectionLabel={customerSectionLabel}
            onSelectCustomer={handleSelectCustomer}
            customerForm={customerForm}
            onCustomerFieldChange={handleCustomerFieldChange}
            formError={formError}
          />
        </div>

        <CheckoutModalFooterActions
          onClose={handleCloseRequest}
          onConfirm={handleConfirm}
          isDisabled={isDisabled}
          isSubmitting={isSubmitting}
          totals={totals}
        />
      </div>
    </div>
  );
}

export { CheckoutModal };
