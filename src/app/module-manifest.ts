import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

const NAVIGATION_SURFACE = {
  ADMIN: "admin",
  SETTINGS: "settings",
} as const;

type NavigationSurface = (typeof NAVIGATION_SURFACE)[keyof typeof NAVIGATION_SURFACE];

const NAVIGATION_GROUP = {
  OPERATIONS: "operations",
  CATALOG: "catalog",
  PEOPLE: "people",
  GENERAL: "general",
  PRINTING: "printing",
  FEATURES: "features",
  SYSTEM: "system",
} as const;

type NavigationGroup = (typeof NAVIGATION_GROUP)[keyof typeof NAVIGATION_GROUP];

interface ModuleNavigationEntry {
  id: string;
  surface: NavigationSurface;
  group: NavigationGroup;
  order: number;
  labelKey: string;
  descriptionKey?: string;
  icon: LucideIcon;
  Component: ComponentType;
  flagKey?: string;
}

interface ModuleManifest {
  id: string;
  navigation?: ModuleNavigationEntry[];
}

function validateModuleRegistry(registry: ModuleManifest[]): ModuleManifest[] {
  const entryIds = new Set<string>();

  for (const manifest of registry) {
    for (const entry of manifest.navigation ?? []) {
      if (entryIds.has(entry.id)) {
        throw new Error(`Duplicate module navigation entry id: ${entry.id}`);
      }

      entryIds.add(entry.id);
    }
  }

  return registry;
}

function getVisibleNavigationEntries(
  registry: ModuleManifest[],
  surface: NavigationSurface,
  flags: Readonly<Record<string, boolean>>,
): ModuleNavigationEntry[] {
  return registry
    .flatMap((manifest) => manifest.navigation ?? [])
    .filter((entry) => entry.surface === surface)
    .filter((entry) => !entry.flagKey || flags[entry.flagKey])
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

export {
  getVisibleNavigationEntries,
  NAVIGATION_GROUP,
  NAVIGATION_SURFACE,
  validateModuleRegistry,
};
export type { ModuleManifest, ModuleNavigationEntry, NavigationGroup, NavigationSurface };
