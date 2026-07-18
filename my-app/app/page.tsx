"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLang } from "@/contexts/LanguageContext"
import { RefreshCw, HomeIcon, Footprints, Play, AlertCircle, KeyRound } from "lucide-react"

const AVATARS = [
  "/avatars/bo_1_avatar_01.png", "/avatars/bo_1_avatar_02.png", "/avatars/bo_1_avatar_03.png",
  "/avatars/bo_1_avatar_04.png", "/avatars/bo_1_avatar_05.png", "/avatars/bo_1_avatar_06.png",
  "/avatars/bo_1_avatar_07.png", "/avatars/bo_1_avatar_08.png", "/avatars/bo_1_avatar_09.png",
  "/avatars/bo_1_avatar_10.png", "/avatars/bo_1_avatar_11.png", "/avatars/bo_1_avatar_12.png",
  "/avatars/bo_1_avatar_13.png", "/avatars/bo_1_avatar_14.png", "/avatars/bo_1_avatar_15.png",
  "/avatars/bo_1_avatar_16.png",
  "/avatars/bo_2_avatar_01.png", "/avatars/bo_2_avatar_02.png", "/avatars/bo_2_avatar_03.png",
  "/avatars/bo_2_avatar_04.png", "/avatars/bo_2_avatar_05.png", "/avatars/bo_2_avatar_06.png",
  "/avatars/bo_2_avatar_07.png", "/avatars/bo_2_avatar_08.png",
  "/avatars/bo_3_avatar_01.png", "/avatars/bo_3_avatar_02.png", "/avatars/bo_3_avatar_03.png",
  "/avatars/bo_3_avatar_04.png", "/avatars/bo_3_avatar_05.png", "/avatars/bo_3_avatar_06.png",
  "/avatars/bo_3_avatar_07.png", "/avatars/bo_3_avatar_08.png", "/avatars/bo_3_avatar_09.png",
]

function randomAvatar() {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)]
}

