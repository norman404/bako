import { describe, expect, it } from "vitest";

import { splitModulesIntoColumns } from "./module-columns";

const CURRENT_MODULES = [
  {
    id: "menu",
    flags: ["categories_enabled", "multiple_menus_enabled", "modifier_groups_enabled"],
  },
  { id: "shift", flags: ["shift_management_enabled"] },
  { id: "printer", flags: ["comandas_enabled", "receipt_printing_enabled"] },
];

const SINGLE_MODULE = [{ id: "shift", flags: ["shift_management_enabled"] }];

const EQUAL_SIZED_MODULES = [
  { id: "alpha", flags: ["alpha_enabled"] },
  { id: "beta", flags: ["beta_enabled"] },
  { id: "gamma", flags: ["gamma_enabled"] },
  { id: "delta", flags: ["delta_enabled"] },
];

describe("splitModulesIntoColumns", () => {
  // CASE: The three modules shipped today declare three, one, and two flags.
  // VALIDATES: The tall module stands alone so the two short ones balance it in the other column.
  it("should keep the tallest module alone and stack the short ones beside it", () => {
    // Arrange
    const modules = CURRENT_MODULES;

    // Act
    const result = splitModulesIntoColumns(modules);

    // Assert
    expect(result).toEqual([
      { id: "start", modules: [CURRENT_MODULES[0]] },
      { id: "end", modules: [CURRENT_MODULES[1], CURRENT_MODULES[2]] },
    ]);
  });

  // CASE: Every module declares the same number of flags.
  // VALIDATES: Equal modules alternate between columns instead of piling into one.
  it("should alternate columns when every module has the same flag count", () => {
    // Arrange
    const modules = EQUAL_SIZED_MODULES;

    // Act
    const result = splitModulesIntoColumns(modules);

    // Assert
    expect(result).toEqual([
      { id: "start", modules: [EQUAL_SIZED_MODULES[0], EQUAL_SIZED_MODULES[2]] },
      { id: "end", modules: [EQUAL_SIZED_MODULES[1], EQUAL_SIZED_MODULES[3]] },
    ]);
  });

  // CASE: Only one module is configured.
  // VALIDATES: The split always returns both columns, leaving the second one empty for the caller to drop.
  it("should return an empty second column when there is a single module", () => {
    // Arrange
    const modules = SINGLE_MODULE;

    // Act
    const result = splitModulesIntoColumns(modules);

    // Assert
    expect(result).toEqual([
      { id: "start", modules: [SINGLE_MODULE[0]] },
      { id: "end", modules: [] },
    ]);
  });

  // CASE: No module is configured at all.
  // VALIDATES: An empty input yields two empty columns instead of throwing.
  it("should return two empty columns when there are no modules", () => {
    // Arrange
    const modules: readonly { id: string; flags: readonly string[] }[] = [];

    // Act
    const result = splitModulesIntoColumns(modules);

    // Assert
    expect(result).toEqual([
      { id: "start", modules: [] },
      { id: "end", modules: [] },
    ]);
  });

  // CASE: The caller reuses the module list it passed in.
  // VALIDATES: The split reads the input without reordering or emptying it.
  it("should not mutate the received module list", () => {
    // Arrange
    const modules = [...CURRENT_MODULES];

    // Act
    splitModulesIntoColumns(modules);

    // Assert
    expect(modules).toEqual(CURRENT_MODULES);
  });
});
