import { LoaderCircle, MapPin, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { CheckoutCustomer } from "@/modules/checkout/hooks/use-checkout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { FormField } from "@/components/ui/FormField";
import { EmptyState } from "@/components/ui/EmptyState";
import { translateCheckoutError } from "@/modules/checkout/lib/translate-checkout-error";
import { cn } from "@/lib/utils";

type CustomerQueryResult = ReturnType<
  typeof import("@/modules/checkout/hooks/use-checkout").useCustomers
>;

interface CustomerSearchPanelProps {
  customerSearch: string;
  onCustomerSearchChange: (value: string) => void;
  selectedCustomerId: string | null;
  customerQuery: CustomerQueryResult;
  customerOptions: CheckoutCustomer[];
  trimmedCustomerSearch: string;
  customerSectionLabel: string;
  onSelectCustomer: (customer: CheckoutCustomer) => void;
  onStartNewCustomer: () => void;
}

const CUSTOMER_CARD_CLASS = [
  "min-h-11 w-full rounded-card border px-3 py-2.5 text-left transition-colors duration-200",
  "hover:border-border-strong hover:bg-surface-sunken",
].join(" ");

export function CustomerSearchPanel({
  customerSearch,
  onCustomerSearchChange,
  selectedCustomerId,
  customerQuery,
  customerOptions,
  trimmedCustomerSearch,
  customerSectionLabel,
  onSelectCustomer,
  onStartNewCustomer,
}: CustomerSearchPanelProps) {
  const { t } = useTranslation('checkout');
  
  return (
    <div className="space-y-3 rounded-card border border-border bg-surface-raised px-3 py-3 sm:px-4 sm:py-4">
      <FormField label={t('customerSearch.label')} htmlFor="customer-search">
        <SearchInput
          id="customer-search"
          value={customerSearch}
          onInput={(event) => onCustomerSearchChange(event.currentTarget.value)}
          placeholder={t('customerSearch.placeholder')}
        />
      </FormField>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-2xs font-medium uppercase tracking-[0.16em] text-text-muted">
            {customerSectionLabel}
          </p>
          {selectedCustomerId ? (
            <Badge>{t('customerSearch.selectedBadge')}</Badge>
          ) : null}
        </div>

        {customerQuery.isPending ? (
          <div className="flex items-center gap-2 rounded-card border border-border px-3 py-2.5 text-xs text-text-dim">
            <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
            {t('customerSearch.loading')}
          </div>
        ) : customerQuery.isError ? (
          <p className="rounded-card border border-danger/40 bg-danger/10 px-3 py-2.5 text-xs text-danger">
            {translateCheckoutError(customerQuery.error, t)}
          </p>
        ) : customerOptions.length === 0 ? (
          <EmptyState className="px-3 py-3 text-left">
            <p className="text-xs leading-snug text-text-dim">
              {trimmedCustomerSearch.length > 0
                ? t('customerSearch.emptySearch')
                : t('customerSearch.emptyState')}
            </p>
            <Button
              type="button"
              variant="default"
              size="small"
              onClick={onStartNewCustomer}
              className="mt-2.5 h-8 px-3"
            >
              {t('customerSearch.newButton')}
            </Button>
          </EmptyState>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {customerOptions.map((customer) => {
              const isSelected = selectedCustomerId === customer.id;

              return (
                <Button
                  key={customer.id}
                  variant="ghost"
                  onClick={() => onSelectCustomer(customer)}
                  className={cn(
                    CUSTOMER_CARD_CLASS,
                    isSelected
                      ? "border-primary bg-primary/10 hover:border-primary hover:bg-primary/10"
                      : "border-border bg-surface-raised",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight text-text">
                        {customer.name}
                      </p>
                      <p className="mt-1.5 flex items-center gap-2 text-2xs text-text-dim">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{customer.phone}</span>
                      </p>
                      <p className="mt-1 flex items-start gap-2 text-2xs leading-snug text-text-dim">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="line-clamp-2">{customer.address}</span>
                      </p>
                    </div>
                    {isSelected ? (
                      <span className="text-2xs font-semibold uppercase tracking-[0.16em] text-primary-strong">
                        {t('customerSearch.activeLabel')}
                      </span>
                    ) : null}
                  </div>
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
