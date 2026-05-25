import { LoaderCircle, MapPin, Phone, Search } from "lucide-react";

import type { CheckoutCustomer } from "@/modules/checkout/hooks/use-checkout";
import { Button } from "@/components/ui/Button";

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

const FIELD_INPUT_CLASS = [
  "h-9 w-full rounded-card border border-hairline bg-obsidian px-3",
  "text-[13px] text-ink outline-none",
  "placeholder:text-ink-dim",
  "transition-colors duration-150",
  "focus-visible:border-champagne/40 focus-visible:ring-1 focus-visible:ring-champagne/20",
].join(" ");

const FIELD_LABEL_CLASS =
  "grid gap-1 text-[9px] font-medium uppercase tracking-[0.16em] text-ink-dim";

const CUSTOMER_CARD_CLASS = [
  "w-full rounded-card border px-3 py-2.5 text-left transition-colors duration-150",
  "hover:border-hairline hover:bg-white/[0.02]",
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
  return (
    <div className="space-y-3 rounded-card border border-hairline bg-white/[0.015] px-3 py-3 sm:px-4 sm:py-4">
      <label className={FIELD_LABEL_CLASS}>
        Buscar cliente
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
          <input
            value={customerSearch}
            onInput={(event) => onCustomerSearchChange(event.currentTarget.value)}
            placeholder="Nombre, teléfono o dirección"
            className={`${FIELD_INPUT_CLASS} pl-10`}
          />
        </div>
      </label>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted">
            {customerSectionLabel}
          </p>
          {selectedCustomerId ? (
            <span className="rounded-card border border-champagne/24 bg-champagne/8 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-champagne">
              Cliente seleccionado
            </span>
          ) : null}
        </div>

        {customerQuery.isPending ? (
          <div className="flex items-center gap-2 rounded-card border border-hairline px-3 py-2.5 text-[12px] text-ink-dim">
            <LoaderCircle className="h-4 w-4 animate-spin text-champagne" />
            Buscando clientes...
          </div>
        ) : customerQuery.isError ? (
          <p className="rounded-card border border-danger/40 bg-danger/10 px-3 py-2.5 text-[12px] text-danger">
            {customerQuery.error instanceof Error
              ? customerQuery.error.message
              : "No pudimos cargar clientes guardados"}
          </p>
        ) : customerOptions.length === 0 ? (
          <div className="rounded-card border border-dashed border-hairline px-3 py-3">
            <p className="text-[12px] leading-snug text-ink-dim">
              {trimmedCustomerSearch.length > 0
                ? 'No encontramos clientes con esa búsqueda. Probá con otro dato o tocá "Nuevo cliente".'
                : "Todavía no hay clientes guardados para delivery."}
            </p>
            <Button
              type="button"
              variant="default"
              size="small"
              onClick={onStartNewCustomer}
              className="mt-2.5 h-8 px-3"
            >
              Nuevo cliente
            </Button>
          </div>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {customerOptions.map((customer) => {
              const isSelected = selectedCustomerId === customer.id;

              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => onSelectCustomer(customer)}
                  className={[
                    CUSTOMER_CARD_CLASS,
                    isSelected
                      ? "border-champagne/24 bg-white/[0.032]"
                      : "border-transparent bg-transparent",
                  ].join(" ")}
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
                        ACTIVO
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
