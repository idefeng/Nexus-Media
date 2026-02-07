import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files directly to bundle them
import en from '../locales/en/translation.json'
import zh from '../locales/zh/translation.json'
import ja from '../locales/ja/translation.json'

const resources = {
    en: {
        translation: en
    },
    zh: {
        translation: zh
    },
    ja: {
        translation: ja
    }
}

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        // default to english if detection fails
        fallbackLng: 'zh',
        debug: process.env.NODE_ENV === 'development',
        interpolation: {
            escapeValue: false // not needed for react as it escapes by default
        }
    })

export default i18n
