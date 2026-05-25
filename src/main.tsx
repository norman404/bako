import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";

import { router } from "./app/router";
import { initDatabase } from "./shared/infrastructure/db/client";
import { useSettingsStore } from "./features/settings/store/settings-store";
import "./App.css";

const queryClient = new QueryClient();
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

const root = createRoot(rootElement);

async function bootstrap() {
  // Renderizar splash de carga minimalista ultra-premium (Midnight Obsidian + Champagne)
  root.render(
    <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0b] text-[#e8d5a8] select-none">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e8d5a8] border-t-transparent" />
        <p className="text-[11px] font-light tracking-[0.2em] uppercase text-[rgba(244,241,234,0.60)]">
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
        <RouterProvider router={router} />
        <Toaster richColors closeButton position="top-right" />
      </QueryClientProvider>
    );
  } catch (error) {
    console.error("Bootstrapping failed critically:", error);
    root.render(
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0b] text-[#bc8456] p-8 text-center select-none">
        <div className="max-w-md border border-[rgba(255,255,255,0.06)] bg-[#111113] p-6 rounded-[8px] shadow-2xl">
          <h1 className="text-lg font-bold tracking-tight mb-2">Error Crítico de Inicialización</h1>
          <p className="text-xs opacity-75 leading-relaxed text-[rgba(244,241,234,0.60)]">
            No se pudo arrancar la base de datos o el sistema de almacenamiento local. Por favor, reiniciá la aplicación.
          </p>
        </div>
      </div>
    );
  }
}

bootstrap();
