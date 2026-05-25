import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";

import { App } from "./app/App";
import { initDatabase } from "./shared/db/client";
import { useSettingsStore } from "./modules/settings/store/settings-store";
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
          Inicializando Bako POS...
        </p>
      </div>
    </div>
  );

  try {
    // 1. Inicializar SQLite
    await initDatabase();
    
    // 2. Hidratar Store de Zustand desde SQLite
    await useSettingsStore.getState().initializeSettings();
    
    // 3. Montar aplicación real
    root.render(
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster richColors closeButton position="top-right" />
      </QueryClientProvider>
    );
  } catch (error) {
    console.error("Bootstrapping failed critically:", error);
    root.render(
      <div className="flex h-screen w-screen items-center justify-center bg-obsidian text-danger p-8 text-center select-none">
        <div className="max-w-md border border-hairline bg-obsidian-raised p-6 rounded-[8px] shadow-2xl">
          <h1 className="text-lg font-bold tracking-tight mb-2">Error Crítico de Inicialización</h1>
          <p className="text-xs opacity-75 leading-relaxed text-ink-muted">
            No se pudo arrancar la base de datos o el sistema de almacenamiento local. Por favor, reiniciá la aplicación.
          </p>
        </div>
      </div>
    );
  }
}

bootstrap();
