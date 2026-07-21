"use client"

import { useState } from "react"
import { HelpCircle } from "lucide-react"

export default function PlayerAvatar({ src, name, size = "w-10 h-10" }: { src: string; name: string; size?: string }) {
  const [error, setError] = useState(false)
  return (
    <div className={`${size} rounded-full overflow-hidden bg-orange-100 border-2 border-white shadow-sm`}>
      {error || !src ? (
        <div className="w-full h-full flex items-center justify-center bg-purple-50 text-purple-400">
          <HelpCircle className="w-5 h-5" />
        </div>
      ) : (
        <img
          src={src}
          alt={name}
          width={40}
          height={40}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  )
}
