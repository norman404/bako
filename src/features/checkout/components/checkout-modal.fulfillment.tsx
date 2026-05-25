import type {
  CheckoutCustomer,
  CheckoutFulfillmentType,
} from "@/features/checkout/hooks/use-checkout";
import type { CheckoutCustomerFormState } from "@/features/checkout/lib/builders";

import { CustomerCreateForm } from "./checkout-modal.fulfillment.customer-create";
import { CheckoutDeliveryHeader } from "./checkout-modal.fulfillment.delivery-header";
import { CustomerSearchPanel } from "./checkout-modal.fulfillment.customer-search";
import { CheckoutFulfillmentSelector } from "./checkout-modal.fulfillment.selector";

type CustomerQueryResult = ReturnType<
  typeof import("@/features/checkout/hooks/use-checkout").useCustomers
>;

interface CheckoutModalFulfillmentPanelProps {
  fulfillmentType: CheckoutFulfillmentType;
  onFulfillmentChange: (type: CheckoutFulfillmentType) => void;
  isDelivery: boolean;
  isSearchCustomerMode: boolean;
  isNewCustomerMode: boolean;
  onShowSearchCustomers: () => void;
  onStartNewCustomer: () => void;
  customerSearch: string;
  onCustomerSearchChange: (value: string) => void;
  selectedCustomerId: string | null;
  customerQuery: CustomerQueryResult;
  customerOptions: CheckoutCustomer[];
  trimmedCustomerSearch: string;
  customerSectionLabel: string;
  onSelectCustomer: (customer: CheckoutCustomer) => void;
  customerForm: CheckoutCustomerFormState;
  onCustomerFieldChange: (field: keyof CheckoutCustomerFormState, value: string) => void;
  formError: string | null;
}

function CheckoutModalFulfillmentPanel({
  fulfillmentType,
  onFulfillmentChange,
  isDelivery,
  isSearchCustomerMode,
  isNewCustomerMode,
  onShowSearchCustomers,
  onStartNewCustomer,
  customerSearch,
  onCustomerSearchChange,
  selectedCustomerId,
  customerQuery,
  customerOptions,
  trimmedCustomerSearch,
  customerSectionLabel,
  onSelectCustomer,
  customerForm,
  onCustomerFieldChange,
  formError,
}: CheckoutModalFulfillmentPanelProps) {
  return (
    <section className="rounded-card border border-hairline bg-white/[0.015] px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex flex-col gap-3 border-b border-hairline pb-2.5 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="text-[15px] font-medium text-ink">Entrega</h3>

        <CheckoutFulfillmentSelector
          fulfillmentType={fulfillmentType}
          onFulfillmentChange={onFulfillmentChange}
        />
      </div>

      {isDelivery ? (
        <div className="mt-3 space-y-4">
          <CheckoutDeliveryHeader
            isSearchCustomerMode={isSearchCustomerMode}
            isNewCustomerMode={isNewCustomerMode}
            onShowSearchCustomers={onShowSearchCustomers}
            onStartNewCustomer={onStartNewCustomer}
          />

          {isSearchCustomerMode ? (
            <CustomerSearchPanel
              customerSearch={customerSearch}
              onCustomerSearchChange={onCustomerSearchChange}
              selectedCustomerId={selectedCustomerId}
              customerQuery={customerQuery}
              customerOptions={customerOptions}
              trimmedCustomerSearch={trimmedCustomerSearch}
              customerSectionLabel={customerSectionLabel}
              onSelectCustomer={onSelectCustomer}
              onStartNewCustomer={onStartNewCustomer}
            />
          ) : (
            <CustomerCreateForm
              customerForm={customerForm}
              onCustomerFieldChange={onCustomerFieldChange}
              onShowSearchCustomers={onShowSearchCustomers}
            />
          )}
        </div>
      ) : null}

      {formError ? (
        <p className="mt-3 rounded-card border border-danger/40 bg-danger/10 px-3 py-2.5 text-[12px] text-danger">
          {formError}
        </p>
      ) : null}
    </section>
  );
}

export { CheckoutModalFulfillmentPanel };
