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
import enUsErrors from "@/shared/i18n/locales/en-US/errors.json";
import enUsCheckout from "@/shared/i18n/locales/en-US/checkout.json";
import enUsDelivery from "@/shared/i18n/locales/en-US/delivery.json";
import enUsShift from "@/shared/i18n/locales/en-US/shift.json";
import esArSettings from "@/shared/i18n/locales/es-AR/settings.json";
import esArMenu from "@/shared/i18n/locales/es-AR/menu.json";
import esArErrors from "@/shared/i18n/locales/es-AR/errors.json";
import esArCheckout from "@/shared/i18n/locales/es-AR/checkout.json";
import esArDelivery from "@/shared/i18n/locales/es-AR/delivery.json";
import esArShift from "@/shared/i18n/locales/es-AR/shift.json";
import esEsSettings from "@/shared/i18n/locales/es-ES/settings.json";
import esEsMenu from "@/shared/i18n/locales/es-ES/menu.json";
import esEsErrors from "@/shared/i18n/locales/es-ES/errors.json";
import esEsCheckout from "@/shared/i18n/locales/es-ES/checkout.json";
import esEsDelivery from "@/shared/i18n/locales/es-ES/delivery.json";
import esEsShift from "@/shared/i18n/locales/es-ES/shift.json";
import esMxSettings from "@/shared/i18n/locales/es-MX/settings.json";
import esMxMenu from "@/shared/i18n/locales/es-MX/menu.json";
import esMxErrors from "@/shared/i18n/locales/es-MX/errors.json";
import esMxCheckout from "@/shared/i18n/locales/es-MX/checkout.json";
import esMxDelivery from "@/shared/i18n/locales/es-MX/delivery.json";
import esMxShift from "@/shared/i18n/locales/es-MX/shift.json";
import ptBrSettings from "@/shared/i18n/locales/pt-BR/settings.json";
import ptBrMenu from "@/shared/i18n/locales/pt-BR/menu.json";
import ptBrErrors from "@/shared/i18n/locales/pt-BR/errors.json";
import ptBrCheckout from "@/shared/i18n/locales/pt-BR/checkout.json";
import ptBrDelivery from "@/shared/i18n/locales/pt-BR/delivery.json";
import ptBrShift from "@/shared/i18n/locales/pt-BR/shift.json";

type JsonObject = Record<string, unknown>;

interface LocaleBundle {
  settings: JsonObject;
  menu: JsonObject;
  errors: JsonObject;
  checkout: JsonObject;
  delivery: JsonObject;
  shift: JsonObject;
}

const BUNDLES: Record<string, LocaleBundle> = {
  "en-US": { settings: enUsSettings as JsonObject, menu: enUsMenu as JsonObject, errors: enUsErrors as JsonObject, checkout: enUsCheckout as JsonObject, delivery: enUsDelivery as JsonObject, shift: enUsShift as JsonObject },
  "es-AR": { settings: esArSettings as JsonObject, menu: esArMenu as JsonObject, errors: esArErrors as JsonObject, checkout: esArCheckout as JsonObject, delivery: esArDelivery as JsonObject, shift: esArShift as JsonObject },
  "es-ES": { settings: esEsSettings as JsonObject, menu: esEsMenu as JsonObject, errors: esEsErrors as JsonObject, checkout: esEsCheckout as JsonObject, delivery: esEsDelivery as JsonObject, shift: esEsShift as JsonObject },
  "es-MX": { settings: esMxSettings as JsonObject, menu: esMxMenu as JsonObject, errors: esMxErrors as JsonObject, checkout: esMxCheckout as JsonObject, delivery: esMxDelivery as JsonObject, shift: esMxShift as JsonObject },
  "pt-BR": { settings: ptBrSettings as JsonObject, menu: ptBrMenu as JsonObject, errors: ptBrErrors as JsonObject, checkout: ptBrCheckout as JsonObject, delivery: ptBrDelivery as JsonObject, shift: ptBrShift as JsonObject },
};

const CANONICAL_LOCALE = "es-MX";
const LOCALES = Object.keys(BUNDLES);

const NAMESPACES_TO_CHECK: ReadonlyArray<{
  bundleKey: keyof LocaleBundle;
  namespace: string;
}> = [
  { bundleKey: "settings", namespace: "modifierGroups" },
  { bundleKey: "menu", namespace: "customizationDialog" },
  { bundleKey: "errors", namespace: "menu" },
  { bundleKey: "errors", namespace: "printer" },
  { bundleKey: "checkout", namespace: "errors" },
  { bundleKey: "delivery", namespace: "errors" },
  { bundleKey: "shift", namespace: "errors" },
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
      const key = `${bundleKey}.${namespace}`;
      const json = BUNDLES[CANONICAL_LOCALE][bundleKey];
      const namespaceValue = json[namespace];
      if (namespaceValue && typeof namespaceValue === "object") {
        canonicalFileKeys[key] = new Set(
          flattenKeys(namespaceValue as JsonObject, namespace),
        );
      } else {
        canonicalFileKeys[key] = new Set();
      }
    }

    for (const locale of LOCALES) {
      if (locale === CANONICAL_LOCALE) continue;

      for (const { bundleKey, namespace } of NAMESPACES_TO_CHECK) {
        const namespaceKey = `${bundleKey}.${namespace}`;
        const json = BUNDLES[locale][bundleKey];
        const namespaceValue = json[namespace];
        const actualKeys = new Set<string>();
        if (namespaceValue && typeof namespaceValue === "object") {
          for (const key of flattenKeys(namespaceValue as JsonObject, namespace)) {
            actualKeys.add(key);
          }
        }

        const missing = [...canonicalFileKeys[namespaceKey]].filter(
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
