"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  defaultLocale,
  localeCookieName,
  locales,
  type Locale,
} from "@/lib/i18n/config"
import { messages, type MessageKey } from "@/lib/i18n/messages"

type I18nContextValue = {
  locale: Locale
  setLocale: (nextLocale: Locale) => void
  t: (key: MessageKey) => string
}

const I18nContext = React.createContext<I18nContextValue | null>(null)

function writeLocaleCookie(nextLocale: Locale) {
  // Persist for 1 year, usable by both server and client.
  document.cookie = `${localeCookieName}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`
}

export function I18nProvider({
  locale: initialLocale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  const router = useRouter()
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale)

  // Keep client state in sync if the server locale changes after refresh.
  React.useEffect(() => {
    setLocaleState(initialLocale)
  }, [initialLocale])

  const setLocale = React.useCallback(
    (nextLocale: Locale) => {
      if (nextLocale === locale) return
      if (!(locales as readonly string[]).includes(nextLocale)) return

      setLocaleState(nextLocale)
      writeLocaleCookie(nextLocale)
      router.refresh()
    },
    [locale, router]
  )

  const t = React.useCallback(
    (key: MessageKey) => messages[locale]?.[key] ?? messages[defaultLocale][key] ?? key,
    [locale]
  )

  const value = React.useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = React.useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}

