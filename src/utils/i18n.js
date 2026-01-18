import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';


import { en } from '../locales/en';
import { es } from '../locales/es'; 
import { fr } from '../locales/fr'; 
import { de } from '../locales/de';
import { it } from '../locales/it'; 
import { pt } from '../locales/pt'; 
import { hi } from '../locales/hi'; 
import { ja } from '../locales/ja'; 
import { ko } from '../locales/ko'; 
import { id } from '../locales/id'; 
import { vi } from '../locales/vi'; 
import { tr } from '../locales/tr'; 
import { ru } from '../locales/ru'; 
import { nl } from '../locales/nl'; 
import { bg } from '../locales/bg'; 
import { da } from '../locales/da'; 
import { pl } from '../locales/pl'; 
//import { hi } from 'date-fns/locale';


  // The list for your Settings Page Dropdown
export const LANGUAGES = [
  { code: 'en', label: 'English', currency: 'USD' },
  { code: 'zh_tw', label: 'Traditional Chinese', currency: 'TWD' },
  { code: 'zh_cn', label: 'Simplified Chinese', currency: 'CNY' },
  { code: 'ja', label: 'Japanese', currency: 'JPY' },
  { code: 'ko', label: 'Korean', currency: 'KRW' },
  { code: 'id', label: 'Bahasa Indonesia', currency: 'IDR' },
  { code: 'vi', label: 'Vietnamese', currency: 'VND' },
  { code: 'fr', label: 'French', currency: 'EUR' },
  { code: 'es', label: 'Español', currency: 'EUR' },
  { code: 'tr', label: 'Türkçe', currency: 'TRY' },
  { code: 'pl', label: 'Polski', currency: 'PLN' },
  { code: 'it', label: 'Italiano', currency: 'EUR' },
  { code: 'pt', label: 'Português', currency: 'BRL' },
  { code: 'nl', label: 'Nederlands', currency: 'EUR' },
  { code: 'de', label: 'Deutsch', currency: 'EUR' },
  { code: 'ru', label: 'Russian', currency: 'RUB' },
  { code: 'bg', label: 'Bulgarian', currency: 'BGN' },
  { code: 'da', label: 'Danish', currency: 'DKK' },
  { code: 'fi', label: 'Finnish', currency: 'EUR' },
  { code: 'hu', label: 'Hungarian', currency: 'HUF' },
  { code: 'no', label: 'Norwegian', currency: 'NOK' },
  { code: 'ro', label: 'Romanian', currency: 'RON' },
  { code: 'sk', label: 'Slovakian', currency: 'EUR' },
  { code: 'sv', label: 'Svenska', currency: 'SEK' },
  { code: 'cs', label: 'Čeština', currency: 'CZK' },
  { code: 'uk', label: 'Українська', currency: 'UAH' },
  { code: 'el', label: 'Ελληνικά', currency: 'EUR' },
  { code: 'hi', label: 'Hindi', currency: 'INR' },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {  ...en },
    //  zh_tw: { ...en }, // Traditional Chinese
    //  zh_cn: { ...en }, // Simplified Chinese
      ja: { ...ja },    // Japanese
      ko: { ...ko },    // Korean
      id: { ...id },    // Indonesian
      vi: { ...vi },    // Vietnamese
      fr: { ...fr },    // French
      es: { ...es },    // Spanish
      tr: { ...tr },    // Turkish
      pl: { ...pl },    // Polish
      it: { ...it },    // Italian
      pt: { ...pt },    // Portuguese
      nl: { ...nl },    // Dutch
      de: { ...de },    // German
      ru: { ...ru },    // Russian
      bg: { ...bg },    // Bulgarian
      da: { ...da },    // Danish
  //    fi: { ...en },    // Finnish
  //    hu: { ...en },    // Hungarian
  //    no: { ...en },    // Norwegian
  //    ro: { ...en },    // Romanian
  //    sk: { ...en },    // Slovak
  //    sv: { ...sv },    // Swedish
  //    cs: { ...cs },    // Czech
   //   uk: { ...uk },    // Ukrainian
  //    el: { ...el },    // Greek
      hi: { ...hi },    // Hindi
    },
    lng: "en", // Default language
    fallbackLng: "en",
    interpolation: { escapeValue: false }
  });

export default i18n;

