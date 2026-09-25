export const ORDER_CHANNEL = {
  LOCAL: "local",
  UBER: "uber",
  DIDI: "didi",
} as const;

export type OrderChannel = (typeof ORDER_CHANNEL)[keyof typeof ORDER_CHANNEL];

export const DELIVERY_REFERENCE_MAX_LENGTH = 24;

export function isOrderChannel(value: string): value is OrderChannel {
  return Object.values(ORDER_CHANNEL).some((channel) => channel === value);
}

export function normalizeDeliveryReference(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim() ?? "";
  return normalized ? normalized.slice(0, DELIVERY_REFERENCE_MAX_LENGTH) : null;
}

export function orderPrintName(
  channel: OrderChannel,
  reference: string | null,
  orderName: string | null,
  ticketNumber: number,
): string | null {
  if (channel === ORDER_CHANNEL.LOCAL) return orderName;
  const origin = channel === ORDER_CHANNEL.DIDI ? "DIDI" : "UBER";
  return [`${origin} ${reference ?? `#${ticketNumber}`}`, orderName].filter(Boolean).join(" · ");
}
