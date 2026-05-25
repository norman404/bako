# Technical Design: Visual and Currency Upgrade

## 1. Esquema de Base de Datos (Drizzle ORM)
Para persistir la configuración de manera robusta y con tipado estático, definimos una tabla única de fila única llamada `system_settings` en `src/shared/infrastructure/db/schema.ts` utilizando una clave de texto fija con valor `'current'` para obligar a que exista un único registro en la base de datos local SQLite:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const systemSettings = sqliteTable('system_settings', {
  id: text('id').primaryKey().$defaultFn(() => 'current'),
  locale: text('locale').notNull().default('es-MX'),
  currency: text('currency').notNull().default('MXN'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export type SystemSettings = typeof systemSettings.$inferSelect;
export type NewSystemSettings = typeof systemSettings.$inferInsert;
```

---

## 2. Firma del Store de Zustand
El store reactivo maneja la caché en memoria para accesos síncronos veloces y centraliza las llamadas de escritura asíncronas en SQLite:

```typescript
// src/features/settings/store/settings-store.ts
import { create } from 'zustand';
import { getSqlClient } from '@/shared/infrastructure/db/client';
import { DEFAULT_CURRENCY_CONFIG } from '@/shared/lib/currency-config';

interface SettingsState {
  locale: string;
  currency: string;
  isLoading: boolean;
  initializeSettings: () => Promise<void>;
  updateSettings: (locale: string, currency: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  locale: DEFAULT_CURRENCY_CONFIG.locale,
  currency: DEFAULT_CURRENCY_CONFIG.currency,
  isLoading: true,

  initializeSettings: async () => {
    try {
      const db = await getSqlClient();
      if (!db) {
        set({ isLoading: false });
        return;
      }
      
      // Consultar si ya existe el registro único de configuración
      const result = await db.select().from(systemSettings).where(eq(systemSettings.id, 'current')).limit(1);
      
      if (result.length === 0) {
        // Sembrar valores por defecto si la base de datos está vacía
        await db.insert(systemSettings).values({
          id: 'current',
          locale: DEFAULT_CURRENCY_CONFIG.locale,
          currency: DEFAULT_CURRENCY_CONFIG.currency
        });
        set({ ...DEFAULT_CURRENCY_CONFIG, isLoading: false });
      } else {
        set({
          locale: result[0].locale,
          currency: result[0].currency,
          isLoading: false
        });
      }
    } catch (error) {
      console.warn("Tauri IPC SQLite not available. Activating Vitest/Node fallback.", error);
      set({ isLoading: false }); // Fallback activo por defecto
    }
  }),

  updateSettings: async (locale: string, currency: string) => {
    set({ isLoading: true });
    try {
      const db = await getSqlClient();
      if (db) {
        await db.insert(systemSettings)
          .values({ id: 'current', locale, currency, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: systemSettings.id,
            set: { locale, currency, updatedAt: new Date() }
          });
      }
      set({ locale, currency, isLoading: false });
    } catch (error) {
      console.error("Failed to persist settings in SQLite", error);
      set({ locale, currency, isLoading: false });
    }
  }
}));
```

---

## 3. Helpers de Formato de Moneda y Ordenamiento (Intl)
Para evitar dependencias circulares y asegurar una velocidad de renderizado óptima (menos de 0.1ms por llamada), `formatPosCurrency` lee el store de Zustand de manera síncrona mediante `getState()` y utiliza una caché interna de formateadores `Intl.NumberFormat` indexados por combinación de clave `locale-currency`:

```typescript
// src/shared/lib/currency-config.ts
export const DEFAULT_CURRENCY_CONFIG = {
  locale: 'es-MX',
  currency: 'MXN'
};

// src/shared/lib/currency.ts
import { useSettingsStore } from '@/features/settings/store/settings-store';

const formatterCache = new Map<string, Intl.NumberFormat>();

const getFormatter = (locale: string, currency: string) => {
  const cacheKey = `${locale}-${currency}`;
  if (!formatterCache.has(cacheKey)) {
    formatterCache.set(cacheKey, new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }));
  }
  return formatterCache.get(cacheKey)!;
};

export const formatPosCurrency = (cents: number): string => {
  // Convertir centavos de DB a flotante
  const amount = cents / 100;
  const { locale, currency } = useSettingsStore.getState();
  return getFormatter(locale, currency).format(amount);
};

export const sortStrings = (strings: string[]): string[] => {
  const { locale } = useSettingsStore.getState();
  return [...strings].sort((a, b) => a.localeCompare(b, locale, { sensitivity: 'base' }));
};
```

---

## 4. Control de Flujo de Inicialización (Bootstrap en `main.tsx`)
Para impedir parpadeos de interfaz (*flickering*) al levantar el POS, estructuramos un arranque bloqueante que espera la conexión y la carga del store de Zustand antes de montar la app de React en el DOM:

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initDatabase } from '@/shared/infrastructure/db/client';
import { useSettingsStore } from '@/features/settings/store/settings-store';
import './index.css';

async function bootstrap() {
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  
  // Renderizar splash de carga minimalista estilizado
  root.render(
    <div className="flex h-screen w-screen items-center justify-center bg-[#0d0d0d] text-[#eedcb3]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#eedcb3] border-t-transparent" />
        <p className="text-sm font-light tracking-widest uppercase">Inicializando Bako POS...</p>
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
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Bootstrapping failed critically:", error);
    root.render(
      <div className="flex h-screen w-screen items-center justify-center bg-[#0d0d0d] text-red-500 p-8 text-center">
        <div>
          <h1 className="text-xl font-bold mb-2">Error Crítico de Inicialización</h1>
          <p className="text-sm opacity-70">No se pudo arrancar la base de datos o el sistema de almacenamiento local.</p>
        </div>
      </div>
    );
  }
}

bootstrap();
```

---

## 5. Estructura de Modales con Radix/Shadcn Dialog
La UI se refactoriza abandonando modales manuales para aprovechar las primitivas estandarizadas de Radix. Los estilos de la estética Midnight Obsidian se aplican mediante tokens y clases CSS transparentes y estilizadas:

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export const SettingsModal = () => {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="px-4 py-2 bg-champagne text-obsidian rounded-sharp hover:opacity-90 transition-opacity">
          Configuración
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        {/* Overlay con blur y oscurecimiento del fondo */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md transition-opacity duration-200" />
        
        {/* Contenedor del Modal Glassmorphic Obsidian */}
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-sharp border border-white/5 bg-obsidian/75 p-6 shadow-2xl backdrop-blur-md transition-all duration-200 focus:outline-none text-[#eedcb3]">
          
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <Dialog.Title className="text-lg font-semibold tracking-wide uppercase">
              Configuración del Sistema
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-full p-1.5 hover:bg-white/5 transition-colors focus:outline-none">
                <X className="h-4 w-4 text-champagne" />
              </button>
            </Dialog.Close>
          </div>

          <div className="py-6">
            {/* Aquí se inyectan las pestañas y el SystemSettingsPanel */}
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
```
