import type { i18n } from 'i18next';
import { useSettingsStore } from '@/modules/settings/store/settings-store';

let isChangingLanguage = false;

export function wireI18nWithSettings(i18nInstance: i18n): () => void {
  const unsubscribe = useSettingsStore.subscribe((state, prevState) => {
    const newLocale = state.locale;
    const prevLocale = prevState.locale;

    // Only change if locale actually changed and we're not already changing
    if (newLocale !== prevLocale && newLocale !== i18nInstance.language && !isChangingLanguage) {
      isChangingLanguage = true;
      i18nInstance.changeLanguage(newLocale).finally(() => {
        isChangingLanguage = false;
      });
    }
  });

  return unsubscribe;
}
