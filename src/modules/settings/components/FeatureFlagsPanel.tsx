import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";
import { useUpdateFeatureFlag } from "@/modules/feature-flags/hooks/use-update-feature-flag";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { FeatureFlagKey } from "@/modules/feature-flags/domain/feature-flag";

interface ModuleConfig {
  id: string;
  flags: FeatureFlagKey[];
}

const MODULES: ModuleConfig[] = [
  {
    id: "menu",
    flags: ["categories_enabled", "multiple_menus_enabled"],
  },
  {
    id: "delivery",
    flags: ["delivery_enabled"],
  },
  {
    id: "shift",
    flags: ["shift_management_enabled"],
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
    <div className="grid min-h-full grid-rows-[auto_1fr] gap-3">
      <header className="flex flex-col gap-1 border-b border-hairline pb-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">{t("featureFlags.title")}</h2>
        <p className="text-[13px] text-ink-muted">{t("featureFlags.description")}</p>
      </header>

      <div className="mt-2.5 max-w-lg">
        <div className="grid gap-6">
          {MODULES.map((module) => (
            <section key={module.id} className="grid gap-3">
              <div className="grid gap-0.5">
                <h3 className="text-[14px] font-semibold text-ink">
                  {t(`featureFlags.modules.${module.id}.name`)}
                </h3>
                <p className="text-[12px] text-ink-muted">
                  {t(`featureFlags.modules.${module.id}.description`)}
                </p>
              </div>

              <div className="grid gap-2">
                {module.flags.map((flag) => (
                  <div
                    key={flag}
                    className="flex items-center justify-between rounded-card border border-hairline bg-obsidian-elevated p-4"
                  >
                    <div className="grid gap-1">
                      <Label
                        htmlFor={`flag-${flag}`}
                        className="cursor-pointer text-[13px] font-medium text-ink"
                      >
                        {t(`featureFlags.flags.${flag}.label`)}
                      </Label>
                      <p className="text-[11px] text-ink-muted">
                        {t(`featureFlags.flags.${flag}.description`)}
                      </p>
                    </div>
                    <Checkbox
                      id={`flag-${flag}`}
                      aria-label={t(`featureFlags.flags.${flag}.label`)}
                      checked={flags[flag]}
                      onCheckedChange={() => handleToggle(flag, flags[flag])}
                      disabled={updateMutation.isPending}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
