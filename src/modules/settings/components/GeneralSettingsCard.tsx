import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { requestSettingsOperation } from "../settings-window-client";
import {
  SETTINGS_RPC_OPERATION,
  SHIFT_LIST_ORDER,
} from "../settings-window-protocol";
import { useSettingsWindowStore } from "../settings-window-store";

export function GeneralSettingsCard() {
  const { t } = useTranslation("settings");
  const snapshot = useSettingsWindowStore((state) => state.snapshot);
  const [isUpdatingListOrder, setIsUpdatingListOrder] = useState(false);

  if (!snapshot) return null;

  const SUPPORTED_LOCALES = [
    { value: "es-MX", label: t("locales.esMX") },
    { value: "en-US", label: t("locales.enUS") },
  ];

  const SUPPORTED_CURRENCIES = [
    { value: "MXN", label: t("currencies.mxn") },
    { value: "USD", label: t("currencies.usd") },
  ];

  async function updateRegionalSettings(locale: string, currency: string) {
    try {
      const updated = await requestSettingsOperation(SETTINGS_RPC_OPERATION.UPDATE_REGIONAL, {
        locale,
        currency,
      });
      useSettingsWindowStore.getState().applySnapshot(updated);
      toast.success(t("system.saveSuccess"), {
        description: t("system.saveSuccessDesc", { locale, currency }),
      });
    } catch {
      toast.error(t("system.saveError"));
    }
  }

  async function updateShiftListOrder(order: string) {
    if (order !== SHIFT_LIST_ORDER.ASCENDING && order !== SHIFT_LIST_ORDER.DESCENDING) return;

    setIsUpdatingListOrder(true);
    try {
      const updated = await requestSettingsOperation(SETTINGS_RPC_OPERATION.UPDATE_SHIFT_LIST_ORDER, {
        shiftListOrder: order,
      });
      useSettingsWindowStore.getState().applySnapshot(updated);
      toast.success(t("system.listOrderSaveSuccess"));
    } catch {
      toast.error(t("system.listOrderSaveError"));
    } finally {
      setIsUpdatingListOrder(false);
    }
  }

  return (
    <>
      <div className="rounded-card border border-border bg-surface-raised p-4 shadow-card">
        <Label htmlFor="settings-locale">{t("system.localeLabel")}</Label>
        <Select
          value={snapshot.locale}
          onValueChange={(locale) => void updateRegionalSettings(locale, snapshot.currency)}
        >
          <SelectTrigger
            id="settings-locale"
            data-testid="locale-select-trigger"
            className="mt-2.5 w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LOCALES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2.5 text-xs leading-relaxed text-text-dim">{t("system.localeHelp")}</p>
      </div>

      <div className="rounded-card border border-border bg-surface-raised p-4 shadow-card">
        <Label htmlFor="settings-currency">{t("system.currencyLabel")}</Label>
        <Select
          value={snapshot.currency}
          onValueChange={(currency) => void updateRegionalSettings(snapshot.locale, currency)}
        >
          <SelectTrigger
            id="settings-currency"
            data-testid="currency-select-trigger"
            className="mt-2.5 w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_CURRENCIES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2.5 text-xs leading-relaxed text-text-dim">{t("system.currencyHelp")}</p>
      </div>

      <div className="rounded-card border border-border bg-surface-raised p-4 shadow-card">
        <Label htmlFor="settings-shift-list-order">{t("system.listOrderLabel")}</Label>
        <Select
          value={snapshot.shiftListOrder}
          onValueChange={(order) => void updateShiftListOrder(order)}
        >
          <SelectTrigger
            id="settings-shift-list-order"
            data-testid="shift-list-order-select-trigger"
            className="mt-2.5 w-full"
            disabled={isUpdatingListOrder}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SHIFT_LIST_ORDER.DESCENDING}>
              {t("system.listOrderDescending")}
            </SelectItem>
            <SelectItem value={SHIFT_LIST_ORDER.ASCENDING}>
              {t("system.listOrderAscending")}
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-2.5 text-xs leading-relaxed text-text-dim">{t("system.listOrderHelp")}</p>
      </div>
    </>
  );
}
