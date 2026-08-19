import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { summarizeFeatureFlags } from "../lib/feature-flag-summary";
import { splitModulesIntoColumns } from "../lib/module-columns";
import { requestSettingsOperation } from "../settings-window-client";
import { SETTINGS_RPC_OPERATION } from "../settings-window-protocol";
import { useSettingsWindowStore } from "../settings-window-store";

type SettingsFeatureFlagKey = string;

interface ModuleConfig {
  id: string;
  flags: SettingsFeatureFlagKey[];
}

const MODULES: ModuleConfig[] = [
  {
    id: "menu",
    flags: ["categories_enabled", "multiple_menus_enabled", "modifier_groups_enabled"],
  },
  {
    id: "shift",
    flags: ["shift_management_enabled"],
  },
  {
    id: "printer",
    flags: ["comandas_enabled", "receipt_printing_enabled"],
  },
];

const FLAG_KEYS = MODULES.flatMap((module) => module.flags);

const MODULE_COLUMNS = splitModulesIntoColumns(MODULES).filter(
  (column) => column.modules.length > 0,
);

export function FeatureFlagsPanel() {
  const { t } = useTranslation("settings");
  const flags = useSettingsWindowStore((state) => state.snapshot?.flags);
  const [pendingKey, setPendingKey] = useState<SettingsFeatureFlagKey | null>(null);

  if (!flags) return null;

  const summary = summarizeFeatureFlags(FLAG_KEYS, flags);

  async function handleToggle(key: SettingsFeatureFlagKey) {
    const currentFlags = useSettingsWindowStore.getState().snapshot?.flags;
    if (pendingKey || !currentFlags) return;

    const value = !currentFlags[key];
    setPendingKey(key);
    try {
      const updated = await requestSettingsOperation(SETTINGS_RPC_OPERATION.UPDATE_FEATURE_FLAG, {
        key,
        value,
      });
      useSettingsWindowStore.getState().applySnapshot(updated);
      toast.success(t("featureFlags.updateSuccess"), {
        description: t(`featureFlags.flags.${key}.updated`, { value }),
      });
    } catch {
      toast.error(t("featureFlags.updateError"));
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-end justify-end gap-6">
        <span className="shrink-0 rounded-card border border-border-strong px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.16em] text-text">
          {t("featureFlags.activeCount", { count: summary.enabled, total: summary.total })}
        </span>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2">
        {MODULE_COLUMNS.map((column) => (
          <div key={column.id} className="flex flex-col gap-4">
            {column.modules.map((module) => (
              <article
                key={module.id}
                className="rounded-card border border-border bg-surface-raised p-4 shadow-card"
              >
                <div className="grid gap-0.5 pb-3">
                  <h3 className="text-sm font-semibold text-text">
                    {t(`featureFlags.modules.${module.id}.name`)}
                  </h3>
                  <p className="text-xs text-text-dim">
                    {t(`featureFlags.modules.${module.id}.description`)}
                  </p>
                </div>

                {module.flags.map((flag) => (
                  <div
                    key={flag}
                    className="flex items-center justify-between gap-4 border-t border-border py-3"
                  >
                    <div className="grid gap-0.5">
                      <Label
                        htmlFor={`flag-${flag}`}
                        className="cursor-pointer text-sm normal-case tracking-normal text-text"
                      >
                        {t(`featureFlags.flags.${flag}.label`)}
                      </Label>
                      <p className="text-xs text-text-dim">
                        {t(`featureFlags.flags.${flag}.description`)}
                      </p>
                    </div>
                    <Switch
                      id={`flag-${flag}`}
                      aria-label={t(`featureFlags.flags.${flag}.label`)}
                      checked={flags[flag]}
                      onCheckedChange={() => void handleToggle(flag)}
                      disabled={pendingKey !== null}
                    />
                  </div>
                ))}
              </article>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
