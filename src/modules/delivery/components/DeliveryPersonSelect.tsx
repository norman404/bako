import { ColorInput } from "@/shared/components/ColorInput";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useCreateDeliveryPerson, useDeliveryPersons } from "@/modules/delivery/hooks/use-delivery-persons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/FormField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DeliveryPersonSelectProps {
  value: string | null;
  onChange: (id: string | null) => void;
}

const NONE_VALUE = "__none__";

function DeliveryPersonSelect({ value, onChange }: DeliveryPersonSelectProps) {
  const { t } = useTranslation("delivery");
  const { data: deliveryPersons = [] } = useDeliveryPersons();
  const createMutation = useCreateDeliveryPerson();

  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickColor, setQuickColor] = useState("");

  const handleQuickCreate = async () => {
    if (!quickName.trim() || !quickColor.trim()) {
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        name: quickName.trim(),
        color: quickColor.trim(),
      });
      onChange(created.id);
      setQuickName("");
      setQuickColor("");
      setShowQuickCreate(false);
    } catch {
      // error is surfaced via createMutation.error
    }
  };

  return (
    <div className="space-y-2">
      <FormField label={t("select.label")} htmlFor="delivery-person-select">
        <Select
          value={value ?? NONE_VALUE}
          onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("select.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>—</SelectItem>
            {deliveryPersons.map((person) => (
              <SelectItem key={person.id} value={person.id}>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: person.color }}
                  />
                  {person.name}
                </span>
              </SelectItem>
            ))}
            {deliveryPersons.length === 0 && (
              <div className="py-2 text-center text-xs text-text-dim">
                {t("select.noOptions")}
              </div>
            )}
          </SelectContent>
        </Select>
      </FormField>

      {!showQuickCreate ? (
        <Button
          variant="ghost"
          size="small"
          onClick={() => setShowQuickCreate(true)}
        >
          + {t("select.quickCreate")}
        </Button>
      ) : (
        <div className="rounded-card border border-border bg-surface-sunken/50 p-2 space-y-2">
          <Input
            placeholder={t("form.namePlaceholder")}
            value={quickName}
            onInput={(event) => setQuickName(event.currentTarget.value)}
          />
          <ColorInput
            id="quick-delivery-person-color"
            value={quickColor}
            onChange={(value) => setQuickColor(value)}
            placeholder={t("form.colorPlaceholder")}
          />
          <div className="flex items-center gap-2">
            <Button
              onClick={() => void handleQuickCreate()}
              disabled={createMutation.isPending}
              size="small"
            >
              {createMutation.isPending ? t("select.creating") : t("form.create")}
            </Button>
            <Button
              variant="ghost"
              size="small"
              onClick={() => setShowQuickCreate(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { DeliveryPersonSelect };
