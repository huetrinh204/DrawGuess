"use client"

import { useState, useEffect, useRef } from "react"
import { useGameStore } from "@/store/gameStore"
import { getSocket } from "@/services/socket"

export default function ChatBox() {
  const [input, setInput] = useState("")
  const messages = useGameStore(s => s.messages)
  const roomId = useGameStore(s => s.roomId)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = () => {
    const msg = input.trim()
    if (!msg || !roomId) return
    getSocket().emit("send_message", { roomId, message: msg })
    setInput("")
  }

  const msgColor = (type: string) => {
    if (type === "system") return "text-gray-400 italic text-xs"
    if (type === "correct") return "text-green-600 font-semibold text-sm"
    return "text-sm"
  }

  return (
    <div className="flex flex-col h-full border rounded bg-white">
      <div className="p-2 border-b font-semibold text-sm bg-gray-50">Chat & Đoán chữ</div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ minHeight: 0 }}>
        {messages.map((m, i) => (
          <div key={i} className={msgColor(m.type)}>
            {m.type !== "system" && <span className="font-medium">{m.sender}: </span>}
            {m.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex border-t p-2 gap-2">
        <input
          className="flex-1 border rounded px-2 py-1 text-sm outline-none"
          placeholder="Nhập đoán / chat..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
        >
          Gửi
        </button>
      </div>
    </div>
  )
}
