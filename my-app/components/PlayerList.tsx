"use client"

import { useGameStore } from "@/store/gameStore"

export default function PlayerList() {
  const players = useGameStore(s => s.players)
  const scores = useGameStore(s => s.scores)
  const drawerId = useGameStore(s => s.drawerId)
  const mySocketId = useGameStore(s => s.mySocketId)

  const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))

  return (
    <div className="border rounded bg-white h-full">
      <div className="p-2 border-b font-semibold text-sm bg-gray-50">Người chơi</div>
      <ul className="p-2 space-y-2">
        {sorted.map(p => (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-50 border border-gray-200">
                <img src={p.avatar || ""} alt={p.name} className="w-full h-full object-cover" />
              </div>
              {p.id === drawerId && (
                <span className="absolute -bottom-1 -right-1 text-xs leading-none">🎨</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 truncate">
                <span className="truncate font-medium">{p.name}</span>
                {p.id === mySocketId && <span className="text-xs text-gray-400 shrink-0">(bạn)</span>}
              </div>
              <div className="text-xs text-blue-600 font-mono">{scores[p.id] || 0} đ</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
