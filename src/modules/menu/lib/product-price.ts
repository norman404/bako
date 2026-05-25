export function formatProductPriceInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function parseProductPriceInput(value: string): number | null {
  const normalized = value.trim().replace(/\s+/g, "").replace(/[^\d,.-]/g, "");

  if (normalized.length === 0) {
    return null;
  }

  const parsed = Number.parseFloat(normalized.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
}
