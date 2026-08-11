/**
 * Theme token completeness test.
 *
 * `components.json` declara shadcn/ui con `cssVariables: true`. Los componentes
 * que genera el registry usan nombres semánticos (`bg-card`, `text-muted-foreground`,
 * `border-input`, `rounded-xl`, `animate-in`…). Si esos tokens no existen en el
 * bloque `@theme` de `app.css`, Tailwind NO genera las clases y el componente sale
 * transparente / sin estilos, en silencio.
 *
 * Este guard verifica el CONTRATO, no los colores:
 *  1. `app.css` importa `tw-animate-css` (de ahí salen `animate-in`, `fade-in-0`,
 *     `zoom-in-95`, `slide-in-from-*` que usan dialog/select/popover).
 *  2. Todo token del contrato shadcn está declarado dentro de `@theme`.
 *  3. Los alias del puente apuntan a un token Catppuccin existente — NO son colores
 *     nuevos. Si alguien mete un hex ahí, el tema se bifurca y este test lo caza.
 *  4. Regresión: los tokens Catppuccin originales siguen existiendo.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const APP_CSS_PATH = join(import.meta.dir, "app.css");
const PACKAGE_JSON_PATH = join(import.meta.dir, "..", "..", "package.json");

const appCss = readFileSync(APP_CSS_PATH, "utf8");

/**
 * Extrae el contenido del bloque `@theme { … }` haciendo match de llaves.
 * Un token declarado FUERA de `@theme` no genera utilities en Tailwind 4,
 * por eso no basta con buscar el nombre en el archivo completo.
 */
function extractThemeBlock(css: string): string {
  const start = css.indexOf("@theme");
  if (start === -1) return "";

  const open = css.indexOf("{", start);
  if (open === -1) return "";

  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return "";
}

function parseCustomProperties(block: string): Map<string, string> {
  const declarations = new Map<string, string>();
  const pattern = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let match = pattern.exec(block);
  while (match !== null) {
    declarations.set(match[1], match[2].trim());
    match = pattern.exec(block);
  }
  return declarations;
}

const themeBlock = extractThemeBlock(appCss);
const themeTokens = parseCustomProperties(themeBlock);

/** Contrato shadcn/ui — nombres que el registry asume que existen. */
const REQUIRED_SHADCN_TOKENS: readonly string[] = [
  "--color-background",
  "--color-foreground",
  "--color-card",
  "--color-card-foreground",
  "--color-popover",
  "--color-popover-foreground",
  "--color-primary",
  "--color-primary-foreground",
  "--color-secondary-foreground",
  "--color-muted",
  "--color-muted-foreground",
  "--color-accent",
  "--color-accent-foreground",
  "--color-destructive",
  "--color-destructive-foreground",
  "--color-border",
  "--color-input",
  "--color-ring",
];

/** Escala de radios que consumen `rounded-sm|md|lg|xl` del registry. */
const REQUIRED_RADIUS_TOKENS: readonly string[] = [
  "--radius-sm",
  "--radius-md",
  "--radius-lg",
  "--radius-xl",
];

/**
 * Alias del puente → token Catppuccin al que DEBEN apuntar.
 * El puente no inventa colores: reusa la paleta actual.
 */
const BRIDGE_ALIASES: ReadonlyArray<readonly [alias: string, target: string]> = [
  ["--color-background", "--color-surface"],
  ["--color-foreground", "--color-text"],
  ["--color-card", "--color-surface-raised"],
  ["--color-card-foreground", "--color-text"],
  ["--color-popover", "--color-surface-raised"],
  ["--color-popover-foreground", "--color-text"],
  ["--color-primary-foreground", "--color-on-primary"],
  ["--color-secondary", "--color-surface-sunken"],
  ["--color-secondary-foreground", "--color-on-primary"],
  ["--color-muted", "--color-surface-sunken"],
  ["--color-muted-foreground", "--color-text-dim"],
  ["--color-accent", "--color-surface-sunken"],
  ["--color-accent-foreground", "--color-text"],
  ["--color-destructive", "--color-danger"],
  ["--color-destructive-foreground", "--color-on-primary"],
  ["--color-input", "--color-border-strong"],
];

