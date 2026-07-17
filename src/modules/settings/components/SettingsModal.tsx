import { X, Globe, Flag, Printer, Download, type LucideIcon } from "lucide-react";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";

import type { ModuleManifest } from "@/modules/settings/domain/module-manifest";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";
import { SystemSettingsPanel } from "./SystemSettingsPanel";
import { PrinterSettingsPanel } from "./PrinterSettingsPanel";
import { FeatureFlagsPanel } from "./FeatureFlagsPanel";
import { UpdateSettingsPanel } from "@/modules/updater/components/UpdateSettingsPanel";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  registry: ModuleManifest[];
}

interface SettingsTabDefinition {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  Panel: React.ComponentType;
}

interface TabGroup {
  label: string;
  tabs: SettingsTabDefinition[];
}

function SettingsModal({ open, onClose, registry }: SettingsModalProps) {
  const { t } = useTranslation('settings');
  const { flags } = useFeatureFlagsStore();

  const moduleTabs: SettingsTabDefinition[] = registry
    .filter((manifest) => {
      if (!manifest.settingsPanel) return false;
      if (manifest.flagKey && !flags[manifest.flagKey]) return false;
      // Updater is now in the general group
      if (manifest.id === "updater") return false;
      return true;
    })
    .map((manifest) => ({
      id: manifest.id,
      title: manifest.settingsLabelKey
        ? t(manifest.settingsLabelKey)
        : (manifest.settingsLabel ?? manifest.id),
      description: manifest.settingsDescriptionKey
        ? t(manifest.settingsDescriptionKey)
        : undefined,
      icon: manifest.settingsIcon ?? Globe,
      Panel: manifest.settingsPanel!,
    }));

  const generalTabs: SettingsTabDefinition[] = [
    { id: "general", title: t('sections.general'), description: t('sections.generalDesc'), icon: Globe, Panel: SystemSettingsPanel },
    { id: "printer", title: t('sections.printer'), description: t('sections.printerDesc'), icon: Printer, Panel: PrinterSettingsPanel },
    { id: "features", title: t('sections.features'), description: t('sections.featuresDesc'), icon: Flag, Panel: FeatureFlagsPanel },
    { id: "updater", title: t('sections.updater'), description: t('sections.updaterDesc'), icon: Download, Panel: UpdateSettingsPanel },
  ];

  const sidebarGroups: TabGroup[] = [
    { label: t('sidebar.general'), tabs: generalTabs },
  ];

  if (moduleTabs.length > 0) {
    sidebarGroups.push({ label: t('sidebar.modules'), tabs: moduleTabs });
  }

  const allTabs = [...generalTabs, ...moduleTabs];
  const [activeSection, setActiveSection] = useState<string>(allTabs[0]?.id ?? "general");
  const activeTab = allTabs.find((tab) => tab.id === activeSection);

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim/70 backdrop-blur-sm transition-opacity duration-200 data-[state=open]:animate-fade-in" />

        <Dialog.Content aria-describedby={undefined} className="fixed left-[50%] top-[50%] z-50 w-full max-w-6xl h-[94vh] translate-x-[-50%] translate-y-[-50%] rounded-modal modal-shell-solid transition-all duration-200 focus:outline-none text-text grid grid-rows-[auto_1fr] overflow-hidden data-[state=open]:animate-modal-in">

          {/* Modal header */}
          <header className="flex items-center justify-between border-b border-border px-5 py-3">
            <Dialog.Title className="text-base font-semibold text-text">
              {t('modal.title')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('modal.closeAriaLabel')}
              >
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </header>

          {/* Two-column layout */}
          <div className="grid grid-cols-[240px_1fr] min-h-0 overflow-hidden">

            {/* Sidebar */}
            <nav
              role="tablist"
              aria-label={t('modal.sectionsAriaLabel')}
              aria-orientation="vertical"
              className="flex flex-col border-r border-border py-2 overflow-y-auto"
            >
              {sidebarGroups.map((group, groupIndex) => (
                <div key={group.label} className={groupIndex > 0 ? "mt-3" : ""}>
                  <h3 className="px-4 pt-2 pb-1 text-2xs font-medium uppercase tracking-wider text-text-dim">
                    {group.label}
                  </h3>

                  {group.tabs.map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = activeSection === tab.id;

                    return (
                      <Button
                        key={tab.id}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`settings-panel-${tab.id}`}
                        id={`settings-tab-${tab.id}`}
                        onClick={() => setActiveSection(tab.id)}
                        variant="ghost"
                        className={[
                          "w-full justify-start gap-2.5 rounded-none px-4 py-1.5",
                          isActive
                            ? "bg-primary/10 text-primary-strong font-medium"
                            : "text-text-dim hover:bg-surface-sunken hover:text-text",
                        ].join(" ")}
                      >
                        <TabIcon className="h-4 w-4 shrink-0 text-text-dim" />
                        <span className="text-xs">{tab.title}</span>
                      </Button>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Content area */}
            <section
              id={`settings-panel-${activeSection}`}
              role="tabpanel"
              aria-labelledby={`settings-tab-${activeSection}`}
              className="min-h-0 overflow-hidden"
            >
              <div className="scrollbar-thin h-full overflow-y-auto">
                {activeTab && <activeTab.Panel />}
              </div>
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { SettingsModal };
