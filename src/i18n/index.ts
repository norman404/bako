import { i18n } from './i18n-instance';
import { initReactI18next } from 'react-i18next';
import { i18nConfig } from './config';
import { resources } from './resources';

export { i18n } from './i18n-instance';

export interface InitI18nOptions {
  lng?: string;
}

export async function initI18n(options?: InitI18nOptions): Promise<void> {
  await i18n
    .use(initReactI18next)
    .init({
      ...i18nConfig,
      lng: options?.lng || 'es-MX',
      resources,
    });
}

export { createTestI18n, renderWithI18n } from './test-utils';
export { I18nProvider } from './I18nProvider';
