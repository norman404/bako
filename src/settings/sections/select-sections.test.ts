import { describe, expect, it } from "vitest";

import { Globe } from "lucide-react";

import {
  NAVIGATION_GROUP,
  NAVIGATION_SURFACE,
  type ModuleNavigationEntry,
} from "@/app/module-manifest";
import { selectSettingsSections } from "./select-sections";

const GENERAL_ENTRY: ModuleNavigationEntry = {
  id: "general",
  surface: NAVIGATION_SURFACE.SETTINGS,
  group: NAVIGATION_GROUP.GENERAL,
  order: 10,
  labelKey: "settings:sections.general",
  icon: Globe,
  Component: () => null,
};

const PRINTING_ENTRY: ModuleNavigationEntry = {
  id: "printer",
  surface: NAVIGATION_SURFACE.SETTINGS,
  group: NAVIGATION_GROUP.PRINTING,
  order: 10,
  labelKey: "settings:sections.printer",
  icon: Globe,
  Component: () => null,
};

const SYSTEM_ENTRY: ModuleNavigationEntry = {
  id: "database",
  surface: NAVIGATION_SURFACE.SETTINGS,
  group: NAVIGATION_GROUP.SYSTEM,
  order: 10,
  labelKey: "settings:database.title",
  icon: Globe,
  Component: () => null,
};

const FLAGGED_FEATURES_ENTRY: ModuleNavigationEntry = {
  id: "updater",
  surface: NAVIGATION_SURFACE.SETTINGS,
  group: NAVIGATION_GROUP.FEATURES,
  order: 10,
  labelKey: "settings:sections.updater",
  icon: Globe,
  Component: () => null,
  flagKey: "autoUpdate",
};

const UNKNOWN_GROUP_ENTRY: ModuleNavigationEntry = {
  id: "operations",
  surface: NAVIGATION_SURFACE.SETTINGS,
  group: NAVIGATION_GROUP.OPERATIONS,
  order: 1,
  labelKey: "settings:sections.operations",
  icon: Globe,
  Component: () => null,
};

const TIED_ZULU_ENTRY: ModuleNavigationEntry = {
  id: "zulu",
  surface: NAVIGATION_SURFACE.SETTINGS,
  group: NAVIGATION_GROUP.GENERAL,
  order: 10,
  labelKey: "settings:sections.zulu",
  icon: Globe,
  Component: () => null,
};

const TIED_ALPHA_ENTRY: ModuleNavigationEntry = {
  id: "alpha",
  surface: NAVIGATION_SURFACE.SETTINGS,
  group: NAVIGATION_GROUP.GENERAL,
  order: 10,
  labelKey: "settings:sections.alpha",
  icon: Globe,
  Component: () => null,
};

describe("selectSettingsSections", () => {
  // CASE: The settings window renders before any feature flag snapshot arrives.
  // VALIDATES: Flagged sections stay hidden while unflagged sections remain reachable.
  it("should keep only unflagged sections when flags are undefined", () => {
    // Arrange
    const entries = [GENERAL_ENTRY, FLAGGED_FEATURES_ENTRY];

    // Act
    const result = selectSettingsSections(entries, undefined);

    // Assert
    expect(result).toEqual([GENERAL_ENTRY]);
  });

  // CASE: The operator keeps an optional module switched off.
  // VALIDATES: A section whose flag is false is excluded from the tab strip.
  it("should exclude a section whose flag is disabled", () => {
    // Arrange
    const entries = [GENERAL_ENTRY, FLAGGED_FEATURES_ENTRY];

    // Act
    const result = selectSettingsSections(entries, { autoUpdate: false });

    // Assert
    expect(result).toEqual([GENERAL_ENTRY]);
  });

  // CASE: The operator switches an optional module on.
  // VALIDATES: An enabled flag makes its section available again.
  it("should include a section whose flag is enabled", () => {
    // Arrange
    const entries = [GENERAL_ENTRY, FLAGGED_FEATURES_ENTRY];

    // Act
    const result = selectSettingsSections(entries, { autoUpdate: true });

    // Assert
    expect(result).toEqual([GENERAL_ENTRY, FLAGGED_FEATURES_ENTRY]);
  });

  // CASE: Modules register their sections in arbitrary registration order.
  // VALIDATES: Sections follow the general, printing, features, system reading order.
  it("should order sections by their settings group", () => {
    // Arrange
    const entries = [SYSTEM_ENTRY, FLAGGED_FEATURES_ENTRY, PRINTING_ENTRY, GENERAL_ENTRY];

    // Act
    const result = selectSettingsSections(entries, { autoUpdate: true });

    // Assert
    expect(result).toEqual([GENERAL_ENTRY, PRINTING_ENTRY, FLAGGED_FEATURES_ENTRY, SYSTEM_ENTRY]);
  });

  // CASE: A module declares a section in a group the settings window does not rank.
  // VALIDATES: Unranked groups land after every known group instead of jumping ahead.
  it("should place a section with an unknown group last", () => {
    // Arrange
    const entries = [UNKNOWN_GROUP_ENTRY, SYSTEM_ENTRY, GENERAL_ENTRY];

    // Act
    const result = selectSettingsSections(entries, undefined);

    // Assert
    expect(result).toEqual([GENERAL_ENTRY, SYSTEM_ENTRY, UNKNOWN_GROUP_ENTRY]);
  });

  // CASE: Two sections share the same group and the same explicit order.
  // VALIDATES: The identifier breaks the tie so the tab strip stays deterministic.
  it("should break a group and order tie by identifier", () => {
    // Arrange
    const entries = [TIED_ZULU_ENTRY, TIED_ALPHA_ENTRY];

    // Act
    const result = selectSettingsSections(entries, undefined);

    // Assert
    expect(result).toEqual([TIED_ALPHA_ENTRY, TIED_ZULU_ENTRY]);
  });

  // CASE: The selection runs on every render against the shared module registry.
  // VALIDATES: The registry array keeps its original contents and order.
  it("should not mutate the received entries", () => {
    // Arrange
    const entries = [SYSTEM_ENTRY, GENERAL_ENTRY, FLAGGED_FEATURES_ENTRY];

    // Act
    selectSettingsSections(entries, { autoUpdate: true });

    // Assert
    expect(entries).toEqual([SYSTEM_ENTRY, GENERAL_ENTRY, FLAGGED_FEATURES_ENTRY]);
  });
});
