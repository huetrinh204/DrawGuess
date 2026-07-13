"use client"

import { useEffect, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getSocket, connectSocket } from "@/services/socket"
import { useGameStore } from "@/store/gameStore"
import { useLang } from "@/contexts/LanguageContext"
import Canvas from "@/components/Canvas"
import ChatBox from "@/components/ChatBox"
import PlayerList from "@/components/PlayerList"
import { ChatMessage, RoundStartPayload } from "@/types/game"

// ── Game End Splash (intermediate screen) ────────────────────────────
function GameEndSplash({ onDone }: { onDone: () => void }) {
  const { t } = useLang()
  useEffect(() => {
    const timer = setTimeout(onDone, 3000)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)" }}
    >
      {/* Floating particles */}
      {["🎨","🎉","✨","🌟","🎊","🏆","🎈","💫","🌈","🎯"].map((e, i) => (
        <span
          key={i}
          className="absolute select-none pointer-events-none text-3xl"
          style={{
            left: `${5 + i * 10}%`,
            top: `${10 + (i % 4) * 20}%`,
            opacity: 0.5,
            animation: `splashFloat ${2 + i * 0.3}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.15}s`,
          }}
        >{e}</span>
      ))}

      <div
        className="flex flex-col items-center gap-6 text-center"
        style={{ animation: "splashIn 0.6s ease-out both" }}
      >
        <div className="text-7xl" style={{ animation: "splashBounce 1s ease-in-out infinite alternate" }}>🏁</div>
        <div>
          <h1 className="text-5xl font-black text-white drop-shadow-lg tracking-tight">
            {t("app.game_over")}
          </h1>
        </div>
        <p className="text-white/80 text-lg font-semibold">{t("app.game_over_processing")}</p>

        {/* Loading dots */}
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-white/60"
              style={{ animation: `dotBounce 0.9s ease-in-out ${i * 0.2}s infinite alternate` }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes splashFloat {
          from { transform: translateY(0) rotate(0deg); }
          to   { transform: translateY(-18px) rotate(15deg); }
        }
        @keyframes splashIn {
          from { opacity: 0; transform: scale(0.75) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes splashBounce {
          from { transform: scale(1) rotate(-5deg); }
          to   { transform: scale(1.12) rotate(5deg); }
        }
        @keyframes dotBounce {
          from { transform: translateY(0); opacity: 0.4; }
          to   { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ── Close guess toast ────────────────────────────────────────────────
function CloseGuessToast() {
  const hint = useGameStore(s => s.closeGuessHint)
  // key thay đổi mỗi lần hint mới → force remount → animation chạy lại từ đầu
  if (!hint.message) return null
  return (
    <div
      key={hint.key}
      className="fixed bottom-8 left-1/2 z-50 pointer-events-none"
      style={{ transform: "translateX(-50%)", animation: "toastPop 2.8s ease-out forwards" }}
    >
      <div className="bg-amber-400 text-white font-black text-sm px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 whitespace-nowrap">
        🔥 {hint.message}
      </div>
      <style>{`
        @keyframes toastPop {
          0%   { opacity: 0; transform: translateY(10px); }
          12%  { opacity: 1; transform: translateY(0); }
          75%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}

function WordChoiceOverlay() {
  const store = useGameStore()
  const { t } = useLang()
  const roomId = store.roomId

  const choose = (word: string) => {
    getSocket().emit("word_chosen", { roomId, word })
    store.setChoosingWord([])
  }

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20 rounded-3xl">
      <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-sm w-full mx-4 border border-purple-100">
        <div className="text-3xl mb-2">🎯</div>
        <p className="text-lg font-black text-gray-800 mb-1">{t("app.game_choose_title")}</p>
        <p className="text-sm text-gray-400 mb-6">{t("app.game_choose_time")}</p>
        <div className="flex flex-col gap-3">
          {store.wordChoices.map(w => (
            <button
              key={w}
              onClick={() => choose(w)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-2xl font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              {w}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function GameContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { t } = useLang()
  const name = params.get("name") || ""
  const roomId = params.get("roomId") || ""
  const avatar = params.get("avatar") || "🐱"

  const store = useGameStore()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const popupCounterRef = useRef(0)

  useEffect(() => {
    if (!roomId || !name) return
    store.setRoom(roomId, name)
    connectSocket()
    const socket = getSocket()

    const doJoin = () => {
      store.setMySocketId(socket.id || "")
      socket.emit("join_room", { roomId, name, avatar })
    }

    if (socket.connected) {
      doJoin()
    } else {
      socket.once("connect", doJoin)
    }

    socket.on("room_update", ({ players, scores, hostId }) => {
      store.setPlayers(players, scores, hostId)
    })

    socket.on("pre_round", ({ drawerId, drawerName, round, maxRounds }: { drawerId: string; drawerName: string; round: number; maxRounds: number }) => {
      store.setPreRound(drawerId, drawerName, round, maxRounds)
    })

    socket.on("choose_word", ({ words }: { words: string[] }) => {
      store.setChoosingWord(words)
    })

    socket.on("waiting_for_word", ({ drawerName }: { drawerName: string }) => {
      store.setWaitingForDrawer(drawerName)
    })

    socket.on("round_start", (data: RoundStartPayload) => {
      store.setRoundStart(data)
      if (timerRef.current) clearInterval(timerRef.current)
      let t = data.timeLimit
      store.setTimeLeft(t)
      timerRef.current = setInterval(() => {
        t--
        store.setTimeLeft(t)
        if (t <= 0 && timerRef.current) clearInterval(timerRef.current)
      }, 1000)
    })

    socket.on("chat_message", (msg: ChatMessage) => {
      store.addMessage(msg)
    })

    socket.on("correct_guess", ({ playerId, playerName, points, scores }: { playerId: string; playerName: string; points: number; scores: Record<string, number> }) => {
      store.setPlayers(store.players, scores, store.hostId)
      // Hiệu ứng cộng điểm
      const popupId = `${playerId}-${++popupCounterRef.current}`
      store.addScorePopup(popupId, playerName, points)
      setTimeout(() => store.removeScorePopup(popupId), 2400)
    })

    socket.on("close_guess", ({ message }: { message: string }) => {
      store.setCloseGuessHint(message)
    })

    socket.on("round_end", ({ word, scores }: { word: string; scores: Record<string, number> }) => {
      if (timerRef.current) clearInterval(timerRef.current)
      store.setRoundEnd(word, scores)
      store.addMessage({ sender: "System", message: `Từ đúng là: "${word}"`, type: "system" })
    })

    socket.on("game_over", ({ leaderboard }) => {
      if (timerRef.current) clearInterval(timerRef.current)
      store.setGameOver(leaderboard)
    })

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      socket.off("connect", doJoin)
      socket.off("room_update")
      socket.off("pre_round")
      socket.off("choose_word")
      socket.off("waiting_for_word")
      socket.off("round_start")
      socket.off("chat_message")
      socket.off("correct_guess")
      socket.off("close_guess")
      socket.off("round_end")
      socket.off("game_over")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, name, avatar])

  const socketId = store.mySocketId
  const isDrawer = store.drawerId !== "" && store.drawerId === socketId

  // ─── Game End Splash ────────────────────────────────────────────────
  if (store.gameOver && store.showGameEndSplash) {
    return <GameEndSplash onDone={() => store.setShowGameEndSplash(false)} />
  }

  // ─── Game Over screen ───────────────────────────────────────────────
  if (store.gameOver) {
    const top3 = store.leaderboard.slice(0, 3)
    const rest = store.leaderboard.slice(3)

    // Podium: 2nd left, 1st center, 3rd right
    const podiumSlots = [
      { rank: 2, colHeight: "h-28", bg: "from-slate-200 to-slate-300", border: "border-slate-300", label: "2ND", labelColor: "text-slate-500", scoreColor: "text-slate-600", avatarBorder: "border-slate-300", avatarSize: "w-14 h-14" },
      { rank: 1, colHeight: "h-40", bg: "from-yellow-300 to-yellow-400", border: "border-yellow-400", label: "WINNER", labelColor: "text-yellow-700", scoreColor: "text-yellow-900", avatarBorder: "border-yellow-400", avatarSize: "w-16 h-16" },
      { rank: 3, colHeight: "h-20", bg: "from-orange-200 to-orange-300", border: "border-orange-300", label: "3RD", labelColor: "text-orange-500", scoreColor: "text-orange-700", avatarBorder: "border-orange-300", avatarSize: "w-14 h-14" },
    ]

    return (
      <div
        className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden px-4 py-8"
        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)" }}
      >
        {["✦","✦","✦","✦","✦","✦","✦","✦","✦","✦"].map((s, i) => (
          <span key={i} className="absolute select-none pointer-events-none font-bold opacity-20 text-white"
            style={{
              left: `${5 + i * 10}%`, top: `${5 + (i % 5) * 18}%`,
              fontSize: `${10 + (i % 3) * 8}px`,
              animation: `floatConf ${2.5 + i * 0.3}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.2}s`,
            }}>{s}</span>
        ))}

        <div className="relative z-10 w-full max-w-lg bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden"
          style={{ border: "3px solid rgba(255,255,255,0.8)", animation: "slideUpConf 0.5s ease-out both" }}>

          <div className="px-6 pt-7 pb-4 text-center"
            style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
            <div className="text-4xl font-black text-white mb-1" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
              {t("app.game_over_title")}
            </div>
            <p className="text-white/70 text-sm">{t("app.game_over_subtitle")}</p>
          </div>

          <div className="px-6 pb-6">
            {/* Podium */}
            <div className="flex items-end justify-center gap-3 mt-8 mb-6">
              {podiumSlots.map((slot, si) => {
                const player = top3[slot.rank - 1]
                if (!player) return <div key={si} className="w-28" />
                return (
                  <div key={si} className="flex flex-col items-center" style={{ animation: `popConf 0.4s ease-out ${si * 0.12}s both` }}>
                    {/* Avatar above podium */}
                    <div className="relative z-10 mb-[-14px]">
                      <div className={`${slot.avatarSize} rounded-full overflow-hidden border-4 ${slot.avatarBorder} shadow-lg`}>
                        <img src={player.avatar} alt={player.name} width={64} height={64} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      {slot.rank === 1 && (
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl">👑</span>
                      )}
                    </div>
                    {/* Podium block */}
                    <div className={`w-32 ${slot.colHeight} rounded-2xl bg-gradient-to-b ${slot.bg} border-2 ${slot.border} flex flex-col items-center justify-end pb-3 pt-8 shadow-md`}>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${slot.labelColor}`}>{slot.label}</span>
                      <span className="font-black text-gray-800 text-sm leading-tight text-center px-2 truncate w-full text-center">{player.name}</span>
                      <span className={`font-black text-lg ${slot.scoreColor}`}>{player.score.toLocaleString()}</span>
                      <span className={`text-[10px] ${slot.scoreColor} opacity-70`}>{t("app.score")}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {rest.length > 0 && (
              <div className="rounded-2xl overflow-hidden mb-5" style={{ background: "#f8f7ff", border: "2px solid #ede9fe" }}>
                <div className="px-4 py-2.5 border-b border-purple-100">
                  <span className="text-xs font-black text-purple-500 uppercase tracking-wider">{t("app.leaderboard")}</span>
                </div>
                {rest.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-purple-50 last:border-0"
                    style={{ animation: `popConf 0.3s ease-out ${(i + 3) * 0.08}s both` }}>
                    <span className="text-sm font-black text-purple-300 w-5 text-center shrink-0">{i + 4}</span>
                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-purple-100 shrink-0">
                      <img src={p.avatar} alt={p.name} width={36} height={36} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <span className="flex-1 font-semibold text-gray-700 text-sm min-w-0 truncate">{p.name}</span>
                    <span className="font-black text-purple-600 text-sm shrink-0">{p.score.toLocaleString()} <span className="font-normal text-purple-400 text-xs">{t("app.score")}</span></span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  store.resetGame()
                  router.push(`/room?roomId=${roomId}&name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}`)
                }}
                className="flex-1 py-3 rounded-2xl font-black text-white text-sm shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
              >
                {t("app.game_over_play_again")}
              </button>
              <button
                onClick={() => { store.resetGame(); router.push("/") }}
                className="flex-1 py-3 rounded-2xl font-black text-sm shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: "#f3f0ff", color: "#7c3aed", border: "2px solid #ddd6fe" }}
              >
                {t("app.game_over_back_home")}
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes floatConf { from { transform: translateY(0) rotate(0deg); } to { transform: translateY(-20px) rotate(20deg); } }
          @keyframes slideUpConf { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          @keyframes popConf { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `}</style>
      </div>
    )
  }

  // ─── Main game screen ───────────────────────────────────────────────
  const maxTime = 80
  const circumference = 2 * Math.PI * 14
  const timerOffset = circumference * (1 - store.timeLeft / maxTime)
  const timerColor = store.timeLeft <= 10 ? "#EF4444" : "#10B981"

  return (
    <div className="h-screen flex flex-col p-3 overflow-hidden" style={{ background: "#E8E9FF" }}>
      <CloseGuessToast />

      {/* ── Header ── */}
      <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-2.5 shadow-sm mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-pink-400 to-purple-500 p-1.5 rounded-xl">
              <span className="text-white text-lg">🎨</span>
            </div>
            <span className="text-xl font-black text-pink-500">DrawGuess</span>
          </div>

          <div className="h-7 w-px bg-gray-200" />

          {store.roundActive && (
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
              <span className="text-xs text-purple-600 font-bold uppercase">{t("app.round")}</span>
              <div className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{store.round}</div>
              <span className="text-xs text-purple-400 font-bold">/ {store.maxRounds}</span>
            </div>
          )}

          {store.roundActive && (
            <div className="flex items-center gap-1.5">
              <div className="relative w-8 h-8 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="16" cy="16" r="14" stroke="#E5E7EB" strokeWidth="3" fill="none" />
                  <circle
                    cx="16" cy="16" r="14"
                    stroke={timerColor}
                    strokeWidth="3" fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={timerOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-xs font-bold relative z-10" style={{ color: timerColor }}>{store.timeLeft}</span>
              </div>
              <span className="text-xs font-medium text-gray-400">{t("app.seconds")}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 px-4 py-1.5 rounded-2xl">
            <span className="text-base">🏠</span>
            <span className="text-sm font-semibold text-orange-800">
              {t("app.room_code_label")}: <span className="font-black text-orange-900 tracking-wider">{roomId}</span>
            </span>
          </div>
          <button
            onClick={() => { store.resetGame(); router.push("/") }}
            className="flex items-center gap-1.5 bg-red-50 text-red-500 px-4 py-1.5 rounded-2xl font-bold text-sm border border-red-100 hover:bg-red-100 transition-colors"
          >
            🚪 {t("app.leave")}
          </button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 gap-3 overflow-hidden min-h-0">
        <div className="w-60 shrink-0 flex flex-col min-h-0">
          <PlayerList />
        </div>

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
            {/* Canvas header */}
            <div className={`shrink-0 px-4 py-2.5 flex items-center justify-center relative ${isDrawer ? "bg-[#F6AD55]" : "bg-[#9333EA]"}`}>
              {isDrawer ? (
                <div className="flex items-center gap-3 text-white">
                  <span>🎯</span>
                  <span className="font-bold">{t("app.drawer_hint")}</span>
                  <div className="bg-white px-5 py-1 rounded-full text-orange-500 font-black text-lg tracking-[0.15em] uppercase shadow-sm">
                    {store.myWord || "..."}
                  </div>
                  <span className="text-xs font-bold opacity-90">{t("app.drawer_quick")}</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-white">
                  {store.waitingForDrawer && !store.roundActive ? (
                    <span className="text-sm font-bold opacity-90">
                      {t("app.waiting_choose", { name: store.waitingDrawerName })}
                    </span>
                  ) : store.roundActive ? (
                    <>
                      <span>🔍</span>
                      <span className="font-bold">{t("app.guessing")}</span>
                      <div className="flex gap-1.5">
                        {store.maskedWord.replace(/ /g, "").split("").map((ch, i) => (
                          <div key={i} className={`h-1 rounded-full ${ch !== "_" ? "w-5 bg-white" : "w-4 bg-white/40"}`} />
                        ))}
                      </div>
                      <div className="bg-purple-700/50 px-3 py-0.5 rounded-full text-[10px] font-bold">
                        {store.maskedWord.replace(/ /g, "").length} {t("app.chars")}
                      </div>
                    </>
                  ) : (
                    <span className="text-sm opacity-80">{t("app.waiting_next")}</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 relative min-h-0">
              {store.choosingWord && <WordChoiceOverlay />}
              <Canvas isDrawer={isDrawer} />
            </div>
          </div>
        </div>

        <div className="w-68 shrink-0 flex flex-col min-h-0" style={{ width: "17rem" }}>
          <ChatBox />
        </div>
      </div>
    </div>
  )
}

export default function GamePage() {
  return (
    <Suspense>
      <GameContent />
    </Suspense>
  )
}
