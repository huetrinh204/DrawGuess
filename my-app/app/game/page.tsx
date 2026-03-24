"use client"

import { useEffect, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getSocket, connectSocket } from "@/services/socket"
import { useGameStore } from "@/store/gameStore"
import Canvas from "@/components/Canvas"
import ChatBox from "@/components/ChatBox"
import PlayerList from "@/components/PlayerList"
import { ChatMessage, RoundStartPayload } from "@/types/game"

function WordChoiceOverlay() {
  const store = useGameStore()
  const roomId = store.roomId

  const choose = (word: string) => {
    getSocket().emit("word_chosen", { roomId, word })
    store.setChoosingWord([]) // ẩn overlay ngay
  }

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
      <div className="bg-white rounded-xl p-8 text-center shadow-xl max-w-sm w-full mx-4">
        <p className="text-lg font-bold mb-2">Chọn từ để vẽ</p>
        <p className="text-sm text-gray-500 mb-6">Bạn có 15 giây để chọn</p>
        <div className="flex flex-col gap-3">
          {store.wordChoices.map(w => (
            <button
              key={w}
              onClick={() => choose(w)}
              className="bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold text-lg transition-colors"
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
  const name = params.get("name") || ""
  const roomId = params.get("roomId") || ""
  const avatar = params.get("avatar") || "🐱"

  const store = useGameStore()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

    // pre_round: set drawerId sớm để isDrawer đúng khi choose_word hiện ra
    socket.on("pre_round", ({ drawerId, drawerName, round, maxRounds }: { drawerId: string; drawerName: string; round: number; maxRounds: number }) => {
      store.setPreRound(drawerId, drawerName, round, maxRounds)
    })

    // Người vẽ được yêu cầu chọn từ
    socket.on("choose_word", ({ words }: { words: string[] }) => {
      store.setChoosingWord(words)
    })

    // Người khác chờ người vẽ chọn từ
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

    socket.on("correct_guess", ({ scores }: { scores: Record<string, number> }) => {
      store.setPlayers(store.players, scores, store.hostId)
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
      socket.off("round_end")
      socket.off("game_over")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, name, avatar])

  const socketId = store.mySocketId
  const isDrawer = store.drawerId !== "" && store.drawerId === socketId

  if (store.gameOver) {
    const top3 = store.leaderboard.slice(0, 3)
    const rest = store.leaderboard.slice(3)

    // Sắp xếp podium: 2nd - 1st - 3rd
    const podium = [top3[1], top3[0], top3[2]].filter(Boolean)
    const podiumOrder = [
      { rank: 2, height: "h-28", bg: "from-slate-200 to-slate-300", border: "border-slate-300", label: "2ND", labelColor: "text-slate-500", scoreColor: "text-slate-600" },
      { rank: 1, height: "h-40", bg: "from-yellow-300 to-yellow-400", border: "border-yellow-400", label: "WINNER", labelColor: "text-yellow-700", scoreColor: "text-yellow-900" },
      { rank: 3, height: "h-20", bg: "from-orange-200 to-orange-300", border: "border-orange-300", label: "3RD", labelColor: "text-orange-500", scoreColor: "text-orange-700" },
    ]

    return (
      <div
        className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden px-4 py-8"
        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)" }}
      >
        {/* Confetti dots */}
        {["✦","✦","✦","✦","✦","✦","✦","✦","✦","✦"].map((s, i) => (
          <span key={i} className="absolute select-none pointer-events-none font-bold opacity-20 text-white"
            style={{
              left: `${5 + i * 10}%`, top: `${5 + (i % 5) * 18}%`,
              fontSize: `${10 + (i % 3) * 8}px`,
              animation: `floatConf ${2.5 + i * 0.3}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.2}s`,
            }}>{s}</span>
        ))}

        {/* Card */}
        <div className="relative z-10 w-full max-w-lg bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden"
          style={{ border: "3px solid rgba(255,255,255,0.8)", animation: "slideUpConf 0.5s ease-out both" }}>

          {/* Header */}
          <div className="px-6 pt-7 pb-4 text-center"
            style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
            <div className="text-4xl font-black text-white mb-1" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
              Kết quả
            </div>
            <p className="text-white/70 text-sm">Cảm ơn mọi người đã chơi cùng nhau!</p>
          </div>

          <div className="px-6 pb-6">
            {/* Podium */}
            <div className="flex items-end justify-center gap-3 mt-6 mb-6">
              {podiumOrder.map((slot, si) => {
                const player = top3[slot.rank - 1]
                if (!player) return <div key={si} className="w-28" />
                return (
                  <div key={si} className="flex flex-col items-center gap-0" style={{ animation: `popConf 0.4s ease-out ${si * 0.12}s both` }}>
                    {/* Avatar floating above */}
                    <div className="relative mb-[-16px] z-10">
                      <div className={`w-14 h-14 rounded-full overflow-hidden border-4 shadow-lg ${slot.rank === 1 ? "border-yellow-400 w-16 h-16" : slot.rank === 2 ? "border-slate-300" : "border-orange-300"}`}>
                        <img src={player.avatar} alt={player.name} width={64} height={64} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      {slot.rank === 1 && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl">👑</span>
                      )}
                    </div>
                    {/* Podium block */}
                    <div className={`w-28 ${slot.height} rounded-2xl bg-gradient-to-b ${slot.bg} border-2 ${slot.border} flex flex-col items-center justify-end pb-3 pt-6 shadow-md`}>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${slot.labelColor}`}>{slot.label}</span>
                      <span className="font-black text-gray-800 text-sm leading-tight text-center px-1">{player.name}</span>
                      <span className={`font-black text-lg ${slot.scoreColor}`}>{player.score.toLocaleString()}</span>
                      <span className={`text-[10px] ${slot.scoreColor} opacity-70`}>điểm</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Rest of leaderboard */}
            {rest.length > 0 && (
              <div className="rounded-2xl overflow-hidden mb-5" style={{ background: "#f8f7ff", border: "2px solid #ede9fe" }}>
                <div className="px-4 py-2.5 border-b border-purple-100">
                  <span className="text-xs font-black text-purple-500 uppercase tracking-wider">Bảng xếp hạng</span>
                </div>
                {rest.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-purple-50 last:border-0"
                    style={{ animation: `popConf 0.3s ease-out ${(i + 3) * 0.08}s both` }}>
                    <span className="text-sm font-black text-purple-300 w-5 text-center">{i + 4}</span>
                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-purple-100 shrink-0">
                      <img src={p.avatar} alt={p.name} width={36} height={36} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <span className="flex-1 font-semibold text-gray-700 text-sm">{p.name}</span>
                    <span className="font-black text-purple-600 text-sm">{p.score.toLocaleString()} <span className="font-normal text-purple-400 text-xs">điểm</span></span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/room?roomId=${roomId}&name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}`)}
                className="flex-1 py-3 rounded-2xl font-black text-white text-sm shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
              >
                Chơi lại
              </button>
              <button
                onClick={() => router.push("/")}
                className="flex-1 py-3 rounded-2xl font-black text-sm shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: "#f3f0ff", color: "#7c3aed", border: "2px solid #ddd6fe" }}
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes floatConf {
            from { transform: translateY(0) rotate(0deg); }
            to   { transform: translateY(-20px) rotate(20deg); }
          }
          @keyframes slideUpConf {
            from { transform: translateY(40px); opacity: 0; }
            to   { transform: translateY(0); opacity: 1; }
          }
          @keyframes popConf {
            from { transform: scale(0.8); opacity: 0; }
            to   { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b shadow-sm shrink-0">
        <span className="font-bold text-blue-600 text-lg">🎨 DrawGuess</span>
        <div className="flex items-center gap-4 text-sm">
          {store.roundActive && (
            <>
              <span>Vòng {store.round}/{store.maxRounds}</span>
              <span className={`font-mono font-bold ${store.timeLeft <= 10 ? "text-red-500" : "text-gray-700"}`}>
                ⏱ {store.timeLeft}s
              </span>
            </>
          )}
        </div>
        <span className="text-sm text-gray-500 hidden sm:block">Phòng: {roomId}</span>
      </div>

      {/* Word hint bar */}
      <div className="shrink-0 text-center py-2 bg-yellow-50 border-b text-sm min-h-[36px]">
        {store.waitingForDrawer && !store.roundActive && (
          <span className="text-gray-500">⏳ Đang chờ <strong>{store.waitingDrawerName}</strong> chọn từ...</span>
        )}
        {store.roundActive && (
          isDrawer ? (
            <span>Bạn đang vẽ: <strong className="text-blue-600 text-base">{store.myWord}</strong></span>
          ) : (
            <span>
              Người vẽ: <strong>{store.drawerName}</strong> &nbsp;|&nbsp;
              Từ: <span className="font-mono tracking-widest text-base font-bold">{store.maskedWord}</span>
              &nbsp;({store.maskedWord.replace(/ /g, "").length} chữ)
            </span>
          )
        )}
      </div>

      {/* Main layout */}
      <div className="flex flex-1 gap-2 p-2 overflow-hidden min-h-0">
        {/* Left: players */}
        <div className="w-36 shrink-0 overflow-y-auto">
          <PlayerList />
        </div>

        {/* Center: canvas + overlay */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {store.choosingWord && <WordChoiceOverlay />}
          <Canvas isDrawer={isDrawer} />
        </div>

        {/* Right: chat */}
        <div className="w-56 shrink-0 flex flex-col min-h-0">
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
