"use client"

import { useState, useEffect, useRef } from "react"
import { useGameStore } from "@/store/gameStore"
import { useLang } from "@/contexts/LanguageContext"
import { getSocket } from "@/services/socket"
import { MessageCircle, Send, Pencil } from "lucide-react"
import PlayerAvatar from "@/components/PlayerAvatar"

export default function ChatBox() {
  const { t } = useLang()
  const [input, setInput] = useState("")
  const messages = useGameStore(s => s.messages)
  const roomId = useGameStore(s => s.roomId)
  const drawerId = useGameStore(s => s.drawerId)
  const myPlayerId = useGameStore(s => s.myPlayerId)
  const drawerName = useGameStore(s => s.drawerName)
  const roundActive = useGameStore(s => s.roundActive)
  const players = useGameStore(s => s.players)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isDrawer = drawerId !== "" && drawerId === myPlayerId

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = () => {
    const msg = input.trim()
    if (!msg || !roomId) return
    getSocket().emit("send_message", { roomId, message: msg })
    setInput("")
  }

  const getBubbleStyle = (type: string, messageKey?: string) => {
    if (messageKey === "app.chat_close_guess") {
      return "bg-amber-50 text-amber-700 border border-amber-100 text-xs font-bold text-center rounded-2xl px-3 py-2"
    }
    if (messageKey === "app.chat_wrong_try_again") {
      return "bg-red-50 text-red-500 border border-red-100 text-xs font-bold text-center rounded-2xl px-3 py-2"
    }
    if (type === "system") return "bg-blue-50 text-blue-600 border border-blue-100 text-xs font-bold text-center rounded-2xl px-3 py-2"
    if (type === "correct") return "bg-green-50 text-green-600 border border-green-100 text-xs font-bold text-center rounded-2xl px-3 py-2"
    if (type === "wrong") return "bg-red-50 text-red-500 border border-red-100 px-4 py-2 rounded-2xl rounded-tl-none text-sm font-bold"
    return "bg-gray-100 text-gray-700 px-4 py-2 rounded-2xl rounded-tl-none text-sm"
  }

  const getSenderAvatar = (sender: string, avatar?: string) => {
    if (avatar) return avatar
    const p = players.find(p => p.name === sender)
    return p?.avatar || ""
  }

  const resolveMessage = (m: { message: string; messageKey?: string; messageVars?: Record<string, string> }) => {
    if (m.messageKey) return t(m.messageKey, m.messageVars)
    return m.message
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="bg-pink-500 px-4 py-3 flex items-center justify-between text-white shrink-0 rounded-t-3xl">
        <div className="flex items-center gap-2 font-bold text-sm">
          <MessageCircle className="w-4 h-4 opacity-80" />
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
          if (m.type === "system" || m.type === "correct") {
            return (
              <div key={i} className={getBubbleStyle(m.type, m.messageKey)}>{resolveMessage(m)}</div>
            )
          }
          return (
            <div key={i} className="flex items-start gap-2">
              <div className="shrink-0 mt-0.5">
                <PlayerAvatar src={getSenderAvatar(m.sender, m.avatar)} name={m.sender} size="w-7 h-7" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] font-bold text-gray-400 leading-none">{m.sender}</span>
                <div className={getBubbleStyle(m.type)}>{m.message}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 px-3 pt-2.5 pb-3 bg-gray-50 border-t border-gray-100 rounded-b-3xl">
        {isDrawer ? (
          <div className="bg-orange-50 border border-orange-100 p-3 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                <Pencil className="w-4 h-4 text-orange-500" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-orange-800 font-bold text-xs">{t("app.chat_drawer_info")}</span>
                <span className="text-orange-400 text-[10px]">{t("app.chat_drawer_sub")}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <input
              disabled={!roundActive}
              className="min-w-0 flex-1 h-10 bg-purple-50 border border-purple-100 rounded-xl px-3.5 text-xs font-bold text-purple-600 placeholder-purple-300 focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-200 disabled:opacity-50"
              placeholder={t("app.chat_input_placeholder")}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
            />
            <button
              type="button"
              onClick={send}
              disabled={!roundActive || !input.trim()}
              aria-label={t("app.chat_send")}
              className="shrink-0 h-10 px-3.5 flex items-center justify-center gap-1.5 rounded-xl font-bold text-xs text-white bg-gradient-to-br from-[#667eea] to-[#764ba2] shadow-sm transition-[filter,opacity] duration-150 hover:brightness-110 active:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="hidden sm:inline">{t("app.chat_send")}</span>
              <Send className="w-4 h-4 shrink-0" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
