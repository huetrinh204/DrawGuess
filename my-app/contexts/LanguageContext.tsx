"use client"

import { createContext, useContext, useState, useCallback } from "react"
import { translations, Lang } from "./translations"

interface LangContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string, vars?: Record<string, string>) => string
}

const LangCtx = createContext<LangContextType>({
  lang: "vi",
  setLang: () => {},
  t: (key) => key,
})

export const useLang = () => useContext(LangCtx)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("vi")

  const t = useCallback((key: string, vars?: Record<string, string>) => {
    let text = translations[lang][key] || translations.vi[key] || key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`{${k}}`, v)
      }
    }
    return text
  }, [lang])

  return (
    <LangCtx.Provider value={{ lang, setLang, t }}>
      {children}
    </LangCtx.Provider>
  )
}
