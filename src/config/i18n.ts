import i18next from "i18next";
import Backend from "i18next-fs-backend";
import * as middleware from "i18next-http-middleware";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const initI18n = async () => {
  await i18next
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
      fallbackLng: "en", // Default language
      supportedLngs: ["en", "ko", "zh", "jp"], // English, Korean, Chinese, Japanese
      preload: ["en", "ko", "zh", "jp"],

      backend: {
        loadPath: path.join(__dirname, "../locales/{{lng}}/translation.json"),
      },

      detection: {
        order: ["header", "querystring", "cookie"], // Priority order
        lookupHeader: "accept-language", // Standard header
        lookupQuerystring: "lang", // ?lang=ko
        lookupCookie: "i18next", // Optional: persist via cookie
        caches: ["cookie"], // Cache detected language
      },

      interpolation: {
        escapeValue: false, // React already escapes, safe for API too
      },
    });

  return i18next;
};
