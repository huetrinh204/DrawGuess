"use client"

import { useState, useEffect, useRef } from "react"
import { useGameStore } from "@/store/gameStore"
import { useLang } from "@/contexts/LanguageContext"
import { Users, Pencil, Trophy, Star, Crown, Medal, PartyPopper } from "lucide-react"
import PlayerAvatar from "@/components/PlayerAvatar"
import InteractiveAvatar from "@/components/radial-menu/InteractiveAvatar"

export default function PlayerList() {
  const { t } = useLang()
  const players = useGameStore(s => s.players)
  const scores = useGameStore(s => s.scores)
  const drawerId = useGameStore(s => s.drawerId)
  const myPlayerId = useGameStore(s => s.myPlayerId)
  const scorePopups = useGameStore(s => s.scorePopups)

  const sorted = [...players].sort(
    (a, b) => (scores[b.id] || 0) - (scores[a.id] || 0) || a.name.localeCompare(b.name)
  )
  const leader = sorted[0]
  const leaderScore = leader ? (scores[leader.id] || 0) : 0
  const leaderId = leader?.id ?? ""

  const prevLeaderIdRef = useRef<string>("")
  const [leaderJustChanged, setLeaderJustChanged] = useState<string>("")

  useEffect(() => {
    if (!leaderId || leaderScore <= 0) {
      prevLeaderIdRef.current = ""
      const clearTimer = setTimeout(() => setLeaderJustChanged(""), 0)
      return () => clearTimeout(clearTimer)
    }
    if (prevLeaderIdRef.current && prevLeaderIdRef.current !== leaderId) {
      prevLeaderIdRef.current = leaderId
      const showTimer = setTimeout(() => setLeaderJustChanged(leaderId), 0)
      const clearTimer = setTimeout(() => setLeaderJustChanged(""), 800)
      return () => {
        clearTimeout(showTimer)
        clearTimeout(clearTimer)
      }
    }
    prevLeaderIdRef.current = leaderId
  }, [leaderId, leaderScore])

  const medalIcon = (rank: number) => {
    if (rank === 0) return <Medal className="w-5 h-5 text-yellow-500" />
    if (rank === 1) return <Medal className="w-5 h-5 text-slate-400" />
    if (rank === 2) return <Medal className="w-5 h-5 text-orange-400" />
    return null
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
      {/* Header */}
      <div className="bg-[#9333EA] px-4 py-3 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 opacity-80" />
          <span className="font-bold text-sm">{t("app.players_title")}</span>
        </div>
        <span className="bg-purple-400/50 px-2 py-0.5 rounded-full text-[10px] font-bold">{players.length}</span>
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {sorted.map((p, idx) => {
          const isDrawing = p.id === drawerId
          const isMe = p.id === myPlayerId
          const score = scores[p.id] || 0
          const popup = scorePopups.find(sp => sp.playerId === p.id)
          const isLeader = idx === 0 && score > 0
          const showGlow = isLeader
          const isTakeover = leaderJustChanged === p.id

          return (
            <div key={p.id} className="relative">
              <div
                className={`relative flex items-center p-2 rounded-2xl border-2 transition-all duration-500 ${
                  isDrawing ? "border-teal-400 bg-teal-50" : "border-gray-50 bg-gray-50"
                } ${showGlow ? "leader-glow scale-[1.02] ring-2 ring-yellow-300/60" : ""} ${isTakeover ? "leader-takeover" : ""}`}
                style={showGlow ? {
                  boxShadow: "0 0 16px rgba(234,179,8,0.45), 0 0 32px rgba(234,179,8,0.2)",
                  borderColor: "#ca8a04",
                  background: "linear-gradient(135deg, #fefce8, #fef9c3)"
                } : isDrawing ? {
                  borderColor: "#2dd4bf",
                  background: "#f0fdfa"
                } : {}}
              >
                {/* Avatar — right-click or long-press for interaction wheel */}
                <div className="relative shrink-0">
                  <InteractiveAvatar targetId={p.id} targetName={p.name} disabled={isMe || p.connected === false}>
                    <PlayerAvatar src={p.avatar} name={p.name} />
                  </InteractiveAvatar>
                  {isDrawing && (
                    <div className="absolute -bottom-1 -right-1 bg-teal-500 text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                      <Pencil className="w-2.5 h-2.5" />
                    </div>
                  )}
                  {isLeader && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <Crown className="w-4 h-4 text-yellow-400 drop-shadow" />
                    </div>
                  )}
                </div>

                {/* Name & score */}
                <div className="ml-2 flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {isLeader && (
                      <span className="text-[9px] font-black text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded-full shrink-0">#1</span>
                    )}
                    <span className="text-sm font-bold text-gray-700 truncate leading-none">{p.name}</span>
                    {isMe && <span className="text-[9px] text-purple-400 font-medium shrink-0">({t("app.you")})</span>}
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {score} {t("app.score")}
                  </div>
                </div>

                {/* Rank */}
                <div className="shrink-0 ml-1">
                  {medalIcon(idx) ? (
                    medalIcon(idx)
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
                  <PartyPopper className="w-4 h-4" />
                  <span>+{popup.points}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Leader banner */}
      {leader && leaderScore > 0 && (
        <div className="shrink-0 m-3 p-3 rounded-2xl flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg, #fefce8, #fef9c3)",
            border: "2px solid #eab308",
            boxShadow: "0 0 12px rgba(234,179,8,0.2)",
            animation: "leaderPulse 2s ease-in-out infinite",
          }}
        >
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white p-1.5 rounded-xl shrink-0"
            style={{ animation: "leaderBounce 1.5s ease-in-out infinite" }}
          ><Trophy className="w-4 h-4" /></div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-bold text-xs truncate" style={{ color: "#854d0e" }}>{leader.name} {t("app.leader_title")}</span>
            <span className="text-[10px] flex items-center gap-1" style={{ color: "#a16207" }}><Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /> {leaderScore} {t("app.leader_score")}</span>
          </div>
          <div className="ml-auto text-purple-300 opacity-60"><Crown className="w-4 h-4" /></div>
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

        .leader-takeover {
          animation: leaderTakeover 0.8s ease-out both;
        }

        @keyframes leaderTakeover {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.08); box-shadow: 0 0 24px rgba(234,179,8,0.6); }
          100% { transform: scale(1.02); }
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
