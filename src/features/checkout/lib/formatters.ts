export function formatPaymentAmountInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function sanitizePaymentAmountInput(value: string): string {
  return value.replace(/[^\d,.-]/g, "");
}

export function parsePaymentAmountInput(value: string): number | null {
  const normalized = sanitizePaymentAmountInput(value.trim().replace(/\s+/g, ""));

  if (normalized.length === 0) {
    return null;
  }

  const parsed = Number.parseFloat(normalized.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
}
