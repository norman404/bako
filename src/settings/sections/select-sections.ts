import { type ModuleNavigationEntry, NAVIGATION_GROUP } from "@/app/module-manifest";

const SETTINGS_GROUP_ORDER = [
  NAVIGATION_GROUP.GENERAL,
  NAVIGATION_GROUP.PRINTING,
  NAVIGATION_GROUP.FEATURES,
  NAVIGATION_GROUP.SYSTEM,
] as const;

function groupRank(group: ModuleNavigationEntry["group"]): number {
  const index = SETTINGS_GROUP_ORDER.indexOf(group as (typeof SETTINGS_GROUP_ORDER)[number]);
  return index === -1 ? SETTINGS_GROUP_ORDER.length : index;
}

/**
 * Picks the settings sections the operator may reach and puts them in reading order:
 * group first, then the module-declared order, then the identifier as a stable tiebreaker.
 * A section gated behind a feature flag only survives while that flag is on.
 */
export function selectSettingsSections(
  entries: readonly ModuleNavigationEntry[],
  flags: Readonly<Record<string, boolean>> | undefined,
): ModuleNavigationEntry[] {
  return entries
    .filter((entry) => !entry.flagKey || flags?.[entry.flagKey] === true)
    .sort(
      (left, right) =>
        groupRank(left.group) - groupRank(right.group) ||
        left.order - right.order ||
        left.id.localeCompare(right.id),
    );
}
