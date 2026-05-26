import { describe, it, expect, beforeEach } from 'vitest';
import i18next from 'i18next';
import { initI18n } from './index';

describe('initI18n', () => {
  beforeEach(async () => {
    // Reset i18next state before each test
    if (i18next.isInitialized) {
      await i18next.changeLanguage('es-MX');
    }
  });

  it('should initialize with es-MX by default', async () => {
    await initI18n();

    expect(i18next.language).toBe('es-MX');
    expect(i18next.options.fallbackLng).toContain('es-MX');
    expect(i18next.hasResourceBundle('es-MX', 'common')).toBe(true);
  });

  it('should initialize with given locale', async () => {
    await initI18n({ lng: 'pt-BR' });

    expect(i18next.language).toBe('pt-BR');
  });

  it('should fallback to es-MX for unsupported locale', async () => {
    await initI18n({ lng: 'xx-YY' });

    // i18next should fallback to es-MX
    expect(i18next.options.fallbackLng).toContain('es-MX');
  });
});
