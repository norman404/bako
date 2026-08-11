import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useFeatureFlagsStore, useUpdateFeatureFlag, type FeatureFlagKey } from "@/modules/feature-flags";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ModuleConfig {
  id: string;
  flags: FeatureFlagKey[];
}

const MODULES: ModuleConfig[] = [
  {
    id: "menu",
    flags: ["categories_enabled", "multiple_menus_enabled", "modifier_groups_enabled"],
  },
  {
    id: "delivery",
    flags: ["delivery_enabled"],
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
  const { flags } = useFeatureFlagsStore();
  const updateMutation = useUpdateFeatureFlag();

  function handleToggle(key: FeatureFlagKey, currentValue: boolean) {
    const newValue = !currentValue;
    updateMutation.mutate(
      { key, value: newValue },
      {
        onSuccess: () => {
          toast.success(t("featureFlags.updateSuccess"), {
            description: t(`featureFlags.flags.${key}.updated`, { value: newValue }),
          });
        },
        onError: () => {
          toast.error(t("featureFlags.updateError"));
        },
      },
    );
  }

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-xl rounded-lg border border-border bg-surface-sunken/30 overflow-hidden">
      {MODULES.map((module, moduleIndex) => (
        <div key={module.id}>
          {/* Module section title */}
          <div className={moduleIndex > 0 ? "border-t border-border" : ""}>
            <div className="px-5 pt-4 pb-1">
              <h3 className="text-sm font-semibold text-text">
                {t(`featureFlags.modules.${module.id}.name`)}
              </h3>
              <p className="text-xs text-text-dim mt-0.5">
                {t(`featureFlags.modules.${module.id}.description`)}
              </p>
            </div>
          </div>

          {/* Flag rows */}
          {module.flags.map((flag) => (
            <div key={flag} className="px-5">
              <div className="flex items-center justify-between py-3 border-b border-border">
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
                  onCheckedChange={() => handleToggle(flag, flags[flag])}
                  disabled={updateMutation.isPending}
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
