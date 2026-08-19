import { type KeyboardEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { SETTINGS_WINDOW_ENTRIES } from "@/app/settings-window-registry";
import { selectSettingsWindowSections } from "@/app/settings-window-sections";
import { Button } from "@/components/ui/button";
import { APP_VERSION } from "@/lib/app-version";
import { IS_MAC } from "@/lib/platform";
import { useSettingsWindowStore } from "@/modules/settings/settings-window-entry";

export function SettingsWindowApp() {
  const { t } = useTranslation("settings");
  const flags = useSettingsWindowStore((state) => state.snapshot?.flags);
  const [selectedEntryId, setSelectedEntryId] = useState("general");
  const entries = selectSettingsWindowSections(SETTINGS_WINDOW_ENTRIES, flags);
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
          className={`flex h-14 items-center ${IS_MAC ? "pl-20 pr-3" : "px-3"}`}
          data-tauri-drag-region
        >
          <nav
            role="tablist"
            aria-label={t("window.sectionsAriaLabel")}
            aria-orientation="horizontal"
            className="scrollbar-none mx-auto flex max-w-full items-center gap-1 overflow-x-auto"
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
                    "h-8 shrink-0 gap-2 rounded-card px-3 text-2xs normal-case tracking-normal",
                    isActive
                      ? "bg-primary/20 text-primary-strong hover:bg-primary/25 hover:text-primary-strong"
                      : "text-text-dim hover:bg-surface-raised hover:text-text",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(entry.labelKey)}
                </Button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto w-full max-w-4xl">
          {activeEntry ? (
            <section
              id={`settings-panel-${activeEntry.id}`}
              role="tabpanel"
              aria-labelledby={`settings-tab-${activeEntry.id}`}
            >
              <div className="mb-5 border-b border-border-strong pb-3">
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

      <footer className="flex h-7 shrink-0 items-center border-t border-border bg-surface px-6">
        <span className="font-mono-tabular text-2xs text-text-dim">Bako {APP_VERSION}</span>
      </footer>
    </div>
  );
}
