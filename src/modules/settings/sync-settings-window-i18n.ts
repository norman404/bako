import type { i18n } from "i18next";

import { useSettingsWindowStore } from "./settings-window-store";

export function wireSettingsWindowI18n(i18nInstance: i18n): () => void {
  return useSettingsWindowStore.subscribe((state, previousState) => {
    const locale = state.snapshot?.locale;
    const previousLocale = previousState.snapshot?.locale;

    if (locale && locale !== previousLocale && locale !== i18nInstance.language) {
      void i18nInstance.changeLanguage(locale);
    }
  });
}
