import { MapPin, Phone, UserRound } from "lucide-react";

import type { CheckoutCustomerFormState } from "@/modules/checkout/lib/builders";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
        <div className="grid gap-1">
          <Label htmlFor="create-customer-name">Cliente</Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
            <Input
              id="create-customer-name"
              value={customerForm.name}
              onInput={(event) => onCustomerFieldChange("name", event.currentTarget.value)}
              className="pl-10"
              placeholder="Valentina Suárez"
            />
          </div>
        </div>

        <div className="grid gap-1">
          <Label htmlFor="create-customer-phone">Teléfono</Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
            <Input
              id="create-customer-phone"
              value={customerForm.phone}
              onInput={(event) => onCustomerFieldChange("phone", event.currentTarget.value)}
              className="pl-10"
              placeholder="11 5555 5555"
              inputMode="tel"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-1 mt-3">
        <Label htmlFor="create-customer-address">Dirección</Label>
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
      </div>
    </div>
  );
}
