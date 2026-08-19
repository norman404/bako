import { describe, expect, it } from "vitest";

import { summarizeFeatureFlags } from "./feature-flag-summary";

const MODULE_FLAG_KEYS = [
  "categories_enabled",
  "multiple_menus_enabled",
  "shift_management_enabled",
];

const ALL_ENABLED_FLAGS = {
  categories_enabled: true,
  multiple_menus_enabled: true,
  shift_management_enabled: true,
};

const MIXED_FLAGS = {
  categories_enabled: true,
  multiple_menus_enabled: false,
  shift_management_enabled: true,
};

const PARTIAL_FLAGS = {
  categories_enabled: true,
};

const UNRELATED_FLAGS = {
  categories_enabled: true,
  receipt_printing_enabled: true,
  comandas_enabled: true,
};

describe("summarizeFeatureFlags", () => {
  // CASE: Every module flag is turned on in the settings snapshot.
  // VALIDATES: The summary reports each known key as enabled.
  it("should count every key as enabled when all flags are true", () => {
    // Arrange
    const keys = MODULE_FLAG_KEYS;

    // Act
    const result = summarizeFeatureFlags(keys, ALL_ENABLED_FLAGS);

    // Assert
    expect(result).toEqual({ enabled: 3, total: 3 });
  });

  // CASE: Some module flags are turned off in the settings snapshot.
  // VALIDATES: Only the keys explicitly set to true increase the enabled count.
  it("should count only the flags set to true", () => {
    // Arrange
    const keys = MODULE_FLAG_KEYS;

    // Act
    const result = summarizeFeatureFlags(keys, MIXED_FLAGS);

    // Assert
    expect(result).toEqual({ enabled: 2, total: 3 });
  });

  // CASE: The snapshot has not stored a value for some known keys yet.
  // VALIDATES: A key missing from the flags record counts as disabled.
  it("should treat a missing key as disabled", () => {
    // Arrange
    const keys = MODULE_FLAG_KEYS;

    // Act
    const result = summarizeFeatureFlags(keys, PARTIAL_FLAGS);

    // Assert
    expect(result).toEqual({ enabled: 1, total: 3 });
  });

  // CASE: The settings snapshot has not loaded yet, so there are no flags at all.
  // VALIDATES: An undefined flags record reports zero enabled without losing the total.
  it("should report zero enabled when flags are undefined", () => {
    // Arrange
    const keys = MODULE_FLAG_KEYS;

    // Act
    const result = summarizeFeatureFlags(keys, undefined);

    // Assert
    expect(result).toEqual({ enabled: 0, total: 3 });
  });

  // CASE: The flags record holds keys that no module declares.
  // VALIDATES: Flags outside the requested keys never affect the summary.
  it("should ignore flags that are not part of the requested keys", () => {
    // Arrange
    const keys = ["categories_enabled", "multiple_menus_enabled"];

    // Act
    const result = summarizeFeatureFlags(keys, UNRELATED_FLAGS);

    // Assert
    expect(result).toEqual({ enabled: 1, total: 2 });
  });

  // CASE: The same key is declared twice by the caller.
  // VALIDATES: Keys are counted once per occurrence instead of being deduplicated.
  it("should count a repeated key once per occurrence", () => {
    // Arrange
    const keys = ["categories_enabled", "categories_enabled", "multiple_menus_enabled"];

    // Act
    const result = summarizeFeatureFlags(keys, MIXED_FLAGS);

    // Assert
    expect(result).toEqual({ enabled: 2, total: 3 });
  });

  // CASE: No module declares any flag.
  // VALIDATES: An empty key list produces an empty summary instead of throwing.
  it("should return an empty summary when there are no keys", () => {
    // Arrange
    const keys: readonly string[] = [];

    // Act
    const result = summarizeFeatureFlags(keys, ALL_ENABLED_FLAGS);

    // Assert
    expect(result).toEqual({ enabled: 0, total: 0 });
  });
});
