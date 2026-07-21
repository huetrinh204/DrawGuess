"use client"

import { useCallback, useEffect, useRef, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getSocket, connectSocket, leaveRoom, requestGameSnapshot } from "@/services/socket"
import { useGameStore } from "@/store/gameStore"
import { useLang } from "@/contexts/LanguageContext"
import Canvas from "@/components/Canvas"
import ChatBox from "@/components/ChatBox"
import PlayerList from "@/components/PlayerList"
import { RadialMenuProvider, useRadialMenuContext } from "@/components/radial-menu"
import type { InteractionEffectPayload, RadialMenuItem } from "@/components/radial-menu/types"
import { ChatMessage, GameSnapshotPayload, Player, RoundStartPayload } from "@/types/game"
import { DoorOpen, Home, Flame, Target, Search, Trophy, Crown, RefreshCw, AlertCircle, RotateCcw, Timer } from "lucide-react"

function RoomClosedModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl px-8 py-7 flex flex-col items-center gap-3 max-w-xs w-full mx-4"
        style={{ border: "3px solid #f0e6ff", animation: "popModal 0.25s ease-out both" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-base font-bold text-gray-700 text-center">{message}</p>
        <button
          onClick={onClose}
          className="mt-1 px-8 py-2.5 rounded-2xl font-black text-white text-sm shadow"
          style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
        >OK</button>
      </div>
      <style>{`@keyframes popModal { from{transform:scale(0.85);opacity:0} to{transform:scale(1);opacity:1} }`}</style>
    </div>
  )
}

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
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="absolute select-none pointer-events-none rounded-full bg-white/30"
          style={{
            width: `${10 + (i % 4) * 8}px`,
            height: `${10 + (i % 4) * 8}px`,
            left: `${5 + i * 10}%`,
            top: `${10 + (i % 4) * 20}%`,
            animation: `splashFloat ${2 + i * 0.3}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}

      <div
        className="flex flex-col items-center gap-6 text-center"
        style={{ animation: "splashIn 0.6s ease-out both" }}
      >
        <div style={{ animation: "splashBounce 1s ease-in-out infinite alternate" }}>
          <Trophy className="w-20 h-20 text-yellow-300 drop-shadow-lg" />
        </div>
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
        <Flame className="w-4 h-4" /> {hint.message}
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
        <div className="flex justify-center mb-2"><Target className="w-10 h-10 text-purple-500" /></div>
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
  const { enqueueEffect } = useRadialMenuContext()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const popupCounterRef = useRef(0)
  const [roomClosed, setRoomClosed] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleLeave = () => {
    leaveRoom()
    store.resetGame()
    router.push("/")
  }

  const handleRoomClosedDismiss = () => {
    setRoomClosed(false)
    router.push("/")
  }

  useEffect(() => {
    if (!roomId || !name) return
    useGameStore.getState().setRoom(roomId, name)
    const socket = getSocket()

    const startCountdown = (deadline: number | undefined, fallbackSeconds: number) => {
      if (timerRef.current) clearInterval(timerRef.current)
      const target = deadline || Date.now() + fallbackSeconds * 1000
      const update = () => {
        const remaining = Math.max(0, Math.ceil((target - Date.now()) / 1000))
        useGameStore.getState().setTimeLeft(remaining)
        if (remaining <= 0 && timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
      update()
      timerRef.current = setInterval(update, 250)
    }

    const onSessionJoined = ({ playerId }: { playerId: string }) => {
      useGameStore.getState().setMyPlayerId(playerId)
      requestGameSnapshot()
    }

    const onRoomUpdate = ({ players, scores, hostId }: {
      players: Player[]
      scores: Record<string, number>
      hostId: string
    }) => useGameStore.getState().setPlayers(players, scores, hostId)

    const onPreRound = ({ drawerId, drawerName, round, maxRounds }: {
      drawerId: string
      drawerName: string
      round: number
      maxRounds: number
    }) => {
      const state = useGameStore.getState()
      state.setGameStarted(true)
      state.setPreRound(drawerId, drawerName, round, maxRounds)
    }

    const onChooseWord = ({ words }: { words: string[] }) => {
      useGameStore.getState().setChoosingWord(words)
    }

    const onWaitingForWord = ({ drawerName }: { drawerName: string }) => {
      useGameStore.getState().setWaitingForDrawer(drawerName)
    }

    const onRoundStart = (data: RoundStartPayload) => {
      useGameStore.getState().setRoundStart(data)
      startCountdown(data.deadline, data.timeLimit)
    }

    const onChatMessage = (msg: ChatMessage) => useGameStore.getState().addMessage(msg)

    const onCorrectGuess = ({ playerId, points, scores, drawerId, drawerPoints }: {
      playerId: string
      playerName: string
      points: number
      scores: Record<string, number>
      drawerId?: string
      drawerPoints?: number
    }) => {
      const state = useGameStore.getState()
      state.setPlayers(state.players, scores, state.hostId)
      const popupId = `${playerId}-${++popupCounterRef.current}`
      state.addScorePopup(popupId, playerId, points)
      setTimeout(() => useGameStore.getState().removeScorePopup(popupId), 2400)
      if (drawerId && drawerPoints) {
        const drawerPopupId = `${drawerId}-${++popupCounterRef.current}`
        state.addScorePopup(drawerPopupId, drawerId, drawerPoints)
        setTimeout(() => useGameStore.getState().removeScorePopup(drawerPopupId), 2400)
      }
    }

    const onCloseGuess = ({ message }: { message: string }) => {
      useGameStore.getState().setCloseGuessHint(message)
    }

    const onRoundEnd = ({ word, scores }: { word: string; scores: Record<string, number> }) => {
      if (timerRef.current) clearInterval(timerRef.current)
      const state = useGameStore.getState()
      state.setRoundEnd(word, scores)
      if (word) {
        state.addMessage({ sender: "System", message: t("app.game_correct_word", { word }), type: "system" })
      }
    }

    const onGameOver = ({ leaderboard }: { leaderboard: { name: string; score: number; avatar: string }[] }) => {
      if (timerRef.current) clearInterval(timerRef.current)
      useGameStore.getState().setGameOver(leaderboard)
    }

    const onRoomClosed = () => {
      if (timerRef.current) clearInterval(timerRef.current)
      useGameStore.getState().resetGame()
      setRoomClosed(true)
    }

    const onSnapshot = (snapshot: GameSnapshotPayload) => {
      const state = useGameStore.getState()
      state.setPlayers(snapshot.players, snapshot.scores, snapshot.hostId)
      if (snapshot.phase === "LOBBY") {
        router.replace(`/room?roomId=${roomId}&name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}`)
        return
      }
      if (snapshot.phase === "CHOOSING") {
        state.setGameStarted(true)
        state.setPreRound(snapshot.drawerId, snapshot.drawerName, snapshot.round, snapshot.maxRounds)
        if (snapshot.wordChoices.length > 0) state.setChoosingWord(snapshot.wordChoices)
        else state.setWaitingForDrawer(snapshot.drawerName)
        return
      }
      if (snapshot.phase === "DRAWING") {
        state.setRoundStart({
          drawerId: snapshot.drawerId,
          drawerName: snapshot.drawerName,
          round: snapshot.round,
          maxRounds: snapshot.maxRounds,
          maskedWord: snapshot.maskedWord,
          timeLimit: snapshot.timeLimit,
          deadline: snapshot.deadline,
          myWord: snapshot.myWord,
        })
        startCountdown(snapshot.deadline, snapshot.timeLimit)
        return
      }
      if (snapshot.phase === "ROUND_END") {
        state.setPreRound(snapshot.drawerId, snapshot.drawerName, snapshot.round, snapshot.maxRounds)
        return
      }
      if (snapshot.phase === "GAME_OVER" && snapshot.leaderboard) {
        state.setGameOver(snapshot.leaderboard)
      }
    }

    const onError = (message: string) => setErrorMessage(message)
    const onConnectError = () => setErrorMessage(t("app.connection_error"))
    const onConnect = () => requestGameSnapshot()
    const onInteractionEffect = (effect: InteractionEffectPayload) => enqueueEffect(effect)

    socket.on("session_joined", onSessionJoined)
    socket.on("room_update", onRoomUpdate)
    socket.on("pre_round", onPreRound)
    socket.on("choose_word", onChooseWord)
    socket.on("waiting_for_word", onWaitingForWord)
    socket.on("round_start", onRoundStart)
    socket.on("chat_message", onChatMessage)
    socket.on("correct_guess", onCorrectGuess)
    socket.on("close_guess", onCloseGuess)
    socket.on("round_end", onRoundEnd)
    socket.on("game_over", onGameOver)
    socket.on("room_closed", onRoomClosed)
    socket.on("game_snapshot", onSnapshot)
    socket.on("error_msg", onError)
    socket.on("connect_error", onConnectError)
    socket.on("connect", onConnect)
    socket.on("interaction_effect", onInteractionEffect)

    connectSocket({ roomId, name, avatar })
    if (socket.connected) requestGameSnapshot()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      socket.off("session_joined", onSessionJoined)
      socket.off("room_update", onRoomUpdate)
      socket.off("pre_round", onPreRound)
      socket.off("choose_word", onChooseWord)
      socket.off("waiting_for_word", onWaitingForWord)
      socket.off("round_start", onRoundStart)
      socket.off("chat_message", onChatMessage)
      socket.off("correct_guess", onCorrectGuess)
      socket.off("close_guess", onCloseGuess)
      socket.off("round_end", onRoundEnd)
      socket.off("game_over", onGameOver)
      socket.off("room_closed", onRoomClosed)
      socket.off("game_snapshot", onSnapshot)
      socket.off("error_msg", onError)
      socket.off("connect_error", onConnectError)
      socket.off("connect", onConnect)
      socket.off("interaction_effect", onInteractionEffect)
    }
  }, [roomId, name, avatar, router, t, enqueueEffect])

  const playerId = store.myPlayerId
  const isDrawer = store.drawerId !== "" && store.drawerId === playerId

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
                if (!player) return <div key={si} className="w-36" />
                return (
                  <div key={si} className="flex flex-col items-center" style={{ animation: `popConf 0.4s ease-out ${si * 0.12}s both` }}>
                    {/* Avatar above podium */}
                    <div className="relative z-10 mb-[-14px]">
                      <div className={`${slot.avatarSize} rounded-full overflow-hidden border-4 ${slot.avatarBorder} shadow-lg`}>
                        <img src={player.avatar} alt={player.name} width={64} height={64} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      {slot.rank === 1 && (
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                          <Crown className="w-6 h-6 text-yellow-400 drop-shadow" />
                        </div>
                      )}
                    </div>
                    {/* Podium block */}
                    <div className={`w-36 ${slot.colHeight} rounded-2xl bg-gradient-to-b ${slot.bg} border-2 ${slot.border} flex flex-col items-center justify-end pb-3 pt-8 shadow-md`}>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${slot.labelColor}`}>{slot.label}</span>
                      <span
                        className="font-black text-gray-800 text-sm leading-snug text-center px-2 break-words w-full min-h-[2.5rem] flex items-center justify-center"
                        title={player.name}
                      >{player.name}</span>
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
                    <span className="flex-1 font-semibold text-gray-700 text-sm min-w-0 break-words" title={p.name}>{p.name}</span>
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
                className="flex-1 py-3 rounded-2xl font-black text-white text-sm shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
              >
                <RefreshCw className="w-4 h-4" />
                {t("app.game_over_play_again")}
              </button>
              <button
                onClick={handleLeave}
                className="flex-1 py-3 rounded-2xl font-black text-sm shadow-md transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                style={{ background: "#f3f0ff", color: "#7c3aed", border: "2px solid #ddd6fe" }}
              >
                <Home className="w-4 h-4" />
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
  const circumference = 2 * Math.PI * 19
  const timerOffset = circumference * (1 - store.timeLeft / maxTime)
  const timerColor = store.timeLeft <= 10 ? "#EF4444" : "#10B981"

  return (
    <div className="h-screen flex flex-col p-2 md:p-3 overflow-hidden" style={{ background: "#E8E9FF" }}>
      <CloseGuessToast />
      {roomClosed && <RoomClosedModal message={t("app.room_closed")} onClose={handleRoomClosedDismiss} />}
      {errorMessage && <RoomClosedModal message={errorMessage} onClose={() => setErrorMessage("")} />}

      {/* ── Header ── */}
      <div className="relative flex items-center justify-between gap-2 bg-white rounded-2xl px-3 md:px-5 py-2.5 shadow-sm mb-2 md:mb-3 shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="DrawGuess" className="w-8 h-8 md:w-9 md:h-9 object-contain" />
            <span className="hidden sm:inline text-lg md:text-xl font-black text-pink-500">DrawGuess</span>
          </div>
        </div>

        {/* Center status is absolutely positioned so it does not resize the header bar */}
        {store.round > 0 && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2.5 md:gap-4 max-sm:scale-[0.78]"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="flex items-baseline gap-1 whitespace-nowrap">
                <span className="text-[10px] md:text-xs text-purple-500 font-black uppercase tracking-wider">{t("app.round")}</span>
                <span className="text-xl md:text-2xl leading-none text-purple-700 font-black">{store.round}</span>
                <span className="text-sm text-purple-400 font-black">/ {store.maxRounds}</span>
              </div>
            </div>

            {store.roundActive && (
              <>
                <div className="h-8 w-px bg-purple-200" />
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 shrink-0" style={{ color: timerColor }} />
                  <div className="relative w-11 h-11 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r="19" stroke="#E5E7EB" strokeWidth="4" fill="none" />
                      <circle
                        cx="22" cy="22" r="19"
                        stroke={timerColor}
                        strokeWidth="4" fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={timerOffset}
                        strokeLinecap="round"
                        className="transition-[stroke-dashoffset] duration-300"
                      />
                    </svg>
                    <span className="text-sm font-black relative z-10" style={{ color: timerColor }}>{store.timeLeft}</span>
                  </div>
                  <span className="hidden sm:inline text-xs font-bold text-gray-500">{t("app.seconds")}</span>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 justify-between md:justify-end">
          <div className="hidden sm:flex items-center gap-2 bg-orange-50 border border-orange-100 px-3 md:px-4 py-1.5 rounded-2xl">
              <Home className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold text-orange-800">
                {t("app.room_code_label")}: <span className="font-black text-orange-900 tracking-wider">{roomId}</span>
              </span>
            </div>
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 bg-red-50 text-red-500 px-4 py-1.5 rounded-2xl font-bold text-sm border border-red-100 hover:bg-red-100 transition-colors"
          >
            <DoorOpen className="w-4 h-4" /> <span className="hidden sm:inline">{t("app.leave")}</span>
          </button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 flex-col md:flex-row gap-2 md:gap-3 overflow-hidden min-h-0">
        <div className="order-2 md:order-1 w-full md:w-60 shrink-0 flex flex-col min-h-0 max-h-36 md:max-h-none">
          <PlayerList />
        </div>

        <div className="order-1 md:order-2 flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
            {/* Canvas header */}
            <div className={`shrink-0 px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-center relative ${isDrawer ? "bg-[#F6AD55]" : "bg-[#9333EA]"}`}>
              {isDrawer ? (
                <div className="flex items-center gap-2 md:gap-3 text-white flex-wrap justify-center">
                  <Target className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="font-bold text-sm md:text-base">{t("app.drawer_hint")}</span>
                  <div className="bg-white px-3 md:px-5 py-1 rounded-full text-orange-500 font-black text-base md:text-lg tracking-[0.15em] uppercase shadow-sm">
                    {store.myWord || "..."}
                  </div>
                  <span className="text-xs font-bold opacity-90 hidden sm:inline">{t("app.drawer_quick")}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 md:gap-3 text-white flex-wrap justify-center">
                  {store.waitingForDrawer && !store.roundActive ? (
                    <span className="text-xs md:text-sm font-bold opacity-90 text-center">
                      {t("app.waiting_choose", { name: store.waitingDrawerName })}
                    </span>
                  ) : store.roundActive ? (
                    <>
                      <Search className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="font-bold text-sm md:text-base">{t("app.guessing")}</span>
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
                    <span className="text-xs md:text-sm opacity-80">{t("app.waiting_next")}</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 relative min-h-0">
              {store.choosingWord && <WordChoiceOverlay />}
              <Canvas isDrawer={isDrawer && store.roundActive} />
            </div>
          </div>
        </div>

        <div className="order-3 w-full md:w-[17rem] shrink-0 flex flex-col min-h-0 h-44 md:h-auto">
          <ChatBox />
        </div>
      </div>
    </div>
  )
}

export default function GamePage() {
  const handleInteraction = useCallback((payload: {
    item: RadialMenuItem
    targetId: string
    targetName: string
  }) => {
    getSocket().emit("player_interaction", {
      actionId: payload.item.id,
      targetId: payload.targetId,
    })
  }, [])

  return (
    <Suspense>
      <RadialMenuProvider onInteraction={handleInteraction}>
        <GameContent />
      </RadialMenuProvider>
    </Suspense>
  )
}
