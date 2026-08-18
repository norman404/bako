import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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

export function FeatureFlagsPanel() {
  const { t } = useTranslation("settings");
  const flags = useSettingsWindowStore((state) => state.snapshot?.flags);
  const [pendingKey, setPendingKey] = useState<SettingsFeatureFlagKey | null>(null);

  if (!flags) return null;

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
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-surface-sunken/30">
        {MODULES.map((module, moduleIndex) => (
          <div key={module.id}>
            <div className={moduleIndex > 0 ? "border-t border-border" : ""}>
              <div className="px-5 pb-1 pt-4">
                <h3 className="text-sm font-semibold text-text">
                  {t(`featureFlags.modules.${module.id}.name`)}
                </h3>
                <p className="mt-0.5 text-xs text-text-dim">
                  {t(`featureFlags.modules.${module.id}.description`)}
                </p>
              </div>
            </div>

            {module.flags.map((flag) => (
              <div key={flag} className="px-5">
                <div className="flex items-center justify-between border-b border-border py-3">
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
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
