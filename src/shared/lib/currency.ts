import { useSettingsStore } from "@/features/settings/store/settings-store";

const formatterCache = new Map<string, Intl.NumberFormat>();

const getFormatter = (locale: string, currency: string) => {
  const cacheKey = `${locale}-${currency}`;
  if (!formatterCache.has(cacheKey)) {
    formatterCache.set(
      cacheKey,
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
  }
  return formatterCache.get(cacheKey)!;
};

export const formatPosCurrency = (cents: number): string => {
  const amount = cents / 100;
  const { locale, currency } = useSettingsStore.getState();
  return getFormatter(locale, currency).format(amount);
};

export const sortStrings = (strings: string[]): string[] => {
  const { locale } = useSettingsStore.getState();
  return [...strings].sort((a, b) => a.localeCompare(b, locale, { sensitivity: "base" }));
};

