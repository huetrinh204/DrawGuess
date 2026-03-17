"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { connectSocket, getSocket } from "@/services/socket"
import { useGameStore } from "@/store/gameStore"
import { Player } from "@/types/game"

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
      socket.once("connect", () => {
        setMySocketId(socket.id || "")
        socket.emit("join_room", { roomId, name, avatar })
      })
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
      socket.off("connect")
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
    <div className="flex flex-col items-center justify-center h-screen gap-6 bg-gradient-to-b from-blue-50 to-white">
      <div className="bg-white shadow-md rounded-xl p-8 w-96 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-center">🏠 Phòng chờ</h1>

        <div className="flex items-center gap-2 bg-gray-100 rounded px-3 py-2">
          <span className="text-sm text-gray-500">Mã phòng:</span>
          <span className="font-mono font-bold text-blue-600 flex-1">{roomId}</span>
          <button onClick={copyId} className="text-xs text-blue-500 hover:underline">
            {copied ? "Đã copy!" : "Copy"}
          </button>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-2">Người chơi ({players.length}):</p>
          <ul className="space-y-1">
            {players.map(p => (
              <li key={p.id} className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-50 border-2 border-gray-200 shrink-0">
                  <img src={p.avatar || ""} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <span className="font-medium">{p.name}</span>
                {p.id === mySocketId && <span className="text-xs text-gray-400">(bạn)</span>}
                {p.id === hostId && <span className="text-xs text-yellow-500">👑</span>}
              </li>
            ))}
          </ul>
        </div>

        {players.length < 2 && (
          <p className="text-sm text-amber-500 text-center">Cần ít nhất 2 người để bắt đầu</p>
        )}

        {isHost ? (
          <button
            onClick={startGame}
            disabled={players.length < 2}
            className="bg-green-500 text-white py-2 rounded font-semibold hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Bắt đầu game
          </button>
        ) : (
          <p className="text-sm text-gray-400 text-center">Chờ chủ phòng bắt đầu...</p>
        )}
      </div>
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
