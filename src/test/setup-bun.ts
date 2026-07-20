/**
 * Preload global para `bun test` (registrado en bunfig.toml → [test].preload).
 *
 * El runner del proyecto (`scripts/run-tests.ts`) ejecuta cada spec en su
 * propio proceso para evitar que `mock.module()` se aplique globalmente entre
 * archivos. Este setup replica lo que antes hacían las configs de vitest:
 * - entorno node / happy-dom según el spec
 * - `clearMocks: true` → beforeEach + mock.clearAllMocks()
 * - jest-dom matchers + cleanup + ResizeObserver polyfill en afterEach
 *
 * ⚠️ ORDEN CRÍTICO: happy-dom debe registrarse ANTES de que se evalúe
 * @testing-library/react o @testing-library/jest-dom. Por eso RTL/jest-dom se
 * importan DINÁMICAMENTE (await import) después de GlobalRegistrator.register().
 * Un import estático se hoistea y rompe el orden.
 */
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach, beforeEach, expect, mock } from "bun:test";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

GlobalRegistrator.register();

// RTL fuera de jest/vitest exige marcar el entorno como act()-compatible.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Polyfill ResizeObserver (lo usan los componentes de Radix UI).
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: ResizeObserverMock,
});

// Imports dinámicos: recién ahora que happy-dom ya está registrado.
const matchers = await import("@testing-library/jest-dom/matchers");
expect.extend(matchers.default ?? matchers);

const { cleanup } = await import("@testing-library/react");

// Equivalente a `clearMocks: true` de las configs anteriores.
beforeEach(() => {
  mock.clearAllMocks();
});

// cleanup + restoreAllMocks después de cada test.
afterEach(() => {
  cleanup();
  mock.restore();
});
