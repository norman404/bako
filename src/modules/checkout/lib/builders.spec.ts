import { describe, expect, it } from "vitest";

import {
  buildCreateOrderInput,
  buildCustomerFormState,
  buildCustomerInput,
  buildEmptyCustomerFormState,
  buildPaymentInput,
  CHECKOUT_PAYMENT_METHOD,
  getPaymentValidationMessage,
  type CheckoutCustomerFormState,
} from "@/modules/checkout/lib/builders";
import type { CheckoutCustomer } from "@/modules/checkout/hooks/use-checkout";
import type { Product } from "@/modules/menu/domain/product";
import type { CartItem } from "@/modules/order/domain/cart";
import { formatPosCurrency } from "@/lib/currency";

const FIXED_DATE = new Date("2026-01-01T00:00:00.000Z");

const CHECKOUT_FULFILLMENT_TYPE = {
  LOCAL: "local",
  DELIVERY: "delivery",
} as const;

function buildProduct(id: string, price: number): Product {
  return {
    id,
    categoryId: "coffee",
    name: `Product ${id}`,
    description: `Description ${id}`,
    price,
    prepTimeMinutes: 5,
    image: "☕",
    isPopular: false,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
  };
}

function buildCartItem(id: string, price: number, quantity = 1): CartItem {
  return {
    product: buildProduct(id, price),
    quantity,
  };
}

function buildCustomer(overrides: Partial<CheckoutCustomer> = {}): CheckoutCustomer {
  return {
    id: "customer-1",
    name: "Valentina Suárez",
    phone: "11 5555 5555",
    address: "Av. Siempre Viva 742",
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...overrides,
  };
}

