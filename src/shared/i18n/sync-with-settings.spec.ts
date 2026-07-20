import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { i18n } from 'i18next';
import { wireI18nWithSettings } from './sync-with-settings';
import { useSettingsStore } from '@/modules/settings/store/settings-store';

function createFakeI18n(initialLanguage = 'es-MX'): i18n {
  let currentLanguage = initialLanguage;
  return {
    language: currentLanguage,
    changeLanguage: mock(async (lng?: string) => {
      if (lng) currentLanguage = lng;
      return Promise.resolve(lng);
    }),
  } as unknown as i18n;
}

const DEFAULT_SETTINGS = {
  currency: 'MXN',
  printerType: 'none',
  printerAddress: null,
  isLoading: false,
} as const;

describe('wireI18nWithSettings', () => {
  beforeEach(() => {
    // Reset store state
    useSettingsStore.setState({ locale: 'es-MX', ...DEFAULT_SETTINGS });
  });

  it('should call changeLanguage when store locale changes', async () => {
    const i18n = createFakeI18n('es-MX');
    wireI18nWithSettings(i18n);

    // Change locale in store
    useSettingsStore.setState({ locale: 'pt-BR', ...DEFAULT_SETTINGS });

    // Wait for async changeLanguage
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(i18n.changeLanguage).toHaveBeenCalledWith('pt-BR');
  });

  it('should not trigger change if locale is same as current', async () => {
    const i18n = createFakeI18n('es-MX');
    wireI18nWithSettings(i18n);

    mock.clearAllMocks();

    // Set same locale
    useSettingsStore.setState({ locale: 'es-MX', ...DEFAULT_SETTINGS });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(i18n.changeLanguage).not.toHaveBeenCalled();
  });

  it('should return unsubscribe function', () => {
    const i18n = createFakeI18n();
    const unsubscribe = wireI18nWithSettings(i18n);

    expect(typeof unsubscribe).toBe('function');
  });
});
