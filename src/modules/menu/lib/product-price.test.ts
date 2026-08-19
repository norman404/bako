import { describe, expect, it } from "vitest";

import { parseProductPriceInput } from "./product-price";

describe("parseProductPriceInput", () => {
  // CASE: An operator enters a localized decimal price with surrounding whitespace.
  // VALIDATES: A comma decimal separator is converted to integer cents.
  it("should return integer cents when the input uses a comma decimal separator", () => {
    // Arrange
    const input = " 12,50 ";

    // Act
    const result = parseProductPriceInput(input);

    // Assert
    expect(result).toBe(1_250);
  });

  // CASE: An operator submits an empty price field.
  // VALIDATES: A blank monetary value is rejected instead of becoming zero.
  it("should return null when the input is blank", () => {
    // Arrange
    const input = "   ";

    // Act
    const result = parseProductPriceInput(input);

    // Assert
    expect(result).toBeNull();
  });

  // CASE: An operator enters a negative product price.
  // VALIDATES: The catalog refuses monetary values below zero.
  it("should return null when the input is negative", () => {
    // Arrange
    const input = "-0.01";

    // Act
    const result = parseProductPriceInput(input);

    // Assert
    expect(result).toBeNull();
  });
});
