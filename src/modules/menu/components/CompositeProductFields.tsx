import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ScheduleEditor } from "@/components/ScheduleEditor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPosCurrency } from "@/lib/currency";
import type { WeeklyScheduleForm } from "@/lib/weekly-schedule";

import { PRODUCT_KIND, type Product } from "../product";

export interface CompositeComponentForm {
  productId: string;
  quantity: string;
}

export interface CompositeFormState {
  isComposite: boolean;
  components: CompositeComponentForm[];
  hasSchedule: boolean;
  schedule: WeeklyScheduleForm;
}

interface CompositeProductFieldsProps {
  value: CompositeFormState;
  onChange: (value: CompositeFormState) => void;
  products: Product[];
  editingProductId: string | null;
  compositePrice: number | null;
}

export function CompositeProductFields({
  value,
  onChange,
  products,
  editingProductId,
  compositePrice,
}: CompositeProductFieldsProps) {
  const { t } = useTranslation("menu");
  const [pendingProductId, setPendingProductId] = useState("");

  const candidates = products.filter(
    (product) =>
      product.kind === PRODUCT_KIND.STANDARD &&
      product.id !== editingProductId &&
      !value.components.some((component) => component.productId === product.id),
  );
  const productById = new Map(products.map((product) => [product.id, product]));
  const listTotal = value.components.reduce((sum, component) => {
    const quantity = Number.parseInt(component.quantity, 10);
    return sum + (productById.get(component.productId)?.price ?? 0) * (Number.isInteger(quantity) ? quantity : 0);
  }, 0);
  const savings = compositePrice === null ? null : listTotal - compositePrice;

  const addComponent = () => {
    if (!pendingProductId) return;
    onChange({ ...value, components: [...value.components, { productId: pendingProductId, quantity: "1" }] });
    setPendingProductId("");
  };

  return (
    <div className="grid gap-3 rounded-card border border-border bg-surface-raised/40 p-3.5">
      <div className="flex items-center gap-2">
        <Checkbox
          id="product-composite"
          checked={value.isComposite}
          onCheckedChange={(checked) => onChange({ ...value, isComposite: checked === true })}
        />
        <Label htmlFor="product-composite" className="cursor-pointer font-normal normal-case tracking-normal text-text">
          {t("composite.toggle")}
        </Label>
      </div>

      {value.isComposite ? (
        <>
          <p className="text-2xs text-text-dim">{t("composite.hint")}</p>

          <FormField label={t("composite.componentsLabel")} htmlFor="product-component">
            <div className="grid gap-2">
              <div className="flex gap-2">
                <Select value={pendingProductId} onValueChange={setPendingProductId}>
                  <SelectTrigger id="product-component">
                    <SelectValue placeholder={t("composite.componentPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} · {formatPosCurrency(product.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="secondary" size="small" className="h-9" onClick={addComponent}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("composite.add")}
                </Button>
              </div>

              {value.components.map((component, index) => (
                <div key={component.productId} className="flex items-center gap-2 rounded-card border border-border px-2.5 py-1.5">
                  <span className="flex-1 text-xs">
                    {productById.get(component.productId)?.name ?? t("composite.missing")}
                  </span>
                  <Input
                    aria-label={t("composite.quantityLabel")}
                    inputMode="numeric"
                    value={component.quantity}
                    className="h-7 w-14 text-center"
                    onInput={(event) => {
                      const quantity = event.currentTarget.value;
                      onChange({
                        ...value,
                        components: value.components.map((current, currentIndex) =>
                          currentIndex === index ? { ...current, quantity } : current,
                        ),
                      });
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("composite.remove")}
                    className="h-7 w-7 text-text-dim hover:text-danger"
                    onClick={() =>
                      onChange({ ...value, components: value.components.filter((_, currentIndex) => currentIndex !== index) })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}

              {value.components.length > 0 ? (
                <p className="font-mono-tabular text-2xs text-text-muted">
                  {t("composite.separately", { amount: formatPosCurrency(listTotal) })}
                  {savings !== null && savings > 0 ? (
                    <span className="ml-2 text-success">{t("composite.savings", { amount: formatPosCurrency(savings) })}</span>
                  ) : null}
                  {savings !== null && savings < 0 ? (
                    <span className="ml-2 text-danger">{t("composite.moreExpensive")}</span>
                  ) : null}
                </p>
              ) : null}
            </div>
          </FormField>

          <div className="flex items-center gap-2">
            <Checkbox
              id="product-composite-schedule"
              checked={value.hasSchedule}
              onCheckedChange={(checked) => onChange({ ...value, hasSchedule: checked === true })}
            />
            <Label
              htmlFor="product-composite-schedule"
              className="cursor-pointer font-normal normal-case tracking-normal text-text"
            >
              {t("composite.scheduleToggle")}
            </Label>
          </div>

          {value.hasSchedule ? (
            <ScheduleEditor
              idPrefix="product-composite-schedule"
              value={value.schedule}
              onChange={(schedule) => onChange({ ...value, schedule })}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
