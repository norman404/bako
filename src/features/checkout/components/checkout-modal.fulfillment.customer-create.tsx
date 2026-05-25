import { MapPin, Phone, UserRound } from "lucide-react";

import type { CheckoutCustomerFormState } from "@/features/checkout/lib/builders";
import { Button } from "@/shared/components/ui/button";

interface CustomerCreateFormProps {
  customerForm: CheckoutCustomerFormState;
  onCustomerFieldChange: (field: keyof CheckoutCustomerFormState, value: string) => void;
  onShowSearchCustomers: () => void;
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

export function CustomerCreateForm({
  customerForm,
  onCustomerFieldChange,
  onShowSearchCustomers,
}: CustomerCreateFormProps) {
  return (
    <div className="rounded-card border border-hairline bg-white/[0.015] px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex flex-col gap-3 border-b border-hairline pb-2.5 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="text-[15px] font-medium text-ink">
          Crear cliente nuevo
        </h3>
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={onShowSearchCustomers}
          className="h-8 px-3 text-[10px] uppercase tracking-[0.16em]"
        >
          Volver a buscar
        </Button>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <label className={FIELD_LABEL_CLASS}>
          Cliente
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
            <input
              value={customerForm.name}
              onInput={(event) => onCustomerFieldChange("name", event.currentTarget.value)}
              className={`${FIELD_INPUT_CLASS} pl-10`}
              placeholder="Valentina Suárez"
            />
          </div>
        </label>

        <label className={FIELD_LABEL_CLASS}>
          Teléfono
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
            <input
              value={customerForm.phone}
              onInput={(event) => onCustomerFieldChange("phone", event.currentTarget.value)}
              className={`${FIELD_INPUT_CLASS} pl-10`}
              placeholder="11 5555 5555"
              inputMode="tel"
            />
          </div>
        </label>
      </div>

      <label className={`${FIELD_LABEL_CLASS} mt-3`}>
        Dirección
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink-dim" />
          <textarea
            value={customerForm.address}
            onInput={(event) => onCustomerFieldChange("address", event.currentTarget.value)}
            className={[
              "min-h-[88px] w-full resize-none rounded-card border border-hairline bg-obsidian py-3 pl-10 pr-3",
              "text-[13px] text-ink outline-none placeholder:text-ink-dim",
              "transition-colors duration-150 focus-visible:border-champagne/40 focus-visible:ring-1 focus-visible:ring-champagne/20",
            ].join(" ")}
            placeholder="Av. Siempre Viva 742, Timbre B"
          />
        </div>
      </label>
    </div>
  );
}