/** Tokens propios del tema Catppuccin — ninguno se puede perder al agregar el puente. */
const CATPPUCCIN_TOKENS: readonly string[] = [
  "--color-surface",
  "--color-surface-raised",
  "--color-surface-sunken",
  "--color-text",
  "--color-text-muted",
  "--color-text-dim",
  "--color-primary-strong",
  "--color-on-primary",
  "--color-cta",
  "--color-on-cta",
  "--color-border-strong",
  "--color-danger",
  "--color-success",
  "--color-warning",
  "--color-scrim",
  "--radius-sharp",
  "--radius-card",
  "--radius-modal",
];

describe("theme tokens — puente shadcn/ui sobre Catppuccin", () => {
  it("app.css tiene un bloque @theme parseable", () => {
    expect(
      themeBlock.trim().length,
      "app.css must declare a `@theme { … }` block — Tailwind 4 only turns custom properties declared there into utilities",
    ).toBeGreaterThan(0);
  });

  it("importa tw-animate-css (animate-in, fade-in-0, zoom-in-95, slide-in-from-*)", () => {
    const importsAnimations = /@import\s+["']tw-animate-css["']\s*;/.test(appCss);

    expect(
      importsAnimations,
      'app.css is missing `@import "tw-animate-css";` — dialog.tsx, select.tsx and popover.tsx use animate-in / fade-in-0 / zoom-in-95 / slide-in-from-*, and none of those classes are generated without it',
    ).toBe(true);
  });

  it("declara tw-animate-css como devDependency", () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")) as {
      devDependencies?: Record<string, string>;
    };

    expect(
      pkg.devDependencies?.["tw-animate-css"],
      "package.json is missing `tw-animate-css` in devDependencies — the @import in app.css would fail to resolve at build time",
    ).toBeDefined();
  });

  it("declara todos los tokens de color del contrato shadcn dentro de @theme", () => {
    const missing = REQUIRED_SHADCN_TOKENS.filter((token) => !themeTokens.has(token));

    expect(
      missing,
      `app.css @theme is missing shadcn color tokens: ${missing.join(", ")}. Components from the shadcn registry render unstyled without them.`,
    ).toEqual([]);
  });

  it("declara la escala de radios sm/md/lg/xl dentro de @theme", () => {
    const missing = REQUIRED_RADIUS_TOKENS.filter((token) => !themeTokens.has(token));

    expect(
      missing,
      `app.css @theme is missing radius tokens: ${missing.join(", ")}. shadcn components use rounded-sm/md/lg/xl.`,
    ).toEqual([]);
  });

  it("los alias del puente apuntan a tokens Catppuccin, no a colores nuevos", () => {
    const wrong: string[] = [];

    for (const [alias, target] of BRIDGE_ALIASES) {
      const value = themeTokens.get(alias);
      if (value !== `var(${target})`) {
        wrong.push(`${alias} = "${value ?? "<undeclared>"}" (expected "var(${target})")`);
      }
    }

    expect(
      wrong,
      `Bridge aliases must reference existing Catppuccin tokens so the palette stays single-sourced: ${wrong.join("; ")}`,
    ).toEqual([]);
  });

  it("conserva el hex de subtext1 como --color-text-secondary", () => {
    expect(
      themeTokens.get("--color-text-secondary")?.toUpperCase(),
      "--color-text-secondary must keep the Catppuccin subtext1 hex (#B8C0E0) that --color-secondary used to hold before the shadcn bridge repurposed it as a surface",
    ).toBe("#B8C0E0");
  });

  it("no pierde ningún token Catppuccin (regresión)", () => {
    const missing = CATPPUCCIN_TOKENS.filter((token) => !themeTokens.has(token));

    expect(
      missing,
      `app.css @theme lost Catppuccin tokens: ${missing.join(", ")}. The shadcn bridge only ADDS aliases — it never removes the palette.`,
    ).toEqual([]);
  });

  it("ningún token del @theme queda con valor vacío", () => {
    const empty = [...themeTokens.entries()]
      .filter(([, value]) => value.length === 0)
      .map(([token]) => token);

    expect(empty, `app.css @theme has empty token values: ${empty.join(", ")}`).toEqual([]);
  });
});
