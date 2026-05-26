import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";

import { App } from "./app/App";
import { initDatabase } from "./shared/db/client";
import { useSettingsStore } from "./modules/settings/store/settings-store";
import { initI18n, I18nProvider, i18n } from "./shared/i18n";
import { wireI18nWithSettings } from "./shared/i18n/sync-with-settings";
import "./styles/app.css";

const queryClient = new QueryClient();
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

const root = createRoot(rootElement);

async function bootstrap() {
  // Renderizar splash de carga minimalista ultra-premium (Midnight Obsidian + Champagne)
  root.render(
    <div className="flex h-screen w-screen items-center justify-center bg-obsidian text-champagne select-none">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-champagne border-t-transparent" />
        <p className="text-[11px] font-light tracking-[0.2em] uppercase text-ink-muted">
          {i18n.t('app:splash.loading')}
        </p>
      </div>
    </div>
  );

  try {
    // 1. Inicializar SQLite
    await initDatabase();
    
    // 2. Hidratar Store de Zustand desde SQLite
    await useSettingsStore.getState().initializeSettings();
    
    // 3. Inicializar i18n con el locale del store
    const currentLocale = useSettingsStore.getState().locale;
    await initI18n({ lng: currentLocale });
    
    // 4. Conectar i18n con cambios de settings
    wireI18nWithSettings(i18n);
    
    // 5. Montar aplicación real
    root.render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <App />
          <Toaster richColors closeButton position="top-right" />
        </QueryClientProvider>
      </I18nProvider>
    );
  } catch (error) {
    console.error("Bootstrapping failed critically:", error);
    root.render(
      <div className="flex h-screen w-screen items-center justify-center bg-obsidian text-danger p-8 text-center select-none">
        <div className="max-w-md border border-hairline bg-obsidian-raised p-6 rounded-[8px] shadow-2xl">
          <h1 className="text-lg font-bold tracking-tight mb-2">{i18n.t('app:error.title')}</h1>
          <p className="text-xs opacity-75 leading-relaxed text-ink-muted">
            {i18n.t('app:error.description')}
          </p>
        </div>
      </div>
    );
  }
}

bootstrap();
