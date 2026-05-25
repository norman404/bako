import { describe, expect, it } from "vitest";

import {
  formatPaymentAmountInput,
  parsePaymentAmountInput,
  sanitizePaymentAmountInput,
} from "@/modules/checkout/lib/formatters";

describe("checkout payment formatters", () => {
  it("formats cents into a decimal string with two decimals", () => {
    expect(formatPaymentAmountInput(5550)).toBe("55.50");
  });

  it("sanitizes manual cash input without changing valid separators", () => {
    expect(sanitizePaymentAmountInput("$ 1.234,50 ARS")).toBe("1.234,50");
  });

  it("parses dot and comma decimal amounts into cents", () => {
    expect(parsePaymentAmountInput("55.50")).toBe(5550);
    expect(parsePaymentAmountInput("55,50")).toBe(5550);
  });

  it("parses amounts after trimming whitespace and unsupported characters", () => {
    expect(parsePaymentAmountInput("  $ 1 234,56 ")).toBe(123456);
  });

  it("rejects empty, invalid, or negative amounts", () => {
    expect(parsePaymentAmountInput("")).toBeNull();
    expect(parsePaymentAmountInput("abc")).toBeNull();
    expect(parsePaymentAmountInput("-10")).toBeNull();
  });
});
