/**
 * Locale completeness test.
 *
 * Garantiza que TODOS los locales tengan las mismas claves estructurales que
 * la versión canónica `es-MX`. Si alguien agrega un locale nuevo, este test
 * le avisa qué claves faltan. Si alguien agrega una clave nueva a `es-MX`,
 * también le avisa que debe propagar a los demás.
 *
 * No es exhaustivo (no compara value-por-value), solo verifica presencia
 * estructural de los namespaces que el código consume.
 */
import { describe, expect, it } from "vitest";

// Import every locale's settings.json and menu.json statically so the test
// itself is fully type-checked and works in any environment.
import enUsSettings from "@/shared/i18n/locales/en-US/settings.json";
import enUsMenu from "@/shared/i18n/locales/en-US/menu.json";
import esArSettings from "@/shared/i18n/locales/es-AR/settings.json";
import esArMenu from "@/shared/i18n/locales/es-AR/menu.json";
import esEsSettings from "@/shared/i18n/locales/es-ES/settings.json";
import esEsMenu from "@/shared/i18n/locales/es-ES/menu.json";
import esMxSettings from "@/shared/i18n/locales/es-MX/settings.json";
import esMxMenu from "@/shared/i18n/locales/es-MX/menu.json";
import ptBrSettings from "@/shared/i18n/locales/pt-BR/settings.json";
import ptBrMenu from "@/shared/i18n/locales/pt-BR/menu.json";

type JsonObject = Record<string, unknown>;

interface LocaleBundle {
  settings: JsonObject;
  menu: JsonObject;
}

const BUNDLES: Record<string, LocaleBundle> = {
  "en-US": { settings: enUsSettings as JsonObject, menu: enUsMenu as JsonObject },
  "es-AR": { settings: esArSettings as JsonObject, menu: esArMenu as JsonObject },
  "es-ES": { settings: esEsSettings as JsonObject, menu: esEsMenu as JsonObject },
  "es-MX": { settings: esMxSettings as JsonObject, menu: esMxMenu as JsonObject },
  "pt-BR": { settings: ptBrSettings as JsonObject, menu: ptBrMenu as JsonObject },
};

const CANONICAL_LOCALE = "es-MX";
const LOCALES = Object.keys(BUNDLES);

const NAMESPACES_TO_CHECK: ReadonlyArray<{
  bundleKey: keyof LocaleBundle;
  namespace: string;
}> = [
  { bundleKey: "settings", namespace: "modifierGroups" },
  { bundleKey: "menu", namespace: "customizationDialog" },
];

function flattenKeys(obj: JsonObject, prefix = ""): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out.push(...flattenKeys(value as JsonObject, next));
    } else {
      out.push(next);
    }
  }
  return out;
}

describe("i18n locale completeness", () => {
  for (const locale of LOCALES) {
    describe(`locale ${locale}`, () => {
      for (const { bundleKey, namespace } of NAMESPACES_TO_CHECK) {
        it(`has the ${namespace} namespace in ${bundleKey}`, () => {
          const json = BUNDLES[locale][bundleKey];
          const namespaceValue = json[namespace];
          expect(namespaceValue).toBeDefined();
          expect(typeof namespaceValue).toBe("object");
        });
      }
    });
  }

  it("every non-canonical locale has at least the same flat keys as es-MX", () => {
    const canonicalFileKeys: Record<string, Set<string>> = {};
    for (const { bundleKey, namespace } of NAMESPACES_TO_CHECK) {
      const json = BUNDLES[CANONICAL_LOCALE][bundleKey];
      const namespaceValue = json[namespace];
      if (namespaceValue && typeof namespaceValue === "object") {
        canonicalFileKeys[bundleKey] = new Set(
          flattenKeys(namespaceValue as JsonObject, namespace),
        );
      } else {
        canonicalFileKeys[bundleKey] = new Set();
      }
    }

    for (const locale of LOCALES) {
      if (locale === CANONICAL_LOCALE) continue;

      for (const { bundleKey, namespace } of NAMESPACES_TO_CHECK) {
        const json = BUNDLES[locale][bundleKey];
        const namespaceValue = json[namespace];
        const actualKeys = new Set<string>();
        if (namespaceValue && typeof namespaceValue === "object") {
          for (const key of flattenKeys(namespaceValue as JsonObject, namespace)) {
            actualKeys.add(key);
          }
        }

        const missing = [...canonicalFileKeys[bundleKey]].filter(
          (k) => !actualKeys.has(k),
        );

        expect(
          missing,
          `Locale ${locale} is missing keys in ${bundleKey} under ${namespace}: ${missing.join(", ")}`,
        ).toEqual([]);
      }
    }
  });

  it("all values in non-canonical locales are non-empty strings (no literal keys)", () => {
    for (const locale of LOCALES) {
      if (locale === CANONICAL_LOCALE) continue;

      for (const { bundleKey, namespace } of NAMESPACES_TO_CHECK) {
        const json = BUNDLES[locale][bundleKey];
        const namespaceValue = json[namespace];
        if (!namespaceValue || typeof namespaceValue !== "object") continue;

        for (const key of flattenKeys(namespaceValue as JsonObject, namespace)) {
          const path = key.split(".");
          let value: unknown = json;
          for (const segment of path) {
            if (value && typeof value === "object") {
              value = (value as JsonObject)[segment];
            } else {
              value = undefined;
              break;
            }
          }

          expect(
            typeof value === "string" && value.trim().length > 0,
            `Locale ${locale} has empty or non-string value at ${key} in ${bundleKey}`,
          ).toBe(true);
        }
      }
    }
  });
});
