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

          const showGlow = idx === 0 && (scores[p.id] || 0) > 0

          return (
            <div key={p.id} className="relative">
              <div
                className={`relative flex items-center p-2 rounded-2xl border-2 transition-all ${
                  isDrawing ? "border-teal-400 bg-teal-50" : "border-gray-50 bg-gray-50"
                } ${showGlow ? "leader-glow" : ""}`}
                style={showGlow ? {
                  boxShadow: "0 0 12px rgba(234,179,8,0.3), 0 0 24px rgba(234,179,8,0.15)",
                  borderColor: "#eab308",
                  background: "linear-gradient(135deg, #fefce8, #fef9c3)"
                } : isDrawing ? {
                  borderColor: "#2dd4bf",
                  background: "#f0fdfa"
                } : {}}
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
                             flex items-center gap-1.5 text-white font-black
                             px-3 py-1.5 rounded-2xl shadow-xl"
                  style={{
                    background: "linear-gradient(135deg, #22c55e, #10b981)",
                    boxShadow: "0 4px 15px rgba(34,197,94,0.4)",
                    animation: "playerScorePop 2.4s ease-out both",
                    fontSize: "13px",
                  }}
                >
                  <span className="text-lg leading-none">🎉</span>
                  <span>+{popup.points}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Leader banner */}
      {leader && (
        <div className="shrink-0 m-3 p-3 rounded-2xl flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg, #fefce8, #fef9c3)",
            border: "2px solid #eab308",
            boxShadow: "0 0 12px rgba(234,179,8,0.2)",
            animation: "leaderPulse 2s ease-in-out infinite",
          }}
        >
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white p-1.5 rounded-xl text-sm shrink-0"
            style={{ animation: "leaderBounce 1.5s ease-in-out infinite" }}
          >🏆</div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-bold text-xs truncate" style={{ color: "#854d0e" }}>{leader.name} {t("app.leader_title")}</span>
            <span className="text-[10px]" style={{ color: "#a16207" }}>⭐ {scores[leader.id] || 0} {t("app.leader_score")}</span>
          </div>
          <div className="ml-auto text-sm opacity-60">👑</div>
        </div>
      )}

      <style>{`
        @keyframes playerScorePop {
          0%   { opacity: 0; transform: translate(-100%, -50%) scale(0.5); }
          15%  { opacity: 1; transform: translate(-100%, -50%) scale(1.2); }
          30%  { transform: translate(-100%, -60%) scale(1); }
          70%  { opacity: 1; transform: translate(-100%, -70%); }
          100% { opacity: 0; transform: translate(-100%, -85%) scale(0.8); }
        }

        .leader-glow {
          animation: leaderGlow 1.5s ease-in-out infinite alternate;
        }

        @keyframes leaderGlow {
          from { box-shadow: 0 0 8px rgba(234,179,8,0.2), 0 0 16px rgba(234,179,8,0.1); }
          to   { box-shadow: 0 0 16px rgba(234,179,8,0.4), 0 0 32px rgba(234,179,8,0.2); }
        }

        @keyframes leaderPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.02); }
        }

        @keyframes leaderBounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
