import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import { I18nProvider, i18n, initI18n } from "@/i18n";
import {
  initializeSettingsWindowClient,
  wireSettingsWindowI18n,
} from "@/modules/settings/settings-window-entry";

import { SettingsApp } from "./settings-app";

import "@/styles/app.css";

const queryClient = new QueryClient();
const rootElement = document.getElementById("settings-root");

if (!rootElement) {
  throw new Error("Root element #settings-root not found");
}

const root = createRoot(rootElement);

function setSettingsWindowTitle(): Promise<void> {
  document.documentElement.lang = i18n.language;
  return getCurrentWebviewWindow().setTitle(`Bako — ${i18n.t("settings:window.title")}`);
}

async function bootstrap() {
  await initI18n();
  const snapshot = await initializeSettingsWindowClient();
  await i18n.changeLanguage(snapshot.locale);
  wireSettingsWindowI18n(i18n);
  await setSettingsWindowTitle();
  i18n.on("languageChanged", () => {
    void setSettingsWindowTitle().catch((error: unknown) => {
      console.error("Could not update Settings window title", error);
    });
  });

  root.render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <SettingsApp />
        <Toaster theme="dark" richColors closeButton position="bottom-left" />
      </QueryClientProvider>
    </I18nProvider>,
  );
}

void bootstrap().catch((error: unknown) => {
  console.error("Settings bootstrap failed", error);
  root.render(
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-surface p-8 text-center text-danger">
      <p className="max-w-md text-sm leading-relaxed">
        {i18n.t("settings:window.bootstrapError")}
      </p>
      <Button
        variant="secondary"
        size="small"
        onClick={() => void getCurrentWebviewWindow().close()}
      >
        {i18n.t("settings:window.closeButton")}
      </Button>
    </div>,
  );
});
