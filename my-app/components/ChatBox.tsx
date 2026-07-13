"use client"

import { useState, useEffect, useRef } from "react"
import { useGameStore } from "@/store/gameStore"
import { useLang } from "@/contexts/LanguageContext"
import { getSocket } from "@/services/socket"

export default function ChatBox() {
  const { t } = useLang()
  const [input, setInput] = useState("")
  const messages = useGameStore(s => s.messages)
  const roomId = useGameStore(s => s.roomId)
  const drawerId = useGameStore(s => s.drawerId)
  const mySocketId = useGameStore(s => s.mySocketId)
  const drawerName = useGameStore(s => s.drawerName)
  const roundActive = useGameStore(s => s.roundActive)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isDrawer = drawerId !== "" && drawerId === mySocketId

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = () => {
    const msg = input.trim()
    if (!msg || !roomId) return
    getSocket().emit("send_message", { roomId, message: msg })
    setInput("")
  }

  const getBubbleStyle = (type: string) => {
    if (type === "system") return "bg-blue-50 text-blue-600 border border-blue-100 text-xs font-bold text-center rounded-2xl px-3 py-2"
    if (type === "correct") return "bg-green-50 text-green-600 border border-green-100 px-4 py-2 rounded-2xl rounded-tl-none text-sm font-bold"
    if (type === "wrong") return "bg-red-50 text-red-500 border border-red-100 px-4 py-2 rounded-2xl rounded-tl-none text-sm font-bold"
    return "bg-gray-100 text-gray-700 px-4 py-2 rounded-2xl rounded-tl-none text-sm"
  }

  const getAvatarEmoji = (sender: string) => {
    // Simple deterministic emoji based on name
    const emojis = ["🐰", "🦊", "🐼", "🐨", "🐸", "🐯", "🦁", "🐶"]
    let hash = 0
    for (let i = 0; i < sender.length; i++) hash = (hash + sender.charCodeAt(i)) % emojis.length
    return emojis[hash]
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
      {/* Header */}
      <div className="bg-pink-500 px-4 py-3 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-2 font-bold text-sm">
          <svg className="w-4 h-4 opacity-80" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
          </svg>
          {t("app.chat_title")}
        </div>
        <span className="text-[10px] opacity-80">
          {isDrawer ? t("app.chat_drawer_status") : t("app.chat_guesser_status")}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {roundActive && drawerName && (
          <div className="bg-blue-50 text-blue-600 text-[10px] font-bold p-2 rounded-2xl border border-blue-100 text-center">
            {t("app.chat_guessing", { name: drawerName })}
          </div>
        )}

        {messages.map((m, i) => {
          if (m.type === "system") {
            return (
              <div key={i} className={getBubbleStyle("system")}>{m.message}</div>
            )
          }
          return (
            <div key={i} className="flex items-start gap-2">
              <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5">
                {getAvatarEmoji(m.sender)}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] font-bold text-gray-400 leading-none">{m.sender}</span>
                <div className={getBubbleStyle(m.type)}>{m.message}</div>
                {m.type === "wrong" && (
                  <span className="text-[9px] text-red-300 font-medium ml-1">Chưa đúng, thử lại nha!</span>
                )}
                {m.type === "correct" && (
                  <span className="text-[9px] text-green-400 font-medium ml-1">Đúng rồi! 🎉</span>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 p-3 bg-gray-50 border-t border-gray-100">
        {isDrawer ? (
          <div className="bg-orange-50 border border-orange-100 p-3 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-base">🎨</div>
              <div className="flex flex-col leading-tight">
                <span className="text-orange-800 font-bold text-xs">{t("app.chat_drawer_info")}</span>
                <span className="text-orange-400 text-[10px]">{t("app.chat_drawer_sub")}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className="flex-1 bg-purple-50 border border-purple-100 rounded-2xl py-2.5 px-4 text-xs font-bold text-purple-600 placeholder-purple-300 focus:outline-none focus:border-purple-300"
              placeholder={t("app.chat_input_placeholder")}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
            />
            <button
              onClick={send}
              className="bg-purple-600 text-white px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 hover:bg-purple-700 transition-colors"
            >
              {t("app.chat_send")}
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
