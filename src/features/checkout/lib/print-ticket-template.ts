import { formatPosCurrency } from "@/shared/lib/currency";

export const PRINT_TICKET_FULFILLMENT_TYPE = {
  LOCAL: "local",
  DELIVERY: "delivery",
} as const;

export type PrintTicketFulfillmentType =
  (typeof PRINT_TICKET_FULFILLMENT_TYPE)[keyof typeof PRINT_TICKET_FULFILLMENT_TYPE];

export const PRINT_TICKET_PAYMENT_METHOD = {
  CASH: "cash",
  CARD: "card",
} as const;

export type PrintTicketPaymentMethod =
  (typeof PRINT_TICKET_PAYMENT_METHOD)[keyof typeof PRINT_TICKET_PAYMENT_METHOD];

const FULFILLMENT_LABEL_BY_TYPE: Record<PrintTicketFulfillmentType, string> = {
  [PRINT_TICKET_FULFILLMENT_TYPE.LOCAL]: "Local",
  [PRINT_TICKET_FULFILLMENT_TYPE.DELIVERY]: "Delivery",
};

const PAYMENT_METHOD_LABEL_BY_TYPE: Record<PrintTicketPaymentMethod, string> = {
  [PRINT_TICKET_PAYMENT_METHOD.CASH]: "Efectivo",
  [PRINT_TICKET_PAYMENT_METHOD.CARD]: "Tarjeta",
};

const PAYMENT_AMOUNT_LABEL_BY_TYPE: Record<PrintTicketPaymentMethod, string> = {
  [PRINT_TICKET_PAYMENT_METHOD.CASH]: "Recibido",
  [PRINT_TICKET_PAYMENT_METHOD.CARD]: "Cobrado",
};

const HTML_ESCAPE_BY_CHARACTER = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
} as const;

type HtmlEscapeCharacter = keyof typeof HTML_ESCAPE_BY_CHARACTER;

const ticketDateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

export interface PrintOrderCustomer {
  name: string;
  phone: string;
  address: string;
}

export interface PrintOrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface PrintOrderOptions {
  ticketNumber: number;
  createdAt: Date;
  total: number;
  items: PrintOrderItem[];
  paymentMethod: PrintTicketPaymentMethod;
  paymentAmount: number;
  fulfillmentType: PrintTicketFulfillmentType;
  customer: PrintOrderCustomer | null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    return HTML_ESCAPE_BY_CHARACTER[character as HtmlEscapeCharacter];
  });
}

function formatTicketNumber(ticketNumber: number): string {
  return String(ticketNumber).padStart(4, "0");
}

function formatTicketTimestamp(createdAt: Date): string {
  return ticketDateFormatter.format(createdAt);
}

function renderTicketItems(items: PrintOrderItem[]): string {
  return items
    .map((item) => {
      const lineTotal = item.unitPrice * item.quantity;

      return `
        <div class="item">
          <div class="line item-row">
            <span class="item-name">${escapeHtml(item.name)}</span>
            <span class="item-total">${formatPosCurrency(lineTotal)}</span>
          </div>
          <div class="item-meta">${item.quantity} × ${formatPosCurrency(item.unitPrice)}</div>
        </div>
      `;
    })
    .join("");
}

function renderCustomerSection(customer: PrintOrderCustomer | null): string {
  if (!customer) {
    return "";
  }

  return `
    <div class="divider"></div>
    <section>
      <p class="section-label">Cliente</p>
      <p class="customer-name">${escapeHtml(customer.name)}</p>
      <p>${escapeHtml(customer.phone)}</p>
      <p>${escapeHtml(customer.address)}</p>
    </section>
  `;
}

export function buildPrintTicketHtml(input: PrintOrderOptions): string {
  const ticketNumber = formatTicketNumber(input.ticketNumber);
  const paymentLabel = PAYMENT_METHOD_LABEL_BY_TYPE[input.paymentMethod];
  const paymentAmountLabel = PAYMENT_AMOUNT_LABEL_BY_TYPE[input.paymentMethod];
  const changeAmount =
    input.paymentMethod === PRINT_TICKET_PAYMENT_METHOD.CASH
      ? Math.max(input.paymentAmount - input.total, 0)
      : null;

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Ticket #${ticketNumber}</title>
        <style>
          :root {
            color-scheme: light;
            font-family: "SF Mono", "JetBrains Mono", "Menlo", monospace;
          }

          * {
            box-sizing: border-box;
          }

          @page {
            size: 80mm auto;
            margin: 6mm;
          }

          body {
            margin: 0;
            background: #ffffff;
            color: #111111;
          }

          .ticket {
            width: 72mm;
            margin: 0 auto;
            padding: 8px 0;
          }

          .brand {
            text-align: center;
            margin-bottom: 12px;
          }

          .brand-title {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .brand-subtitle,
          .meta,
          .item-meta,
          .summary-label,
          .footer {
            color: #4b5563;
          }

          .brand-subtitle,
          .meta,
          .item-meta,
          .summary-label,
          .section-label,
          .footer {
            font-size: 11px;
          }

          .brand-subtitle,
          .section-label {
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .meta-grid,
          .line,
          .summary-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
          }

          .meta-grid {
            flex-direction: column;
            gap: 6px;
          }

          .meta-label,
          .summary-label,
          .section-label {
            font-weight: 700;
          }

          .meta-value,
          .item-total,
          .summary-value {
            text-align: right;
          }

          .divider {
            border-top: 1px dashed #9ca3af;
            margin: 12px 0;
          }

          .items {
            display: grid;
            gap: 10px;
          }

          .item-name,
          .customer-name,
          .summary-total {
            font-weight: 700;
            color: #111111;
          }

          .item-name {
            padding-right: 12px;
          }

          .summary {
            display: grid;
            gap: 6px;
          }

          .summary-total {
            font-size: 16px;
          }

          section p {
            margin: 0;
          }

          .footer {
            text-align: center;
            margin-top: 14px;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <main class="ticket">
          <header class="brand">
            <p class="brand-title">coffee pos</p>
            <p class="brand-subtitle">Ticket ${ticketNumber}</p>
          </header>

          <section class="meta-grid">
            <div class="line meta">
              <span class="meta-label">Fecha</span>
              <span class="meta-value">${escapeHtml(formatTicketTimestamp(input.createdAt))}</span>
            </div>
            <div class="line meta">
              <span class="meta-label">Pedido</span>
              <span class="meta-value">${FULFILLMENT_LABEL_BY_TYPE[input.fulfillmentType]}</span>
            </div>
            <div class="line meta">
              <span class="meta-label">Pago</span>
              <span class="meta-value">${paymentLabel}</span>
            </div>
          </section>

          <div class="divider"></div>

          <section class="items">
            ${renderTicketItems(input.items)}
          </section>

          <div class="divider"></div>

          <section class="summary">
            <div class="summary-row">
              <span class="summary-label">Total</span>
              <span class="summary-value summary-total">${formatPosCurrency(input.total)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">${paymentAmountLabel}</span>
              <span class="summary-value">${formatPosCurrency(input.paymentAmount)}</span>
            </div>
            ${
              changeAmount === null
                ? ""
                : `
                    <div class="summary-row">
                      <span class="summary-label">Cambio</span>
                      <span class="summary-value">${formatPosCurrency(changeAmount)}</span>
                    </div>
                  `
            }
          </section>

          ${renderCustomerSection(input.customer)}

          <p class="footer">
            Gracias por tu compra.<br />
            Ticket generado desde coffee pos.
          </p>
        </main>
      </body>
    </html>
  `;
}
