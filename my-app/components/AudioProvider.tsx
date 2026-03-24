"use client"

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react"
import { usePathname } from "next/navigation"

interface AudioContextType {
  musicPlaying: boolean
  toggleMusic: () => void
}

const AudioCtx = createContext<AudioContextType>({ musicPlaying: false, toggleMusic: () => {} })

export const useAudio = () => useContext(AudioCtx)

export default function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const pathname = usePathname()

  const isGamePage = pathname?.startsWith("/game")

  useEffect(() => {
    audioRef.current = new Audio("/tiramisucake.mp3")
    audioRef.current.loop = true
    audioRef.current.volume = 0.15
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  // Dừng nhạc khi vào /game, tiếp tục khi rời
  useEffect(() => {
    if (!audioRef.current) return
    if (isGamePage) {
      audioRef.current.pause()
      setMusicPlaying(false)
    } else if (musicPlaying) {
      audioRef.current.play().catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGamePage])

  const toggleMusic = useCallback(() => {
    if (!audioRef.current || isGamePage) return
    if (musicPlaying) {
      audioRef.current.pause()
      setMusicPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setMusicPlaying(true)
    }
  }, [musicPlaying, isGamePage])

  return (
    <AudioCtx.Provider value={{ musicPlaying, toggleMusic }}>
      {children}
      {/* Nút nhạc cố định, ẩn khi đang trong game */}
      {!isGamePage && (
        <button
          onClick={toggleMusic}
          className="fixed top-4 right-4 z-50 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition-all duration-200 active:scale-95"
          title={musicPlaying ? "Tắt nhạc" : "Bật nhạc"}
        >
          {musicPlaying ? "🎵" : "🔇"}
        </button>
      )}
    </AudioCtx.Provider>
  )
}
