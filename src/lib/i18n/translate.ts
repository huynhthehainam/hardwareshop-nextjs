import { defaultLocale, type Locale } from "./config"
import { messages, type MessageKey } from "./messages"

export function createTranslator(locale: Locale) {
  return function t(key: MessageKey, params?: Record<string, string | number | boolean | null | undefined>) {
    const message = messages[locale]?.[key] ?? messages[defaultLocale][key] ?? key
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
