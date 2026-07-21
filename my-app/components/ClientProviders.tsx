"use client"

import AudioProvider from "@/components/AudioProvider"
import { LanguageProvider, useLang } from "@/contexts/LanguageContext"
import { usePathname } from "next/navigation"

function LangSwitcher() {
  const { lang, setLang } = useLang()
  const pathname = usePathname()
  if (pathname?.startsWith("/game")) return null
  return (
    <button
      onClick={() => setLang(lang === "vi" ? "en" : "vi")}
      className="fixed top-4 left-4 z-50 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center overflow-hidden hover:scale-110 transition-all duration-200 active:scale-95"
      title={lang === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
    >
      {lang === "vi" ? (
        <svg className="w-7 h-7" viewBox="0 0 640 480">
          <rect width="640" height="480" fill="#DA251D"/>
          <polygon fill="#FF0"
            points="320,90 355,196 468,196 375,261 408,368 320,303 232,368 265,261 172,196 285,196"
          />
        </svg>
      ) : (
        <svg className="w-7 h-7" viewBox="0 0 60 30">
          <rect width="60" height="30" fill="#012169"/>
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
          <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10"/>
          <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6"/>
        </svg>
      )}
    </button>
  )
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AudioProvider>
        <LangSwitcher />
        {children}
      </AudioProvider>
    </LanguageProvider>
  )
}
