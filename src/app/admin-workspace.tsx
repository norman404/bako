import { ArrowLeft, Settings } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  getVisibleNavigationEntries,
  NAVIGATION_GROUP,
  type ModuleManifest,
} from "@/app/module-manifest";
import { useFeatureFlagsStore } from "@/modules/feature-flags";
import { IS_MAC } from "@/lib/platform";

interface AdminWorkspaceProps {
  registry: ModuleManifest[];
  onOpenPos: () => void;
  onOpenSettings: () => void;
}

const ADMIN_GROUPS = [
  { id: NAVIGATION_GROUP.OPERATIONS, labelKey: "sidebar.operations" },
  { id: NAVIGATION_GROUP.CATALOG, labelKey: "sidebar.catalog" },
  { id: NAVIGATION_GROUP.PEOPLE, labelKey: "sidebar.people" },
] as const;

export function AdminWorkspace({ registry, onOpenPos, onOpenSettings }: AdminWorkspaceProps) {
  const { t } = useTranslation("admin");
  const { flags } = useFeatureFlagsStore();
  const entries = getVisibleNavigationEntries(registry, "admin", flags);
  const [selectedEntryId, setSelectedEntryId] = useState("dashboard");
  const activeEntry = entries.find((entry) => entry.id === selectedEntryId) ?? entries[0];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface text-text">
      <header className="border-b border-border bg-surface select-none" data-tauri-drag-region>
        <div
          className={`relative flex h-11 items-center pr-3 sm:pr-4 ${IS_MAC ? "pl-20" : "pl-4"}`}
          data-tauri-drag-region
        >
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 font-display text-base text-text">
            {t("header.title")}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="small"
              onClick={onOpenPos}
              className="h-7 gap-1.5 px-2 text-text-muted hover:bg-surface-sunken hover:text-text"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("header.pos")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSettings}
              className="h-7 w-7 rounded-card text-text-muted hover:bg-surface-sunken hover:text-text"
              aria-label={t("header.settingsAriaLabel")}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[240px_1fr] overflow-hidden">
        <nav
          role="tablist"
          aria-label={t("sidebar.ariaLabel")}
          aria-orientation="vertical"
          className="flex min-h-0 flex-col overflow-y-auto border-r border-border py-2"
        >
          {ADMIN_GROUPS.map((group, groupIndex) => {
            const groupEntries = entries.filter((entry) => entry.group === group.id);

            if (groupEntries.length === 0) return null;

            return (
              <div key={group.id} className={groupIndex > 0 ? "mt-3" : ""}>
                <h2 className="px-4 pb-1 pt-2 text-2xs font-medium uppercase tracking-wider text-text-dim">
                  {t(group.labelKey)}
                </h2>
                {groupEntries.map((entry) => {
                  const Icon = entry.icon;
                  const isActive = activeEntry?.id === entry.id;

                  return (
                    <Button
                      key={entry.id}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`admin-panel-${entry.id}`}
                      id={`admin-tab-${entry.id}`}
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
          id={`admin-panel-${activeEntry?.id ?? "empty"}`}
          role="tabpanel"
          aria-labelledby={`admin-tab-${activeEntry?.id ?? "empty"}`}
          className="min-h-0 overflow-hidden"
        >
          <div className="scrollbar-thin h-full overflow-y-auto">
            {activeEntry ? (
              <activeEntry.Component />
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-sm text-text-muted">
                {t("empty.noEntries")}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
