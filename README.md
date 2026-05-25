# Bako

Aplicación de punto de venta de escritorio para cafetería, migrada desde `n4/apps/coffePOS` a un proyecto independiente en **Tauri + React 19 + TypeScript**.
La interfaz corre en Vite y persiste datos localmente en **SQLite** mediante `@tauri-apps/plugin-sql` y **Drizzle ORM**.

## Qué hace hoy

- Navegación de categorías de menú.
- Grilla de productos con detalle visual y precio.
- Carrito con aumento/disminución de cantidades.
- Checkout con pago en efectivo o tarjeta.
- Gestión de clientes para delivery.
- Configuración de productos y categorías.
- Resumen de turno.
- Persistencia local inicializada al arrancar la app.

## Stack

- **Frontend:** React 19, TypeScript, Vite 7
- **UI:** Tailwind CSS 4, componentes locales en `src/shared/components/ui`
- **Estado y datos:** TanStack Query, Zustand, neverthrow
- **Tiempo / utilidades:** dayjs, lucide-react, clsx, tailwind-merge
- **Desktop:** Tauri 2
- **Base local:** SQLite vía `@tauri-apps/plugin-sql`
- **ORM:** Drizzle ORM + drizzle-kit
- **Tests:** Vitest + Testing Library

## Estructura

```txt
src/
├── app/
├── features/
│   ├── checkout/
│   ├── menu/
│   ├── order/
│   ├── pos/
│   ├── settings/
│   └── turno/
├── shared/
└── main.tsx

src-tauri/
├── migrations/
├── src/
├── Cargo.toml
└── tauri.conf.json
```

## Base de datos local

La app usa una base SQLite local llamada `bako.db`.
La inicialización ocurre en `src/shared/infrastructure/db/client.ts`.

## Scripts

```bash
pnpm install
pnpm dev
pnpm test
pnpm test:dom
pnpm tauri dev
```

## Notas

- Se migró el código funcional desde `n4/apps/coffePOS`.
- Se adaptó el bootstrap y los puntos necesarios de `Preact` a `React`.
- El checkout sigue siendo local; no integra pasarela de pago real.
