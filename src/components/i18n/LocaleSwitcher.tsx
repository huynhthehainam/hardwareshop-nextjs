"use client"

import { Languages } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { locales, type Locale } from "@/lib/i18n/config"
import { useI18n } from "./I18nProvider"

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <div className="flex items-center gap-2">
      <Languages className="size-4 text-[#059669]" />
      <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
        <SelectTrigger
          className="h-10 w-[140px] rounded-xl border-[#E2E8F0] bg-white focus:ring-[#059669]/10"
          aria-label={t("language")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-[#E2E8F0] bg-white">
          {(locales as readonly Locale[]).map((l) => (
            <SelectItem key={l} value={l} className="cursor-pointer py-2">
              {l === "en" ? t("english") : t("vietnamese")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

