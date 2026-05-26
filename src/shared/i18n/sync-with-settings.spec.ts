import { describe, it, expect, beforeEach, vi } from 'vitest';
import i18next from 'i18next';
import { wireI18nWithSettings } from './sync-with-settings';
import { useSettingsStore } from '@/modules/settings/store/settings-store';

describe('wireI18nWithSettings', () => {
  beforeEach(() => {
    // Reset store state
    useSettingsStore.setState({ locale: 'es-MX', currency: 'MXN', isLoading: false });
    
    // Mock i18next changeLanguage
    vi.spyOn(i18next, 'changeLanguage').mockImplementation(async (lng?: string) => {
      (i18next as any).language = lng;
      return lng as any;
    });
  });

  it('should call changeLanguage when store locale changes', async () => {
    wireI18nWithSettings(i18next);

    // Change locale in store
    useSettingsStore.setState({ locale: 'pt-BR' });

    // Wait for async changeLanguage
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(i18next.changeLanguage).toHaveBeenCalledWith('pt-BR');
  });

  it('should not trigger change if locale is same as current', async () => {
    (i18next as any).language = 'es-MX';
    wireI18nWithSettings(i18next);

    vi.clearAllMocks();

    // Set same locale
    useSettingsStore.setState({ locale: 'es-MX' });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(i18next.changeLanguage).not.toHaveBeenCalled();
  });

  it('should return unsubscribe function', () => {
    const unsubscribe = wireI18nWithSettings(i18next);

    expect(typeof unsubscribe).toBe('function');
  });
});
