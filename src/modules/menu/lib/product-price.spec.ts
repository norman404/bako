import { describe, expect, it } from "bun:test";

import { formatProductPriceInput, parseProductPriceInput } from "@/modules/menu/lib/product-price";

describe("product price helpers", () => {
  it("formats cents into a peso string with two decimals", () => {
    expect(formatProductPriceInput(5550)).toBe("55.50");
  });

  it("parses peso strings into cents", () => {
    expect(parseProductPriceInput("55.50")).toBe(5550);
    expect(parseProductPriceInput("55,50")).toBe(5550);
  });

  it("rejects invalid price input", () => {
    expect(parseProductPriceInput("abc")).toBeNull();
    expect(parseProductPriceInput("-10")).toBeNull();
  });
});
