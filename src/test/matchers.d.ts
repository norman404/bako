/**
 * Tipos de los matchers de @testing-library/jest-dom para `bun:test`.
 * Basado en la receta oficial que el propio paquete trae en
 * node_modules/@testing-library/jest-dom/types/bun.d.ts (no expuesta en su
 * exports map, por eso se replica aquí).
 *
 * El reference explícito a @types/bun es necesario: con TypeScript 6.0 en este
 * proyecto los paquetes de node_modules/@types no entran solos al programa,
 * y sin él `import ... from "bun:test"` falla con TS2307.
 */
/// <reference types="bun" />
import type { expect } from "bun:test";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

declare module "bun:test" {
  interface Matchers<T>
    extends TestingLibraryMatchers<
      ReturnType<typeof expect.stringContaining>,
      T
    > {}
  interface AsymmetricMatchers
    extends TestingLibraryMatchers<
      ReturnType<typeof expect.stringContaining>,
      void
    > {}
}
