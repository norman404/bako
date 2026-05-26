import { I18nextProvider } from 'react-i18next';
import type { ReactNode, JSX } from 'react';
import { i18n } from './i18n-instance';

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps): JSX.Element {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
