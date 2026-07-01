import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './locales/en.json';
import fr from './locales/fr.json';
import type { AppLanguage } from '../types/settings.types';

export type { AppLanguage };

export function resolveLanguage(setting: AppLanguage): 'en' | 'fr' {
    if (setting === 'system') {
        const code = getLocales()[0]?.languageCode ?? 'en';
        return code.startsWith('fr') ? 'fr' : 'en';
    }
    return setting;
}

export async function initI18n(languageSetting: AppLanguage): Promise<void> {
    const language = resolveLanguage(languageSetting);
    await i18next.use(initReactI18next).init({
        lng: language,
        fallbackLng: 'en',
        resources: {
            en: { translation: en },
            fr: { translation: fr },
        },
        interpolation: { escapeValue: false },
    });
}

export function applyLanguage(setting: AppLanguage): void {
    i18next.changeLanguage(resolveLanguage(setting));
}
