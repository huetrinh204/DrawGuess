"use client"

import { useGameStore } from "@/store/gameStore"
import { useLang } from "@/contexts/LanguageContext"

export default function PlayerList() {
  const { t } = useLang()
  const players = useGameStore(s => s.players)
  const scores = useGameStore(s => s.scores)
  const drawerId = useGameStore(s => s.drawerId)
  const mySocketId = useGameStore(s => s.mySocketId)
  const scorePopups = useGameStore(s => s.scorePopups)

  const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
  const leader = sorted[0]

  const medalIcon = (rank: number) => {
    if (rank === 0) return "🥇"
    if (rank === 1) return "🥈"
    if (rank === 2) return "🥉"
    return null
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
      {/* Header */}
      <div className="bg-[#9333EA] px-4 py-3 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 opacity-80" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
          <span className="font-bold text-sm">{t("app.players_title")}</span>
        </div>
        <span className="bg-purple-400/50 px-2 py-0.5 rounded-full text-[10px] font-bold">{players.length}</span>
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {sorted.map((p, idx) => {
          const isDrawing = p.id === drawerId
          const isMe = p.id === mySocketId
          const score = scores[p.id] || 0
          // tìm popup cho player này (khớp theo tên vì scorePopup dùng playerName)
          const popup = scorePopups.find(sp => sp.name === p.name)

          return (
            <div key={p.id} className="relative">
              <div
                className={`relative flex items-center p-2 rounded-2xl border-2 transition-all ${
                  isDrawing ? "border-teal-400 bg-teal-50" : "border-gray-50 bg-gray-50"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-orange-100 border-2 border-white shadow-sm">
                    <img src={p.avatar || ""} alt={p.name} width={40} height={40} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  {isDrawing && (
                    <div className="absolute -bottom-1 -right-1 bg-teal-500 text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-white text-[8px]">✏️</div>
                  )}
                  {idx === 0 && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px]">👑</div>
                  )}
                </div>

                {/* Name & score */}
                <div className="ml-2 flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-gray-700 truncate leading-none">{p.name}</span>
                    {isMe && <span className="text-[9px] text-purple-400 font-medium shrink-0">({t("app.you")})</span>}
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                    ⭐ {score} {t("app.score")}
                  </div>
                </div>

                {/* Rank */}
                <div className="shrink-0 ml-1">
                  {medalIcon(idx) ? (
                    <span className="text-base">{medalIcon(idx)}</span>
                  ) : (
                    <span className="text-sm font-black text-gray-300">{idx + 1}</span>
                  )}
                </div>
              </div>

              {/* Score popup — floats to the left of the card */}
              {popup && (
                <div
                  key={popup.id}
                  className="absolute top-1/2 -left-2 -translate-x-full -translate-y-1/2 pointer-events-none z-20
                             flex items-center gap-1 bg-green-500 text-white text-xs font-black
                             px-2.5 py-1 rounded-xl shadow-lg"
                  style={{ animation: "playerScorePop 2.2s ease-out both" }}
                >
                  +{popup.points} 🎉
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Leader banner */}
      {leader && (
        <div className="shrink-0 m-3 bg-yellow-50 border border-yellow-200 p-3 rounded-2xl flex items-center gap-2">
          <div className="bg-orange-400 text-white p-1.5 rounded-xl text-sm shrink-0">🏆</div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-orange-800 font-bold text-xs truncate">{leader.name} {t("app.leader_title")}</span>
            <span className="text-orange-500 text-[10px]">{scores[leader.id] || 0} {t("app.leader_score")}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes playerScorePop {
          0%   { opacity: 0; transform: translate(-100%, -50%) scale(0.7); }
          15%  { opacity: 1; transform: translate(-100%, -50%) scale(1.1); }
          30%  { transform: translate(-100%, -60%) scale(1); }
          70%  { opacity: 1; transform: translate(-100%, -70%); }
          100% { opacity: 0; transform: translate(-100%, -85%); }
        }
      `}</style>
    </div>
  )
}
