import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';


import { en } from '../locales/en';
import { es } from '../locales/es'; 
import { fr } from '../locales/fr'; 
import { de } from '../locales/de';
import { it } from '../locales/it'; 
import { pt } from '../locales/pt'; 

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { ...en },
      zh_tw: { ...en }, // Traditional Chinese
      zh_cn: { ...en }, // Simplified Chinese
      ja: { ...en },    // Japanese
      ko: { ...en },    // Korean
      id: { ...en },    // Indonesian
      vi: { ...en },    // Vietnamese
      fr: { ...en },    // French
      es: { ...en },    // Spanish
      tr: { ...en },    // Turkish
      pl: { ...en },    // Polish
      it: { ...en },    // Italian
      pt: { ...en },    // Portuguese
      nl: { ...en },    // Dutch
      de: { ...en },    // German
      ru: { ...en },    // Russian
      bg: { ...en },    // Bulgarian
      da: { ...en },    // Danish
      fi: { ...en },    // Finnish
      hu: { ...en },    // Hungarian
      no: { ...en },    // Norwegian
      ro: { ...en },    // Romanian
      sk: { ...en },    // Slovak
      sv: { ...en },    // Swedish
      cs: { ...en },    // Czech
      uk: { ...en },    // Ukrainian
      el: { ...en },    // Greek
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false }
  });

export default i18n;

// The list for your Settings Page Dropdown
export const LANGUAGES = [
  { code: 'en', label: 'English', currency: 'USD' },
  { code: 'zh_tw', label: '繁體中文', currency: 'TWD' },
  { code: 'zh_cn', label: '简体中文', currency: 'CNY' },
  { code: 'ja', label: '日本語', currency: 'JPY' },
  { code: 'ko', label: '한국어', currency: 'KRW' },
  { code: 'id', label: 'Bahasa Indonesia', currency: 'IDR' },
  { code: 'vi', label: 'Tiếng Việt', currency: 'VND' },
  { code: 'fr', label: 'Français', currency: 'EUR' },
  { code: 'es', label: 'Español', currency: 'EUR' },
  { code: 'tr', label: 'Türkçe', currency: 'TRY' },
  { code: 'pl', label: 'Polski', currency: 'PLN' },
  { code: 'it', label: 'Italiano', currency: 'EUR' },
  { code: 'pt', label: 'Português', currency: 'BRL' },
  { code: 'nl', label: 'Nederlands', currency: 'EUR' },
  { code: 'de', label: 'Deutsch', currency: 'EUR' },
  { code: 'ru', label: 'Русский', currency: 'RUB' },
  { code: 'bg', label: 'български', currency: 'BGN' },
  { code: 'da', label: 'Dansk', currency: 'DKK' },
  { code: 'fi', label: 'Suomi', currency: 'EUR' },
  { code: 'hu', label: 'Magyar', currency: 'HUF' },
  { code: 'no', label: 'Norsk', currency: 'NOK' },
  { code: 'ro', label: 'Română', currency: 'RON' },
  { code: 'sk', label: 'Slovenský', currency: 'EUR' },
  { code: 'sv', label: 'Svenska', currency: 'SEK' },
  { code: 'cs', label: 'Čeština', currency: 'CZK' },
  { code: 'uk', label: 'Українська', currency: 'UAH' },
  { code: 'el', label: 'Ελληνικά', currency: 'EUR' },
];