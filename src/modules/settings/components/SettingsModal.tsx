import { X, Globe, Flag, type LucideIcon } from "lucide-react";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";

import type { ModuleManifest } from "@/modules/settings/domain/module-manifest";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";
import { SystemSettingsPanel } from "./SystemSettingsPanel";
import { FeatureFlagsPanel } from "./FeatureFlagsPanel";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  registry: ModuleManifest[];
}

interface SettingsTabDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  Panel: React.ComponentType;
}

function SettingsModal({ open, onClose, registry }: SettingsModalProps) {
  const { t } = useTranslation('settings');
  const { flags } = useFeatureFlagsStore();

  // Build tabs from registry: only modules with settingsPanel, filtered by flagKey
  const moduleTabs: SettingsTabDefinition[] = registry
    .filter((manifest) => {
      // Must have a settingsPanel to appear as a tab
      if (!manifest.settingsPanel) return false;
      // If it has a flagKey, only show if the flag is enabled
      if (manifest.flagKey && !flags[manifest.flagKey]) return false;
      return true;
    })
    .map((manifest) => ({
      id: manifest.id,
      label: manifest.settingsLabelKey
        ? t(manifest.settingsLabelKey)
        : (manifest.settingsLabel ?? manifest.id),
      icon: manifest.settingsIcon ?? Globe,
      Panel: manifest.settingsPanel!,
    }));

  // Add system tabs (hardcoded, not from registry)
  const systemTabs: SettingsTabDefinition[] = [
    { id: "system", label: t('sections.system'), icon: Globe, Panel: SystemSettingsPanel },
    { id: "features", label: t('sections.features'), icon: Flag, Panel: FeatureFlagsPanel },
  ];

  const allTabs = [...moduleTabs, ...systemTabs];

  const [activeSection, setActiveSection] = useState<string>(allTabs[0]?.id ?? "system");

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        {/* Overlay con blur y oscurecimiento del fondo */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim/70 backdrop-blur-sm transition-opacity duration-200 data-[state=open]:animate-fade-in" />

        {/* Contenedor del modal */}
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-6xl h-[94vh] translate-x-[-50%] translate-y-[-50%] rounded-modal modal-shell-solid transition-all duration-200 focus:outline-none text-text grid grid-rows-[auto_1fr] overflow-hidden data-[state=open]:animate-modal-in">

          <header className="flex items-center justify-between border-b border-border-strong px-4 py-2.5 sm:px-5">
            <Dialog.Title className="font-display text-xl text-primary-strong">{t('modal.title')}</Dialog.Title>

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

          {/* Two-column layout: sidebar + content */}
          <div className="grid grid-cols-[200px_1fr] min-h-0 overflow-hidden">

            {/* Left sidebar nav */}
            <nav
              role="tablist"
              aria-label={t('modal.sectionsAriaLabel')}
              aria-orientation="vertical"
              className="flex flex-col gap-0.5 border-r border-border p-2 overflow-y-auto"
            >
              {allTabs.map((tab) => {
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
                      "w-full min-h-[44px] justify-start gap-2.5 rounded-sharp border-l-2 px-3 py-2.5",
                      isActive
                        ? "border-primary bg-primary/10 text-primary-strong hover:bg-primary/10 hover:text-primary-strong"
                        : "border-transparent text-text-muted hover:bg-surface-sunken hover:text-text",
                    ].join(" ")}
                  >
                    <TabIcon
                      className={[
                        "h-4 w-4 shrink-0 transition-colors duration-200",
                        isActive ? "text-primary-strong" : "text-text-dim",
                      ].join(" ")}
                    />
                    <span className="text-xs font-medium tracking-[0.01em]">
                      {tab.label}
                    </span>
                  </Button>
                );
              })}
            </nav>

            {/* Content panel */}
            <section
              id={`settings-panel-${activeSection}`}
              role="tabpanel"
              aria-labelledby={`settings-tab-${activeSection}`}
              className="min-h-0 overflow-hidden"
            >
              <div className="scrollbar-thin h-full overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
                {(() => {
                  const activeTab = allTabs.find((tab) => tab.id === activeSection);
                  if (!activeTab) return null;
                  const ActivePanel = activeTab.Panel;
                  return <ActivePanel />;
                })()}
              </div>
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { SettingsModal };
