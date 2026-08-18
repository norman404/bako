import { X } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

import { type ModuleNavigationEntry, NAVIGATION_GROUP } from "@/app/module-manifest";
import { SETTINGS_WINDOW_ENTRIES } from "@/app/settings-window-registry";
import { Button } from "@/components/ui/button";
import { IS_MAC } from "@/lib/platform";
import { useSettingsWindowStore } from "@/modules/settings/settings-window-entry";

const SETTINGS_GROUP_ORDER = [
  NAVIGATION_GROUP.GENERAL,
  NAVIGATION_GROUP.PRINTING,
  NAVIGATION_GROUP.FEATURES,
  NAVIGATION_GROUP.SYSTEM,
] as const;

function groupOrder(group: ModuleNavigationEntry["group"]): number {
  const index = SETTINGS_GROUP_ORDER.indexOf(group as (typeof SETTINGS_GROUP_ORDER)[number]);
  return index === -1 ? SETTINGS_GROUP_ORDER.length : index;
}

export function SettingsWindowApp() {
  const { t } = useTranslation("settings");
  const flags = useSettingsWindowStore((state) => state.snapshot?.flags);
  const [selectedEntryId, setSelectedEntryId] = useState("general");
  const entries = SETTINGS_WINDOW_ENTRIES
    .filter((entry) => !entry.flagKey || flags?.[entry.flagKey])
    .sort(
      (left, right) =>
        groupOrder(left.group) - groupOrder(right.group) ||
        left.order - right.order ||
        left.id.localeCompare(right.id),
    );
  const activeEntry = entries.find((entry) => entry.id === selectedEntryId) ?? entries[0];
  const ActivePanel = activeEntry?.Component;

  function selectEntryAt(index: number) {
    const entry = entries[index];
    if (!entry) return;

    setSelectedEntryId(entry.id);
    document.getElementById(`settings-tab-${entry.id}`)?.focus();
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const nextIndex =
      event.key === "ArrowRight"
        ? (index + 1) % entries.length
        : event.key === "ArrowLeft"
          ? (index - 1 + entries.length) % entries.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? entries.length - 1
              : null;

    if (nextIndex === null) return;

    event.preventDefault();
    selectEntryAt(nextIndex);
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface text-text">
      <header className="border-b border-border bg-surface select-none" data-tauri-drag-region>
        <div
          className={`relative flex h-11 items-center ${IS_MAC ? "pl-20 pr-3" : "px-3"}`}
          data-tauri-drag-region
        >
          <nav
            role="tablist"
            aria-label={t("window.sectionsAriaLabel")}
            aria-orientation="horizontal"
            className="scrollbar-none mx-auto flex max-w-[calc(100%-3rem)] items-center gap-1 overflow-x-auto rounded-card border border-border bg-surface-sunken/50 p-1"
          >
            {entries.map((entry, index) => {
              const Icon = entry.icon;
              const isActive = activeEntry?.id === entry.id;

              return (
                <Button
                  key={entry.id}
                  id={`settings-tab-${entry.id}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`settings-panel-${entry.id}`}
                  tabIndex={isActive ? 0 : -1}
                  variant="ghost"
                  onClick={() => setSelectedEntryId(entry.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={[
                    "h-7 shrink-0 gap-1.5 rounded-card px-2.5 text-2xs normal-case tracking-normal",
                    isActive
                      ? "bg-primary text-on-primary hover:bg-primary-strong"
                      : "text-text-muted hover:bg-surface-raised hover:text-text",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(entry.labelKey)}
                </Button>
              );
            })}
          </nav>

          <Button
            variant="ghost"
            size="icon"
            aria-label={t("window.closeAriaLabel")}
            onClick={() => void getCurrentWebviewWindow().close()}
            className="absolute right-3 h-7 w-7 rounded-card text-text-muted hover:bg-surface-sunken hover:text-text"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          {activeEntry ? (
            <section
              id={`settings-panel-${activeEntry.id}`}
              role="tabpanel"
              aria-labelledby={`settings-tab-${activeEntry.id}`}
            >
              <div className="mb-6 max-w-xl">
                <h1 className="font-display text-lg text-primary-strong">{t(activeEntry.labelKey)}</h1>
                {activeEntry.descriptionKey ? (
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    {t(activeEntry.descriptionKey)}
                  </p>
                ) : null}
              </div>
              {ActivePanel ? <ActivePanel /> : null}
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
