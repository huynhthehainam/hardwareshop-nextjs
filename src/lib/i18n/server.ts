import { cookies } from "next/headers"

import { defaultLocale, localeCookieName, locales, type Locale } from "./config"

export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  const value = store.get(localeCookieName)?.value
  if (value && (locales as readonly string[]).includes(value)) return value as Locale
  return defaultLocale
}

