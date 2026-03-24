"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { connectSocket, getSocket } from "@/services/socket"
import { useGameStore } from "@/store/gameStore"
import { Player } from "@/types/game"

const FLOATS = ["🎨", "🖍️", "🌈", "✨", "🍬", "🎪", "🌟", "🦄"]

function RoomContent() {
  const params = useSearchParams()
  const router = useRouter()
  const name = params.get("name") || ""
  const roomId = params.get("roomId") || ""
  const avatar = params.get("avatar") || "🐱"

  const setRoom = useGameStore(s => s.setRoom)
  const setPlayers = useGameStore(s => s.setPlayers)
  const setMySocketId = useGameStore(s => s.setMySocketId)
  const hostId = useGameStore(s => s.hostId)
  const mySocketId = useGameStore(s => s.mySocketId)

  const [players, setLocalPlayers] = useState<Player[]>([])
  const [copied, setCopied] = useState(false)

  const isHost = mySocketId !== "" && mySocketId === hostId

  useEffect(() => {
    if (!roomId || !name) return
    setRoom(roomId, name)
    connectSocket()
    const socket = getSocket()

    const doJoin = () => {
      setMySocketId(socket.id || "")
      socket.emit("join_room", { roomId, name, avatar })
    }

    if (socket.connected) {
      doJoin()
    } else {
      socket.once("connect", doJoin)
    }

    socket.on("room_update", ({ players, scores, hostId }: { players: Player[]; scores: Record<string, number>; hostId: string }) => {
      setLocalPlayers(players)
      setPlayers(players, scores, hostId)
    })

    const goToGame = () => {
      router.push(`/game?roomId=${roomId}&name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}`)
    }

    socket.on("pre_round", goToGame)
    socket.on("choose_word", goToGame)
    socket.on("waiting_for_word", goToGame)
    socket.on("round_start", goToGame)

    return () => {
      socket.off("connect", doJoin)
      socket.off("room_update")
      socket.off("pre_round")
      socket.off("choose_word")
      socket.off("waiting_for_word")
      socket.off("round_start")
    }
  }, [roomId, name, router, setRoom, setPlayers, setMySocketId])

  const startGame = () => {
    getSocket().emit("start_game", { roomId })
  }

  const copyId = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden"
      style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)" }}
    >
      {/* Floating decorations */}
      {FLOATS.map((emoji, i) => (
        <span
          key={i}
          className="absolute select-none pointer-events-none text-2xl opacity-25"
          style={{
            left: `${6 + i * 12}%`,
            top: `${8 + (i % 4) * 20}%`,
            animation: `floatRoom ${3 + i * 0.5}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.4}s`,
          }}
        >
          {emoji}
        </span>
      ))}

      {/* Bubble blobs */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-10 bg-white"
          style={{
            width: `${50 + i * 35}px`,
            height: `${50 + i * 35}px`,
            right: `${4 + i * 7}%`,
            bottom: `${4 + i * 9}%`,
            animation: `pulseRoom ${2 + i * 0.6}s ease-in-out infinite alternate`,
          }}
        />
      ))}

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md mx-4"
        style={{ animation: "slideUpRoom 0.5s ease-out both" }}
      >
        <div
          className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden"
          style={{ border: "3px solid rgba(255,255,255,0.8)" }}
        >
          {/* Header banner */}
          <div
            className="px-6 py-5 text-center"
            style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-3xl" style={{ animation: "wiggleRoom 2s ease-in-out infinite" }}>🎪</span>
              <h1 className="text-2xl font-black text-white tracking-tight">Phòng chờ</h1>
            </div>
            <p className="text-white/70 text-xs">Mời bạn bè vào cùng nhé!</p>
          </div>

          <div className="p-6 flex flex-col gap-5">
            {/* Room code */}
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ background: "linear-gradient(135deg, #f0f4ff, #faf0ff)" }}
            >
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-0.5">Mã phòng</span>
                <span className="font-mono font-black text-2xl text-purple-700 tracking-widest">{roomId}</span>
              </div>
              <button
                onClick={copyId}
                className="shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95"
                style={{
                  background: copied
                    ? "linear-gradient(135deg, #22c55e, #16a34a)"
                    : "linear-gradient(135deg, #667eea, #764ba2)",
                  color: "white",
                  boxShadow: "0 2px 8px rgba(102,126,234,0.4)",
                }}
              >
                {copied ? "✔ Copied!" : "Copy"}
              </button>
            </div>

            {/* Players */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-black text-purple-600 uppercase tracking-wider">~ Người chơi</span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
                >
                  {players.length}
                </span>
              </div>

              <ul className="space-y-2">
                {players.map((p, i) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-300"
                    style={{
                      background: p.id === mySocketId
                        ? "linear-gradient(135deg, #f0f4ff, #faf0ff)"
                        : "rgba(0,0,0,0.03)",
                      border: p.id === mySocketId ? "2px solid #c4b5fd" : "2px solid transparent",
                      animation: `popIn 0.3s ease-out ${i * 0.08}s both`,
                    }}
                  >
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-purple-200 shadow-sm">
                        <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      </div>
                      {p.id === hostId && (
                        <span className="absolute -top-1 -right-1 text-sm">👑</span>
                      )}
                    </div>
                    <span className="font-bold text-gray-700 flex-1 text-sm">{p.name}</span>
                    {p.id === mySocketId && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full text-purple-600"
                        style={{ background: "#ede9fe" }}
                      >
                        bạn
                      </span>
                    )}
                  </li>
                ))}

                {/* Empty slots */}
                {players.length < 2 && [...Array(2 - players.length)].map((_, i) => (
                  <li
                    key={`empty-${i}`}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 border-2 border-dashed border-purple-200"
                  >
                    <div className="w-11 h-11 rounded-full bg-purple-50 flex items-center justify-center text-xl shrink-0">
                      ?
                    </div>
                    <span className="text-sm text-gray-400 italic">Đang chờ người chơi...</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Status / Start */}
            {players.length < 2 && (
              <div
                className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-amber-700"
                style={{ background: "#fef9c3" }}
              >
                <span className="text-lg">~</span>
                Cần ít nhất 2 người để bắt đầu
              </div>
            )}

            {isHost ? (
              <button
                onClick={startGame}
                disabled={players.length < 2}
                className="relative overflow-hidden py-3.5 rounded-2xl font-black text-white text-lg shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
              >
                Bắt đầu game!
              </button>
            ) : (
              <div
                className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-purple-500"
                style={{ background: "#f5f3ff" }}
              >
                <span className="flex gap-1">
                  {[0,1,2].map(i => (
                    <span key={i} style={{
                      width: 7, height: 7, borderRadius: "50%", background: "#a78bfa", display: "inline-block",
                      animation: `bounceDot 1.2s ease-in-out ${i * 0.2}s infinite`
                    }} />
                  ))}
                </span>
                Chờ chủ phòng bắt đầu...
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes floatRoom {
          from { transform: translateY(0px) rotate(0deg); }
          to   { transform: translateY(-18px) rotate(12deg); }
        }
        @keyframes wiggleRoom {
          0%, 100% { transform: rotate(-8deg); }
          50%       { transform: rotate(8deg); }
        }
        @keyframes pulseRoom {
          from { transform: scale(1); }
          to   { transform: scale(1.08); }
        }
        @keyframes slideUpRoom {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes popIn {
          from { transform: scale(0.85); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes bounceDot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default function RoomPage() {
  return (
    <Suspense>
      <RoomContent />
    </Suspense>
  )
}