describe("checkout builders", () => {
  describe("customer helpers", () => {
    it("builds an empty customer form state", () => {
      expect(buildEmptyCustomerFormState()).toEqual({
        name: "",
        phone: "",
        address: "",
      });
    });

    it("maps a saved customer into the form state", () => {
      expect(buildCustomerFormState(buildCustomer())).toEqual({
        name: "Valentina Suárez",
        phone: "11 5555 5555",
        address: "Av. Siempre Viva 742",
      });
    });

    it("builds trimmed customer input and rejects incomplete forms", () => {
      const validForm: CheckoutCustomerFormState = {
        name: "  Valentina Suárez  ",
        phone: " 11 5555 5555 ",
        address: " Av. Siempre Viva 742 ",
      };

      expect(buildCustomerInput(validForm)).toEqual({
        name: "Valentina Suárez",
        phone: "11 5555 5555",
        address: "Av. Siempre Viva 742",
      });
      expect(
        buildCustomerInput({
          name: "Valentina Suárez",
          phone: "",
          address: "Av. Siempre Viva 742",
        }),
      ).toBeNull();
    });
  });

  describe("payment helpers", () => {
    it("validates cash payment input states", () => {
      expect(getPaymentValidationMessage(CHECKOUT_PAYMENT_METHOD.CARD, "", 5500)).toBeNull();
      expect(getPaymentValidationMessage(CHECKOUT_PAYMENT_METHOD.CASH, "", 5500)).toBe(
        "Ingresá el monto recibido en efectivo.",
      );
      expect(getPaymentValidationMessage(CHECKOUT_PAYMENT_METHOD.CASH, "abc", 5500)).toBe(
        "Ingresá un monto válido en efectivo.",
      );
      expect(getPaymentValidationMessage(CHECKOUT_PAYMENT_METHOD.CASH, "50", 5500)).toBe(
        `El efectivo recibido debe cubrir ${formatPosCurrency(5500)}.`,
      );
      expect(getPaymentValidationMessage(CHECKOUT_PAYMENT_METHOD.CASH, "55", 5500)).toBeNull();
    });

    it("builds card and cash payment payloads only when they cover the total", () => {
      expect(buildPaymentInput(CHECKOUT_PAYMENT_METHOD.CARD, "", 5500)).toEqual({
        method: CHECKOUT_PAYMENT_METHOD.CARD,
        amount: 5500,
      });
      expect(buildPaymentInput(CHECKOUT_PAYMENT_METHOD.CASH, "54.99", 5500)).toBeNull();
      expect(buildPaymentInput(CHECKOUT_PAYMENT_METHOD.CASH, "55", 5500)).toEqual({
        method: CHECKOUT_PAYMENT_METHOD.CASH,
        amount: 5500,
      });
    });
  });

  describe("order payload builder", () => {
    const items = [buildCartItem("product-1", 2500, 2), buildCartItem("product-2", 1800, 1)];
    const total = 6800;

    it("returns null when there are no items", () => {
      expect(
        buildCreateOrderInput(
          [],
          CHECKOUT_FULFILLMENT_TYPE.LOCAL,
          null,
          buildEmptyCustomerFormState(),
          CHECKOUT_PAYMENT_METHOD.CASH,
          "68",
          total,
        ),
      ).toBeNull();
    });

    it("builds a local order without customer data", () => {
      const payload = buildCreateOrderInput(
        items,
        CHECKOUT_FULFILLMENT_TYPE.LOCAL,
        null,
        buildEmptyCustomerFormState(),
        CHECKOUT_PAYMENT_METHOD.CARD,
        "",
        total,
      );

      expect(payload).toEqual({
        items: [
          { productId: "product-1", quantity: 2, unitPrice: 2500 },
          { productId: "product-2", quantity: 1, unitPrice: 1800 },
        ],
        fulfillmentType: CHECKOUT_FULFILLMENT_TYPE.LOCAL,
        payment: {
          method: CHECKOUT_PAYMENT_METHOD.CARD,
          amount: total,
        },
      });
    });

    it("builds a delivery order with a selected customer id", () => {
      const payload = buildCreateOrderInput(
        items,
        CHECKOUT_FULFILLMENT_TYPE.DELIVERY,
        "customer-1",
        buildEmptyCustomerFormState(),
        CHECKOUT_PAYMENT_METHOD.CASH,
        "68",
        total,
      );

      expect(payload).toEqual({
        items: [
          { productId: "product-1", quantity: 2, unitPrice: 2500 },
          { productId: "product-2", quantity: 1, unitPrice: 1800 },
        ],
        fulfillmentType: CHECKOUT_FULFILLMENT_TYPE.DELIVERY,
        customerId: "customer-1",
        payment: {
          method: CHECKOUT_PAYMENT_METHOD.CASH,
          amount: total,
        },
      });
    });

    it("builds a delivery order with a new customer when no customer is selected", () => {
      const payload = buildCreateOrderInput(
        items,
        CHECKOUT_FULFILLMENT_TYPE.DELIVERY,
        null,
        {
          name: "  Valentina Suárez  ",
          phone: " 11 5555 5555 ",
          address: " Av. Siempre Viva 742 ",
        },
        CHECKOUT_PAYMENT_METHOD.CASH,
        "68",
        total,
      );

      expect(payload).toEqual({
        items: [
          { productId: "product-1", quantity: 2, unitPrice: 2500 },
          { productId: "product-2", quantity: 1, unitPrice: 1800 },
        ],
        fulfillmentType: CHECKOUT_FULFILLMENT_TYPE.DELIVERY,
        customer: {
          name: "Valentina Suárez",
          phone: "11 5555 5555",
          address: "Av. Siempre Viva 742",
        },
        payment: {
          method: CHECKOUT_PAYMENT_METHOD.CASH,
          amount: total,
        },
      });
    });

    it("returns null when delivery is missing selected or complete customer data", () => {
      expect(
        buildCreateOrderInput(
          items,
          CHECKOUT_FULFILLMENT_TYPE.DELIVERY,
          null,
          {
            name: "Valentina Suárez",
            phone: "",
            address: "Av. Siempre Viva 742",
          },
          CHECKOUT_PAYMENT_METHOD.CASH,
          "68",
          total,
        ),
      ).toBeNull();
    });
  });
});
