import { describe, expect, it } from "bun:test";

import {
  computeChangeAmount,
  computeIsDisabled,
  computeReceivedAmount,
} from "@/modules/checkout/hooks/use-checkout-form";
import { CHECKOUT_PAYMENT_METHOD } from "@/modules/checkout/lib/builders";
import { buildCartItem } from "@/modules/order/test/factories";

describe("useCheckoutForm helpers", () => {
  describe("computeReceivedAmount", () => {
    it("returns null for empty or invalid cash input", () => {
      expect(computeReceivedAmount(CHECKOUT_PAYMENT_METHOD.CASH, "", 5500)).toBeNull();
      expect(computeReceivedAmount(CHECKOUT_PAYMENT_METHOD.CASH, "abc", 5500)).toBeNull();
    });

    it("parses supported cash inputs into cents", () => {
      expect(computeReceivedAmount(CHECKOUT_PAYMENT_METHOD.CASH, "55", 5500)).toBe(5500);
      expect(computeReceivedAmount(CHECKOUT_PAYMENT_METHOD.CASH, "55.00", 5500)).toBe(5500);
      expect(computeReceivedAmount(CHECKOUT_PAYMENT_METHOD.CASH, "55,00", 5500)).toBe(5500);
    });

    it("uses the total amount for card payments", () => {
      expect(computeReceivedAmount(CHECKOUT_PAYMENT_METHOD.CARD, "", 5500)).toBe(5500);
    });
  });

  describe("computeChangeAmount", () => {
    it("returns null for card payments and invalid cash amounts", () => {
      expect(computeChangeAmount(CHECKOUT_PAYMENT_METHOD.CARD, "", 5500)).toBeNull();
      expect(computeChangeAmount(CHECKOUT_PAYMENT_METHOD.CASH, "abc", 5500)).toBeNull();
    });

    it("returns the positive difference for cash and clamps underpayments to zero", () => {
      expect(computeChangeAmount(CHECKOUT_PAYMENT_METHOD.CASH, "60", 5500)).toBe(500);
      expect(computeChangeAmount(CHECKOUT_PAYMENT_METHOD.CASH, "50", 5500)).toBe(0);
    });
  });

  describe("computeIsDisabled", () => {
    const items = [buildCartItem()];

    it("returns true when the cart is empty", () => {
      expect(computeIsDisabled([], false, null)).toBe(true);
    });

    it("returns true when checkout is submitting", () => {
      expect(computeIsDisabled(items, true, null)).toBe(true);
    });

    it("returns true when payment validation blocks checkout", () => {
      expect(computeIsDisabled(items, false, "Ingresá un monto válido en efectivo.")).toBe(true);
    });

    it("returns false when the cart is ready to submit", () => {
      expect(computeIsDisabled(items, false, null)).toBe(false);
    });
  });
});
