import { defaultLocale, type Locale } from "./config"
import { messages, type MessageKey } from "./messages"

export function createTranslator(locale: Locale) {
  return function t(key: MessageKey | string, params?: Record<string, string | number | boolean | null | undefined>) {
    const localeMessages = messages[locale]
    const fallbackMessages = messages[defaultLocale]
    const typedKey = key as MessageKey

    const message =
      (Object.prototype.hasOwnProperty.call(localeMessages, key) ? localeMessages[typedKey] : undefined) ??
      (Object.prototype.hasOwnProperty.call(fallbackMessages, key) ? fallbackMessages[typedKey] : undefined) ??
      key
    if (!params) return message
    return interpolateMessage(message, params)
  }
}

export function interpolateMessage(
  template: string,
  params: Record<string, string | number | boolean | null | undefined>
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key]
    return value == null ? `{${key}}` : String(value)
  })
}
