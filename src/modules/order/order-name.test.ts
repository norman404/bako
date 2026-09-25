import { describe, expect, it } from "vitest";

import { normalizeOrderName, ORDER_NAME_MAX_LENGTH } from "./order-name";

describe("normalizeOrderName", () => {
  // CASE: The cashier submits a name with surrounding whitespace.
  // VALIDATES: Persistence receives a trimmed, non-empty order name.
  it("should trim surrounding whitespace when the name is provided", () => {
    // Arrange
    const input = "  Mesa 4  ";

    // Act
    const result = normalizeOrderName(input);

    // Assert
    expect(result).toBe("Mesa 4");
  });

  // CASE: The cashier leaves the optional name blank or enters only spaces.
  // VALIDATES: Empty names are represented as null instead of meaningless text.
  it("should return null when the name is blank", () => {
    // Arrange
    const input = "   ";

    // Act
    const result = normalizeOrderName(input);

    // Assert
    expect(result).toBeNull();
  });

  // CASE: A name is longer than the UI's reasonable printable limit.
  // VALIDATES: Normalization never stores more than the configured maximum length.
  it("should cap names at the configured maximum length", () => {
    // Arrange
    const input = "A".repeat(ORDER_NAME_MAX_LENGTH + 1);

    // Act
    const result = normalizeOrderName(input);

    // Assert
    expect(result).toHaveLength(ORDER_NAME_MAX_LENGTH);
  });
});
