import { LoaderCircle, MapPin, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { CheckoutCustomer } from "@/modules/checkout/hooks/use-checkout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { FormField } from "@/components/ui/FormField";
import { EmptyState } from "@/components/ui/EmptyState";
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
  "w-full rounded-card border px-3 py-2.5 text-left transition-colors duration-150",
  "hover:border-hairline hover:bg-surface-low",
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
    <div className="space-y-3 rounded-card border border-hairline bg-surface-low px-3 py-3 sm:px-4 sm:py-4">
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
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted">
            {customerSectionLabel}
          </p>
          {selectedCustomerId ? (
            <Badge>{t('customerSearch.selectedBadge')}</Badge>
          ) : null}
        </div>

        {customerQuery.isPending ? (
          <div className="flex items-center gap-2 rounded-card border border-hairline px-3 py-2.5 text-[12px] text-ink-dim">
            <LoaderCircle className="h-4 w-4 animate-spin text-champagne" />
            {t('customerSearch.loading')}
          </div>
        ) : customerQuery.isError ? (
          <p className="rounded-card border border-danger/40 bg-danger/10 px-3 py-2.5 text-[12px] text-danger">
            {customerQuery.error instanceof Error
              ? customerQuery.error.message
              : t('customerSearch.error')}
          </p>
        ) : customerOptions.length === 0 ? (
          <EmptyState className="px-3 py-3 text-left">
            <p className="text-[12px] leading-snug text-ink-dim">
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
                      ? "border-champagne/24 bg-surface-mid"
                      : "border-transparent bg-transparent",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-tight tracking-[-0.01em] text-ink">
                        {customer.name}
                      </p>
                      <p className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-dim">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{customer.phone}</span>
                      </p>
                      <p className="mt-1 flex items-start gap-2 text-[11px] leading-snug text-ink-dim">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="line-clamp-2">{customer.address}</span>
                      </p>
                    </div>
                    {isSelected ? (
                      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-champagne">
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
