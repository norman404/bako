import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/currency", () => ({
  formatPosCurrency: (cents: number) => `MXN ${(cents / 100).toFixed(2)}`,
}));

import {
  buildPrintTicketHtml,
  PRINT_TICKET_FULFILLMENT_TYPE,
  PRINT_TICKET_PAYMENT_METHOD,
  type PrintOrderOptions,
} from "@/features/checkout/lib/print-ticket-template";

const FIXED_DATE = new Date("2026-01-15T14:30:00.000Z");

function buildPrintOrderOptions(overrides: Partial<PrintOrderOptions> = {}): PrintOrderOptions {
  const customer =
    "customer" in overrides
      ? overrides.customer ?? null
      : {
          name: 'Ana & "Pablo"',
          phone: "11 5555 5555",
          address: "Calle 123 <B>",
        };

  return {
    ticketNumber: overrides.ticketNumber ?? 42,
    createdAt: overrides.createdAt ?? FIXED_DATE,
    total: overrides.total ?? 7800,
    items: overrides.items ?? [
      {
        name: 'Latte <Especial> & "Grande"',
        quantity: 2,
        unitPrice: 2500,
      },
      {
        name: "Cookie's Choice",
        quantity: 1,
        unitPrice: 2800,
      },
    ],
    paymentMethod: overrides.paymentMethod ?? PRINT_TICKET_PAYMENT_METHOD.CASH,
    paymentAmount: overrides.paymentAmount ?? 10000,
    fulfillmentType: overrides.fulfillmentType ?? PRINT_TICKET_FULFILLMENT_TYPE.DELIVERY,
    customer,
  };
}

describe("buildPrintTicketHtml", () => {
  it("renders the full ticket template for a cash delivery order", () => {
    const html = buildPrintTicketHtml(buildPrintOrderOptions());

    expect(html).toContain("<title>Ticket #0042</title>");
    expect(html).toContain('<p class="brand-subtitle">Ticket 0042</p>');
    expect(html).toContain('<span class="meta-value">Delivery</span>');
    expect(html).toContain('<span class="meta-value">Efectivo</span>');
    expect(html).toContain('<span class="summary-label">Recibido</span>');
    expect(html).toContain("Latte &lt;Especial&gt; &amp; &quot;Grande&quot;");
    expect(html).toContain("Cookie&#39;s Choice");
    expect(html).toContain("Ana &amp; &quot;Pablo&quot;");
    expect(html).toContain("Calle 123 &lt;B&gt;");
    expect(html).toContain("MXN 50.00");
    expect(html).toContain("MXN 78.00");
    expect(html).toContain("MXN 100.00");
    expect(html).toContain("MXN 22.00");
    expect(html).toContain("Gracias por tu compra.");
  });

  it("omits the customer section and the cash change row for card orders", () => {
    const html = buildPrintTicketHtml(
      buildPrintOrderOptions({
        paymentMethod: PRINT_TICKET_PAYMENT_METHOD.CARD,
        paymentAmount: 7800,
        fulfillmentType: PRINT_TICKET_FULFILLMENT_TYPE.LOCAL,
        customer: null,
      }),
    );

    expect(html).toContain('<span class="meta-value">Local</span>');
    expect(html).toContain('<span class="meta-value">Tarjeta</span>');
    expect(html).toContain('<span class="summary-label">Cobrado</span>');
    expect(html).not.toContain(">Cambio<");
    expect(html).not.toContain(">Cliente<");
  });

  it("clamps cash change to zero when the received amount is lower than the total", () => {
    const html = buildPrintTicketHtml(
      buildPrintOrderOptions({
        paymentAmount: 7000,
      }),
    );

    expect(html).toMatch(
      /<span class="summary-label">Cambio<\/span>\s*<span class="summary-value">MXN 0\.00<\/span>/,
    );
  });
});
