import { describe, expect, it } from "bun:test";

import {
  buildCreateOrderInput,
  buildCustomerFormState,
  buildCustomerInput,
  buildEmptyCustomerFormState,
  buildOrderItemsInput,
  buildPaymentInput,
  CHECKOUT_PAYMENT_METHOD,
  getPaymentValidationMessage,
  type CheckoutCustomerFormState,
} from "@/modules/checkout/lib/builders";
import type { CheckoutCustomer } from "@/modules/checkout/hooks/use-checkout";
import type { SelectedModifier } from "@/modules/menu/domain/modifier-group";
import { buildProduct } from "@/modules/menu/test/factories";
import type { CartItem } from "@/modules/order/domain/cart";
import { buildCartItem } from "@/modules/order/test/factories";
import { formatPosCurrency } from "@/lib/currency";

const FIXED_DATE = new Date("2026-01-01T00:00:00.000Z");

const CHECKOUT_FULFILLMENT_TYPE = {
  LOCAL: "local",
  DELIVERY: "delivery",
} as const;

function line(id: string, price: number, quantity = 1): CartItem {
  return buildCartItem({ lineId: `line-${id}`, product: buildProduct({ id, price }), quantity });
}

function buildSelectedModifier(overrides: Partial<SelectedModifier> = {}): SelectedModifier {
  return {
    groupId: overrides.groupId ?? "group-1",
    groupName: overrides.groupName ?? "Nivel de hielo",
    optionId: overrides.optionId ?? "option-1",
    optionName: overrides.optionName ?? "Extra",
    priceDelta: overrides.priceDelta ?? 0,
    textValue: overrides.textValue ?? null,
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
    const items = [line("product-1", 2500, 2), line("product-2", 1800, 1)];
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
          { productId: "product-1", quantity: 2, unitPrice: 2500, modifiers: [] },
          { productId: "product-2", quantity: 1, unitPrice: 1800, modifiers: [] },
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
          { productId: "product-1", quantity: 2, unitPrice: 2500, modifiers: [] },
          { productId: "product-2", quantity: 1, unitPrice: 1800, modifiers: [] },
        ],
        fulfillmentType: CHECKOUT_FULFILLMENT_TYPE.DELIVERY,
        customerId: "customer-1",
        deliveryPersonId: null,
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
          { productId: "product-1", quantity: 2, unitPrice: 2500, modifiers: [] },
          { productId: "product-2", quantity: 1, unitPrice: 1800, modifiers: [] },
        ],
        fulfillmentType: CHECKOUT_FULFILLMENT_TYPE.DELIVERY,
        customer: {
          name: "Valentina Suárez",
          phone: "11 5555 5555",
          address: "Av. Siempre Viva 742",
        },
        deliveryPersonId: null,
        payment: {
          method: CHECKOUT_PAYMENT_METHOD.CASH,
          amount: total,
        },
      });
    });

    it("includes deliveryPersonId in delivery order when provided", () => {
      const payload = buildCreateOrderInput(
        items,
        CHECKOUT_FULFILLMENT_TYPE.DELIVERY,
        "customer-1",
        buildEmptyCustomerFormState(),
        CHECKOUT_PAYMENT_METHOD.CASH,
        "68",
        total,
        "dp-123",
      );

      expect(payload).toEqual({
        items: [
          { productId: "product-1", quantity: 2, unitPrice: 2500, modifiers: [] },
          { productId: "product-2", quantity: 1, unitPrice: 1800, modifiers: [] },
        ],
        fulfillmentType: CHECKOUT_FULFILLMENT_TYPE.DELIVERY,
        customerId: "customer-1",
        deliveryPersonId: "dp-123",
        payment: {
          method: CHECKOUT_PAYMENT_METHOD.CASH,
          amount: total,
        },
      });
    });

    it("does not include deliveryPersonId in local orders even when provided", () => {
      const payload = buildCreateOrderInput(
        items,
        CHECKOUT_FULFILLMENT_TYPE.LOCAL,
        null,
        buildEmptyCustomerFormState(),
        CHECKOUT_PAYMENT_METHOD.CARD,
        "",
        total,
        "dp-123",
      );

      expect(payload).toEqual({
        items: [
          { productId: "product-1", quantity: 2, unitPrice: 2500, modifiers: [] },
          { productId: "product-2", quantity: 1, unitPrice: 1800, modifiers: [] },
        ],
        fulfillmentType: CHECKOUT_FULFILLMENT_TYPE.LOCAL,
        payment: {
          method: CHECKOUT_PAYMENT_METHOD.CARD,
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

  describe("buildOrderItemsInput — modifier propagation", () => {
    it("propagates modifiers and computes unitPrice as base price + sum of priceDeltas", () => {
      const modifiers = [
        buildSelectedModifier({ groupId: "g1", groupName: "Hielo", optionId: "o1", optionName: "Extra", priceDelta: 500 }),
        buildSelectedModifier({ groupId: "g2", groupName: "Crema", optionId: "o2", optionName: "Crema", priceDelta: 300 }),
      ];
      const cartItems = [
        buildCartItem({
          lineId: "line-cafe",
          product: buildProduct({ id: "cafe", price: 5000 }),
          quantity: 1,
          selectedModifiers: modifiers,
        }),
      ];

      const result = buildOrderItemsInput(cartItems);

      expect(result).toHaveLength(1);
      expect(result[0]!.productId).toBe("cafe");
      expect(result[0]!.quantity).toBe(1);
      expect(result[0]!.unitPrice).toBe(5800);
      expect(result[0]!.modifiers).toHaveLength(2);
      expect(result[0]!.modifiers![0]).toEqual({
        groupId: "g1",
        groupName: "Hielo",
        optionId: "o1",
        optionName: "Extra",
        priceDelta: 500,
        textValue: null,
      });
      expect(result[0]!.modifiers![1]).toEqual({
        groupId: "g2",
        groupName: "Crema",
        optionId: "o2",
        optionName: "Crema",
        priceDelta: 300,
        textValue: null,
      });
    });

    it("handles item without modifiers: unitPrice = product price, modifiers = []", () => {
      const cartItems = [line("te", 4000, 2)];

      const result = buildOrderItemsInput(cartItems);

      expect(result).toHaveLength(1);
      expect(result[0]!.unitPrice).toBe(4000);
      expect(result[0]!.modifiers).toEqual([]);
    });

    it("ignores text modifier priceDelta (delta 0) but still propagates the text entry", () => {
      const modifiers = [
        buildSelectedModifier({
          groupId: "g-comments",
          groupName: "Comentarios",
          optionId: null,
          optionName: null,
          priceDelta: 0,
          textValue: "sin azúcar",
        }),
      ];
      const cartItems = [
        buildCartItem({
          lineId: "line-cafe",
          product: buildProduct({ id: "cafe", price: 5000 }),
          quantity: 1,
          selectedModifiers: modifiers,
        }),
      ];

      const result = buildOrderItemsInput(cartItems);

      expect(result[0]!.unitPrice).toBe(5000);
      expect(result[0]!.modifiers).toHaveLength(1);
      expect(result[0]!.modifiers![0]!.textValue).toBe("sin azúcar");
      expect(result[0]!.modifiers![0]!.priceDelta).toBe(0);
    });

    it("propagates modifiers across multiple items independently", () => {
      const cartItems = [
        buildCartItem({
          lineId: "line-cafe",
          product: buildProduct({ id: "cafe", price: 5000 }),
          quantity: 1,
          selectedModifiers: [buildSelectedModifier({ priceDelta: 500 })],
        }),
        line("te", 4000, 3),
      ];

      const result = buildOrderItemsInput(cartItems);

      expect(result).toHaveLength(2);
      expect(result[0]!.unitPrice).toBe(5500);
      expect(result[0]!.modifiers).toHaveLength(1);
      expect(result[1]!.unitPrice).toBe(4000);
      expect(result[1]!.modifiers).toEqual([]);
    });
  });
});
