import { Flag, Globe, HardDrive, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  getVisibleNavigationEntries,
  NAVIGATION_GROUP,
  NAVIGATION_SURFACE,
  type ModuleManifest,
  type ModuleNavigationEntry,
} from "@/app/module-manifest";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useFeatureFlagsStore } from "@/modules/feature-flags";

import { FeatureFlagsPanel } from "./FeatureFlagsPanel";
import { GeneralSettingsPanel } from "./general-settings-panel";
import { SystemSettingsPanel } from "./SystemSettingsPanel";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  registry: ModuleManifest[];
}

const STATIC_SETTINGS_ENTRIES: ModuleNavigationEntry[] = [
  {
    id: "general",
    surface: NAVIGATION_SURFACE.SETTINGS,
    group: NAVIGATION_GROUP.GENERAL,
    order: 10,
    labelKey: "settings:sections.general",
    descriptionKey: "settings:sections.generalDesc",
    icon: Globe,
    Component: GeneralSettingsPanel,
  },
  {
    id: "features",
    surface: NAVIGATION_SURFACE.SETTINGS,
    group: NAVIGATION_GROUP.FEATURES,
    order: 10,
    labelKey: "settings:sections.features",
    descriptionKey: "settings:sections.featuresDesc",
    icon: Flag,
    Component: FeatureFlagsPanel,
  },
  {
    id: "database",
    surface: NAVIGATION_SURFACE.SETTINGS,
    group: NAVIGATION_GROUP.SYSTEM,
    order: 10,
    labelKey: "settings:database.title",
    descriptionKey: "settings:database.description",
    icon: HardDrive,
    Component: SystemSettingsPanel,
  },
];

const SETTINGS_GROUPS = [
  { id: NAVIGATION_GROUP.GENERAL, labelKey: "sidebar.general" },
  { id: NAVIGATION_GROUP.PRINTING, labelKey: "sidebar.printing" },
  { id: NAVIGATION_GROUP.FEATURES, labelKey: "sidebar.features" },
  { id: NAVIGATION_GROUP.SYSTEM, labelKey: "sidebar.system" },
] as const;

function SettingsModal({ open, onClose, registry }: SettingsModalProps) {
  const { t } = useTranslation("settings");
  const { flags } = useFeatureFlagsStore();
  const moduleEntries = getVisibleNavigationEntries(registry, NAVIGATION_SURFACE.SETTINGS, flags);
  const entries = [...STATIC_SETTINGS_ENTRIES, ...moduleEntries].sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id),
  );
  const [selectedEntryId, setSelectedEntryId] = useState("general");
  const activeEntry = entries.find((entry) => entry.id === selectedEntryId) ?? entries[0];
  const ActivePanel = activeEntry?.Component;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        aria-describedby={undefined}
        className="grid h-[94vh] max-w-6xl grid-rows-[auto_1fr] text-text transition-all focus:outline-none"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <DialogTitle className="text-base font-semibold text-text">
            {t("modal.title")}
          </DialogTitle>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("modal.closeAriaLabel")}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </header>

        <div className="grid min-h-0 grid-cols-[240px_1fr] overflow-hidden">
          <nav
            role="tablist"
            aria-label={t("modal.sectionsAriaLabel")}
            aria-orientation="vertical"
            className="flex flex-col overflow-y-auto border-r border-border py-2"
          >
            {SETTINGS_GROUPS.map((group, groupIndex) => {
              const groupEntries = entries.filter((entry) => entry.group === group.id);

              if (groupEntries.length === 0) return null;

              return (
                <div key={group.id} className={groupIndex > 0 ? "mt-3" : ""}>
                  <h3 className="px-4 pb-1 pt-2 text-2xs font-medium uppercase tracking-wider text-text-dim">
                    {t(group.labelKey)}
                  </h3>
                  {groupEntries.map((entry) => {
                    const Icon = entry.icon;
                    const isActive = activeEntry?.id === entry.id;

                    return (
                      <Button
                        key={entry.id}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`settings-panel-${entry.id}`}
                        id={`settings-tab-${entry.id}`}
                        onClick={() => setSelectedEntryId(entry.id)}
                        variant="ghost"
                        className={[
                          "w-full justify-start gap-2.5 rounded-none px-4 py-1.5",
                          isActive
                            ? "bg-primary/10 font-medium text-primary-strong"
                            : "text-text-dim hover:bg-surface-sunken hover:text-text",
                        ].join(" ")}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-text-dim" />
                        <span className="text-xs">{t(entry.labelKey)}</span>
                      </Button>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          <section
            id={`settings-panel-${activeEntry?.id ?? "empty"}`}
            role="tabpanel"
            aria-labelledby={`settings-tab-${activeEntry?.id ?? "empty"}`}
            className="min-h-0 overflow-hidden"
          >
            <div className="scrollbar-thin h-full overflow-y-auto">
              {ActivePanel ? <ActivePanel /> : null}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { SettingsModal };
