import { Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ScheduleEditor } from "@/components/ScheduleEditor";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormError } from "@/components/ui/FormError";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatPosCurrency } from "@/lib/currency";
import {
  emptyScheduleForm,
  formToSchedule,
  isScheduleActive,
  scheduleToForm,
  type WeeklyScheduleForm,
} from "@/lib/weekly-schedule";
import { cn } from "@/lib/utils";
import { PRODUCT_KIND, formatProductPriceInput, parseProductPriceInput, useCategories, useProducts } from "@/modules/menu";

import { PROMOTION_ERROR_CODE, PromotionError, type PromotionErrorCode, type PromotionInput } from "./promotion-form";
import { PROMOTION_TYPE, type Promotion, type PromotionType } from "./types";
import { useArchivePromotion, usePromotions, useSavePromotion, useTogglePromotion } from "./use-promotions";

const TARGET_KIND = {
  PRODUCT: "product",
  CATEGORY: "category",
} as const;

type TargetKind = (typeof TARGET_KIND)[keyof typeof TARGET_KIND];

interface TargetFormState {
  kind: TargetKind;
  refId: string;
  quantity: string;
}

interface PromotionFormState {
  name: string;
  type: PromotionType;
  buyQuantity: string;
  payQuantity: string;
  bundlePrice: string;
  isActive: boolean;
  schedule: WeeklyScheduleForm;
  targets: TargetFormState[];
}

function emptyFormState(): PromotionFormState {
  return {
    name: "",
    type: PROMOTION_TYPE.NXM,
    buyQuantity: "2",
    payQuantity: "1",
    bundlePrice: "",
    isActive: true,
    schedule: emptyScheduleForm(),
    targets: [],
  };
}

function formStateFromPromotion(promotion: Promotion): PromotionFormState {
  return {
    name: promotion.name,
    type: promotion.type,
    buyQuantity: String(promotion.buyQuantity ?? 2),
    payQuantity: String(promotion.payQuantity ?? 1),
    bundlePrice: promotion.bundlePrice === null ? "" : formatProductPriceInput(promotion.bundlePrice),
    isActive: promotion.isActive,
    schedule: scheduleToForm(promotion.schedule),
    targets: promotion.targets.map((target) => ({
      kind: target.productId !== null ? TARGET_KIND.PRODUCT : TARGET_KIND.CATEGORY,
      refId: target.productId ?? target.categoryId ?? "",
      quantity: String(target.quantity),
    })),
  };
}

function parseCount(value: string): number | null {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : null;
}

function toPromotionInput(state: PromotionFormState): PromotionInput | PromotionErrorCode {
  const schedule = formToSchedule(state.schedule);
  if (!schedule) return PROMOTION_ERROR_CODE.SCHEDULE_INVALID;

  const isNxm = state.type === PROMOTION_TYPE.NXM;
  const bundlePrice = isNxm ? null : parseProductPriceInput(state.bundlePrice);
  if (!isNxm && bundlePrice === null) return PROMOTION_ERROR_CODE.BUNDLE_PRICE_INVALID;

  return {
    name: state.name,
    type: state.type,
    buyQuantity: isNxm ? parseCount(state.buyQuantity) : null,
    payQuantity: isNxm ? parseCount(state.payQuantity) : null,
    bundlePrice,
    schedule,
    isActive: state.isActive,
    targets: state.targets.map((target) => ({
      productId: target.kind === TARGET_KIND.PRODUCT ? target.refId : null,
      categoryId: target.kind === TARGET_KIND.CATEGORY ? target.refId : null,
      quantity: parseCount(target.quantity) ?? 0,
    })),
  };
}

function getListButtonClass(isActive: boolean): string {
  return [
    "w-full cursor-pointer rounded-none border-l-[3px] px-3 py-2 text-left transition-[border-color,background-color] duration-150",
    isActive ? "border-primary-strong bg-primary/15 text-primary-strong" : "border-transparent text-text hover:bg-surface-sunken/60",
  ].join(" ");
}

