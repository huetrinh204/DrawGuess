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
  }, [roomId, name])

  const socketId = store.mySocketId
  const isDrawer = store.drawerId !== "" && store.drawerId === socketId

  if (store.gameOver) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="bg-white shadow-md rounded-xl p-8 w-80 text-center">
          <h2 className="text-3xl font-bold mb-4">🏆 Kết quả</h2>
          <ol className="space-y-2 mb-6">
            {store.leaderboard.map((p, i) => (
              <li key={i} className="flex justify-between items-center text-sm px-2">
                <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`} {p.name}</span>
                <span className="font-bold text-blue-600">{p.score} điểm</span>
              </li>
            ))}
          </ol>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 font-semibold"
          >
            Về trang chủ
          </button>
        </div>
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
