export interface SystemSettings {
  locale: string;
  currency: string;
}

export const DEFAULT_CURRENCY_CONFIG: SystemSettings = {
  locale: "es-MX",
  currency: "MXN",
};
