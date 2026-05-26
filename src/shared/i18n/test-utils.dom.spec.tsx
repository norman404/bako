import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import { renderWithI18n, createTestI18n } from './test-utils';

function TestComponent() {
  const { t, i18n } = useTranslation();
  return (
    <div>
      <p data-testid="locale">{i18n.language}</p>
      <p data-testid="key">{t('common:test.key')}</p>
    </div>
  );
}

describe('test-utils', () => {
  describe('renderWithI18n', () => {
    it('should render with es-MX by default', () => {
      renderWithI18n(<TestComponent />);

      expect(screen.getByTestId('locale')).toHaveTextContent('es-MX');
    });

    it('should render with custom locale', () => {
      renderWithI18n(<TestComponent />, { locale: 'pt-BR' });

      expect(screen.getByTestId('locale')).toHaveTextContent('pt-BR');
    });

    it('should use custom resources', () => {
      const customResources = {
        'es-MX': {
          common: {
            test: {
              key: 'Custom Value',
            },
          },
        },
      };

      renderWithI18n(<TestComponent />, { resources: customResources });

      expect(screen.getByTestId('key')).toHaveTextContent('Custom Value');
    });
  });

  describe('createTestI18n', () => {
    it('should create isolated i18next instance', () => {
      const instance1 = createTestI18n();
      const instance2 = createTestI18n();

      expect(instance1).not.toBe(instance2);
    });

    it('should initialize with es-MX by default', () => {
      const instance = createTestI18n();

      expect(instance.language).toBe('es-MX');
    });

    it('should initialize with given locale', () => {
      const instance = createTestI18n(undefined, 'en-US');

      expect(instance.language).toBe('en-US');
    });
  });
});
