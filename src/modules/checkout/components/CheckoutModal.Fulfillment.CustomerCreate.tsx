import { MapPin, Phone, UserRound } from "lucide-react";

import type { CheckoutCustomerFormState } from "@/modules/checkout/lib/builders";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import { SearchInput } from "@/components/ui/SearchInput";
import { FormField } from "@/components/ui/FormField";

interface CustomerCreateFormProps {
  customerForm: CheckoutCustomerFormState;
  onCustomerFieldChange: (field: keyof CheckoutCustomerFormState, value: string) => void;
  onShowSearchCustomers: () => void;
}

export function CustomerCreateForm({
  customerForm,
  onCustomerFieldChange,
  onShowSearchCustomers,
}: CustomerCreateFormProps) {
  return (
    <div className="rounded-card border border-hairline bg-surface-low px-3 py-3 sm:px-4 sm:py-4">
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
        <FormField label="Cliente" htmlFor="create-customer-name">
          <SearchInput
            id="create-customer-name"
            icon={<UserRound />}
            value={customerForm.name}
            onInput={(event) => onCustomerFieldChange("name", event.currentTarget.value)}
            placeholder="Valentina Suárez"
          />
        </FormField>

        <FormField label="Teléfono" htmlFor="create-customer-phone">
          <SearchInput
            id="create-customer-phone"
            icon={<Phone />}
            value={customerForm.phone}
            onInput={(event) => onCustomerFieldChange("phone", event.currentTarget.value)}
            placeholder="11 5555 5555"
            inputMode="tel"
          />
        </FormField>
      </div>

      <div className="mt-3">
        <FormField label="Dirección" htmlFor="create-customer-address">
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink-dim" />
            <Textarea
              id="create-customer-address"
              value={customerForm.address}
              onInput={(event) => onCustomerFieldChange("address", event.currentTarget.value)}
              className="min-h-[88px] pl-10"
              placeholder="Av. Siempre Viva 742, Timbre B"
            />
          </div>
        </FormField>
      </div>
    </div>
  );
}