export function PromotionSettingsPanel() {
  const { t } = useTranslation(["promotions", "common"]);
  const { data: promotions = [] } = usePromotions();
  const { data: allProducts = [] } = useProducts();
  // Composites have their own bundle price and never enter the promotion engine.
  const products = allProducts.filter((product) => product.kind === PRODUCT_KIND.STANDARD);
  const { data: categories = [] } = useCategories();
  const savePromotion = useSavePromotion();
  const togglePromotion = useTogglePromotion();
  const archivePromotion = useArchivePromotion();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formState, setFormState] = useState<PromotionFormState>(emptyFormState);
  const [pendingTarget, setPendingTarget] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Promotion | null>(null);

  const productName = (id: string) => products.find((product) => product.id === id)?.name ?? t("targets.missing");
  const categoryName = (id: string) => categories.find((category) => category.id === id)?.name ?? t("targets.missing");
  const isBundle = formState.type === PROMOTION_TYPE.BUNDLE;
  const now = new Date();

  const beginCreate = () => {
    setSelectedId(null);
    setFormError(null);
    setFormState(emptyFormState());
  };

  const beginEdit = (promotion: Promotion) => {
    setSelectedId(promotion.id);
    setFormError(null);
    setFormState(formStateFromPromotion(promotion));
  };

  const addTarget = () => {
    const [kind, refId] = pendingTarget.split(":") as [TargetKind, string];
    if (!refId || formState.targets.some((target) => target.kind === kind && target.refId === refId)) return;
    setFormState((previous) => ({ ...previous, targets: [...previous.targets, { kind, refId, quantity: "1" }] }));
    setPendingTarget("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = toPromotionInput(formState);
    if (typeof input === "string") {
      setFormError(t(`errors.${input}`));
      return;
    }

    try {
      await savePromotion.mutateAsync({ id: selectedId, input });
      beginCreate();
    } catch (error) {
      setFormError(t(`errors.${error instanceof PromotionError ? error.code : PROMOTION_ERROR_CODE.DB_ERROR}`));
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archivePromotion.mutateAsync(archiveTarget.id);
      if (selectedId === archiveTarget.id) beginCreate();
    } catch {
      setFormError(t("errors.dbError"));
    }
    setArchiveTarget(null);
  };

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr] gap-3">
      <header className="flex items-center justify-between gap-3 border-b border-border-strong pb-3">
        <div>
          <h2 className="font-display text-lg text-primary-strong">{t("title")}</h2>
          <p className="text-2xs text-text-muted">{t("description")}</p>
        </div>
        <Button variant="secondary" size="small" onClick={beginCreate}>
          <Plus className="h-3.5 w-3.5" />
          {t("createNew")}
        </Button>
      </header>

      <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,0.86fr)_minmax(340px,1.14fr)]">
        <section className="min-h-0 overflow-hidden xl:border-r xl:border-border xl:pr-3">
          <div className="scrollbar-thin h-full space-y-1 overflow-y-auto pr-1">
            {promotions.map((promotion) => {
              const runningNow = promotion.isActive && isScheduleActive(promotion.schedule, now);
              return (
                <div key={promotion.id} className="flex items-stretch gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => beginEdit(promotion)}
                    className={getListButtonClass(selectedId === promotion.id)}
                  >
                    <div className="grid gap-0.5">
                      <p className="text-xs font-medium">{promotion.name}</p>
                      <p className="text-2xs text-text-muted">
                        {promotion.type === PROMOTION_TYPE.NXM
                          ? t("summary.nxm", { buy: promotion.buyQuantity, pay: promotion.payQuantity })
                          : t("summary.bundle", { price: formatPosCurrency(promotion.bundlePrice ?? 0) })}
                        {" · "}
                        <span className={runningNow ? "text-success" : undefined}>
                          {runningNow ? t("status.runningNow") : promotion.isActive ? t("status.scheduled") : t("status.paused")}
                        </span>
                      </p>
                    </div>
                  </Button>
                  <div className="flex items-center px-1">
                    <Switch
                      checked={promotion.isActive}
                      aria-label={t("activeLabel")}
                      onCheckedChange={(checked) => togglePromotion.mutate({ id: promotion.id, isActive: checked })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setArchiveTarget(promotion)}
                    className="h-auto w-8 rounded-card text-text-dim hover:bg-surface-sunken hover:text-danger"
                    aria-label={t("archiveButton")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            {promotions.length === 0 ? <EmptyState>{t("emptyState")}</EmptyState> : null}
          </div>
        </section>

        <section className="scrollbar-thin min-h-0 overflow-y-auto xl:pl-1">
          <div className="border-b border-border pb-2.5">
            <h3 className="text-md font-semibold text-text">{selectedId ? t("editTitle") : t("createNew")}</h3>
          </div>

          <form className="mt-3.5 grid gap-3" onSubmit={(event) => void handleSubmit(event)}>
            <FormField label={t("nameLabel")} htmlFor="promotion-name">
              <Input
                id="promotion-name"
                value={formState.name}
                placeholder={t("namePlaceholder")}
                onInput={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((previous) => ({ ...previous, name: value }));
                }}
              />
            </FormField>

            <SegmentedControl
              compact
              ariaLabel={t("typeLabel")}
              activeValue={formState.type}
              onSelect={(value) => setFormState((previous) => ({ ...previous, type: value as PromotionType }))}
              options={[
                { value: PROMOTION_TYPE.NXM, label: t("types.nxm") },
                { value: PROMOTION_TYPE.BUNDLE, label: t("types.bundle") },
              ]}
            />

            {isBundle ? (
              <FormField label={t("bundlePriceLabel")} htmlFor="promotion-bundle-price">
                <Input
                  id="promotion-bundle-price"
                  inputMode="decimal"
                  value={formState.bundlePrice}
                  placeholder="100.00"
                  onInput={(event) => {
                    const value = event.currentTarget.value;
                    setFormState((previous) => ({ ...previous, bundlePrice: value }));
                  }}
                />
              </FormField>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <FormField label={t("buyLabel")} htmlFor="promotion-buy">
                  <Input
                    id="promotion-buy"
                    inputMode="numeric"
                    value={formState.buyQuantity}
                    onInput={(event) => {
                      const value = event.currentTarget.value;
                      setFormState((previous) => ({ ...previous, buyQuantity: value }));
                    }}
                  />
                </FormField>
                <FormField label={t("payLabel")} htmlFor="promotion-pay">
                  <Input
                    id="promotion-pay"
                    inputMode="numeric"
                    value={formState.payQuantity}
                    onInput={(event) => {
                      const value = event.currentTarget.value;
                      setFormState((previous) => ({ ...previous, payQuantity: value }));
                    }}
                  />
                </FormField>
              </div>
            )}

            <FormField label={isBundle ? t("targets.bundleLabel") : t("targets.nxmLabel")} htmlFor="promotion-target">
              <div className="grid gap-2">
                <div className="flex gap-2">
                  <Select value={pendingTarget} onValueChange={setPendingTarget}>
                    <SelectTrigger id="promotion-target">
                      <SelectValue placeholder={t("targets.placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>{t("targets.products")}</SelectLabel>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={`${TARGET_KIND.PRODUCT}:${product.id}`}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      {categories.length > 0 ? (
                        <SelectGroup>
                          <SelectLabel>{t("targets.categories")}</SelectLabel>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={`${TARGET_KIND.CATEGORY}:${category.id}`}>
                              {t("targets.anyInCategory", { name: category.name })}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ) : null}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="secondary" size="small" className="h-9" onClick={addTarget}>
                    <Plus className="h-3.5 w-3.5" />
                    {t("targets.add")}
                  </Button>
                </div>

                {formState.targets.map((target, index) => (
                  <div key={`${target.kind}:${target.refId}`} className="flex items-center gap-2 rounded-card border border-border px-2.5 py-1.5">
                    <span className={cn("flex-1 text-xs", target.kind === TARGET_KIND.CATEGORY && "italic")}>
                      {target.kind === TARGET_KIND.PRODUCT
                        ? productName(target.refId)
                        : t("targets.anyInCategory", { name: categoryName(target.refId) })}
                    </span>
                    {isBundle ? (
                      <Input
                        aria-label={t("targets.quantityLabel")}
                        inputMode="numeric"
                        value={target.quantity}
                        className="h-7 w-14 text-center"
                        onInput={(event) => {
                          const value = event.currentTarget.value;
                          setFormState((previous) => ({
                            ...previous,
                            targets: previous.targets.map((current, currentIndex) =>
                              currentIndex === index ? { ...current, quantity: value } : current,
                            ),
                          }));
                        }}
                      />
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("targets.remove")}
                      className="h-7 w-7 text-text-dim hover:text-danger"
                      onClick={() =>
                        setFormState((previous) => ({
                          ...previous,
                          targets: previous.targets.filter((_, currentIndex) => currentIndex !== index),
                        }))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </FormField>

            <FormField label={t("scheduleLabel")} htmlFor="promotion-schedule-start-0">
              <ScheduleEditor
                idPrefix="promotion-schedule"
                value={formState.schedule}
                onChange={(schedule) => setFormState((previous) => ({ ...previous, schedule }))}
              />
            </FormField>

            <div className="flex items-center gap-2">
              <Switch
                id="promotion-active"
                checked={formState.isActive}
                onCheckedChange={(checked) => setFormState((previous) => ({ ...previous, isActive: checked }))}
              />
              <label htmlFor="promotion-active" className="text-xs text-text-dim">
                {t("activeLabel")}
              </label>
            </div>

            <FormError message={formError} />

            <div className="flex items-center justify-end border-t border-border pt-2.5">
              <Button type="submit" variant="default" size="small" disabled={savePromotion.isPending}>
                {selectedId ? t("saveButton") : t("createButton")}
              </Button>
            </div>
          </form>
        </section>
      </div>

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        title={t("title")}
        description={archiveTarget ? t("confirmArchive", { name: archiveTarget.name }) : ""}
        confirmLabel={t("archiveButton")}
        confirmVariant="danger"
        isLoading={archivePromotion.isPending}
        onConfirm={() => void handleConfirmArchive()}
      />
    </div>
  );
}