function Modal({ message, emoji, onClose }: { message: string; emoji: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl px-8 py-7 flex flex-col items-center gap-3 max-w-xs w-full mx-4"
        style={{ border: "3px solid #f0e6ff", animation: "popModal 0.25s ease-out both" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
          {emoji === "pencil" ? <AlertCircle className="w-6 h-6 text-purple-500" /> : <KeyRound className="w-6 h-6 text-purple-500" />}
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

export default function Home() {
  const router = useRouter()
  const { t } = useLang()
  const [name, setName] = useState("")
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [prevAvatar, setPrevAvatar] = useState<string | null>(null)
  const [fading, setFading] = useState(false)
  const [joinId, setJoinId] = useState("")
  const [tab, setTab] = useState<"create" | "join">("create")
  const [modal, setModal] = useState<{ message: string; emoji: string } | null>(null)
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    setAvatar(randomAvatar())
  }, [])

  const reroll = useCallback(() => {
    setPrevAvatar(avatar)
    setFading(false)
    setSpinning(true)
    setAvatar(randomAvatar())
    requestAnimationFrame(() => {
      setFading(true)
    })
    setTimeout(() => {
      setPrevAvatar(null)
      setFading(false)
      setSpinning(false)
    }, 400)
  }, [avatar])

  const go = (roomId: string) => {
    if (!name.trim()) { setModal({ message: t("app.name_required"), emoji: "pencil" }); return }
    router.push(`/room?roomId=${roomId}&name=${encodeURIComponent(name.trim())}&avatar=${encodeURIComponent(avatar)}`)
  }

  const createRoom = () => go(Math.random().toString(36).substring(2, 8).toUpperCase())
  const joinRoom = () => {
    if (!joinId.trim()) { setModal({ message: t("app.code_required"), emoji: "home" }); return }
    go(joinId.trim().toUpperCase())
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden"
      style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)" }}
    >
      {modal && <Modal message={modal.message} emoji={modal.emoji} onClose={() => setModal(null)} />}

      {/* Dot pattern overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* Floating blobs */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="absolute rounded-full bg-white/10 pointer-events-none"
          style={{
            width: `${80 + i * 60}px`, height: `${80 + i * 60}px`,
            left: `${i * 20}%`, top: `${10 + i * 15}%`,
            animation: `blobFloat ${4 + i * 0.8}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.5}s`,
          }} />
      ))}

      {/* ── Logo ── */}
      <div className="flex flex-col items-center mb-8 z-10" style={{ animation: "fadeDown 0.7s ease-out both" }}>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-40 bg-yellow-300 scale-125" />
            <img src="/logo.png" alt="DrawGuess"
              className="relative w-32 h-32 object-contain drop-shadow-2xl"
              style={{ animation: "wiggle 3s ease-in-out infinite" }} />
          </div>
          <h1 className="text-5xl font-black tracking-tight drop-shadow-lg"
            style={{
              background: "linear-gradient(90deg, #fff 0%, #ffd700 50%, #fff 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>DrawGuess</h1>
        </div>
        <p className="text-white/70 text-sm mt-2">{t("app.subtitle")}</p>
      </div>

      {/* ── Main card ── */}
      <div className="relative z-10 w-full max-w-2xl mx-4" style={{ animation: "slideUp 0.6s ease-out 0.15s both" }}>
        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden"
          style={{ border: "2px solid rgba(255,255,255,0.3)" }}>

          {/* Top section: avatar + character selection */}
          <div className="px-10 pt-10 pb-8">
            <p className="text-center text-white font-black text-xl uppercase tracking-widest mb-8 drop-shadow">
              {t("app.choose_character")}
            </p>

            <div className="flex items-center justify-center gap-10">
              {/* Avatar display */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div className="relative">
                  {/* Outer glow ring */}
                  <div className="absolute inset-0 rounded-full blur-lg opacity-60 bg-purple-300 scale-110" />
                  <div
                    className="relative w-44 h-44 rounded-full overflow-hidden shadow-2xl"
                    style={{
                      border: "5px solid rgba(255,255,255,0.6)",
                      background: "linear-gradient(135deg, #c084fc, #a855f7)",
                    }}
                  >
                    {prevAvatar && (
                      <img
                        src={prevAvatar}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{
                          opacity: fading ? 0 : 1,
                          transform: fading ? "scale(0.85) rotate(-8deg)" : "scale(1) rotate(0deg)",
                          transition: "opacity 0.35s ease, transform 0.35s ease",
                        }}
                      />
                    )}
                    <img
                      src={avatar}
                      alt="avatar"
                      className="w-full h-full object-cover"
                      style={{
                        opacity: prevAvatar && !fading ? 0 : 1,
                        transform: prevAvatar && fading ? "scale(1) rotate(0deg)" : prevAvatar ? "scale(0.85) rotate(10deg)" : "scale(1) rotate(0deg)",
                        transition: "opacity 0.35s ease, transform 0.35s ease",
                      }}
                    />
                  </div>
                  {/* Reroll button */}
                  <button
                    onClick={reroll}
                    className="absolute -bottom-1 -right-1 w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-white font-black text-lg transition-all hover:scale-110 active:scale-95"
                    style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)", border: "3px solid white" }}
                    title="Random nhân vật khác"
                  >
                    <RefreshCw
                      className="w-5 h-5"
                      style={{ animation: spinning ? "spin360 0.35s linear" : "none" }}
                    />
                  </button>
                </div>
              </div>

              {/* Name input */}
              <div className="flex flex-col gap-4 flex-1 max-w-xs">
                <input
                  className="w-full rounded-2xl px-5 py-3.5 text-lg font-bold outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "2px solid rgba(255,255,255,0.4)",
                    color: "white",
                    backdropFilter: "blur(8px)",
                  }}
                  placeholder={t("app.name_placeholder")}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && tab === "create" && createRoom()}
                  // placeholder style via CSS below
                />
              </div>
            </div>
          </div>

          {/* Bottom section: tabs + actions */}
          <div className="px-10 pb-10" style={{ background: "rgba(0,0,0,0.15)" }}>
            {/* Tab */}
            <div className="flex gap-2 rounded-2xl p-1 mb-5" style={{ background: "rgba(255,255,255,0.1)" }}>
              <button
                onClick={() => setTab("create")}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2"
                style={tab === "create"
                  ? { background: "rgba(255,255,255,0.95)", color: "#7c3aed" }
                  : { color: "rgba(255,255,255,0.6)" }}
                ><HomeIcon className="w-4 h-4" /> {t("app.create_room")}</button>
              <button
                onClick={() => setTab("join")}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2"
                style={tab === "join"
                  ? { background: "rgba(255,255,255,0.95)", color: "#7c3aed" }
                  : { color: "rgba(255,255,255,0.6)" }}
              ><Footprints className="w-4 h-4" /> {t("app.join_room")}</button>
            </div>

            {tab === "create" ? (
              <button
                onClick={createRoom}
                className="w-full py-4 rounded-2xl font-black text-purple-700 text-xl shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                style={{ background: "rgba(255,255,255,0.95)" }}
              >
                <Play className="w-6 h-6 fill-purple-700" />
                {t("app.start")}
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  className="w-full rounded-2xl px-5 py-3.5 outline-none font-mono font-black text-center text-2xl tracking-[0.3em] transition-all"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "2px solid rgba(255,255,255,0.4)",
                    color: "white",
                    backdropFilter: "blur(8px)",
                  }}
                  placeholder={t("app.code_placeholder")}
                  value={joinId}
                  onChange={e => setJoinId(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && joinRoom()}
                />
                <button
                  onClick={joinRoom}
                  className="w-full py-4 rounded-2xl font-black text-purple-700 text-xl shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                  style={{ background: "rgba(255,255,255,0.95)" }}
                >
                  <Play className="w-6 h-6 fill-purple-700" />
                  {t("app.join")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.5); }
        @keyframes blobFloat {
          from { transform: translateY(0) scale(1); }
          to   { transform: translateY(-30px) scale(1.08); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-4deg) scale(1); }
          50%       { transform: rotate(4deg) scale(1.06); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin360 {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
