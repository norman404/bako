import i18next, { type Resource } from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { i18nConfig } from './config';

// Import real translation files for tests
import commonES from './locales/es-MX/common.json';
import appES from './locales/es-MX/app.json';
import settingsES from './locales/es-MX/settings.json';
import menuES from './locales/es-MX/menu.json';
import checkoutES from './locales/es-MX/checkout.json';
import orderES from './locales/es-MX/order.json';
import turnoES from './locales/es-MX/turno.json';

const DEFAULT_TEST_RESOURCES: Resource = {
  'es-MX': {
    common: commonES,
    app: appES,
    settings: settingsES,
    menu: menuES,
    checkout: checkoutES,
    order: orderES,
    turno: turnoES,
  },
};

export function createTestI18n(customResources?: Resource, lng = 'es-MX'): typeof i18next {
  const testInstance = i18next.createInstance();
  
  testInstance.use(initReactI18next).init({
    ...i18nConfig,
    lng,
    resources: customResources || DEFAULT_TEST_RESOURCES,
  });

  return testInstance;
}

export interface RenderWithI18nOptions {
  locale?: string;
  resources?: Resource;
}

export function renderWithI18n(
  ui: ReactElement,
  options?: RenderWithI18nOptions,
): RenderResult {
  const testI18n = createTestI18n(options?.resources, options?.locale);

  return render(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>);
}

export { I18nextProvider as I18nProvider };
