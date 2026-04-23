import { defaultLocale, type Locale } from "./config"
import { messages, type MessageKey } from "./messages"

export function createTranslator(locale: Locale) {
  return function t(key: MessageKey) {
    return messages[locale]?.[key] ?? messages[defaultLocale][key] ?? key
  }
}

