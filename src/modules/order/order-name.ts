export const ORDER_NAME_MAX_LENGTH = 40;

export function normalizeOrderName(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
  return normalized.length > 0 ? normalized.slice(0, ORDER_NAME_MAX_LENGTH) : null;
}
