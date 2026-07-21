"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useLang } from "@/contexts/LanguageContext"
import {
  RefreshCw, HomeIcon, Footprints, Play, AlertCircle, KeyRound,
  Pencil, MessageCircle, Users, Sparkles, ChevronLeft, ChevronRight,
} from "lucide-react"

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

const FLOATING_AVATARS = [0, 5, 9, 14, 19, 24, 28, 31]

function randomAvatar() {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)]
}

function Modal({ message, emoji, onClose }: { message: string; emoji: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl px-8 py-7 flex flex-col items-center gap-3 max-w-xs w-full mx-4"
        style={{ border: "3px solid #f0e6ff", animation: "home-pop 0.25s ease-out both" }}
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
    </div>
  )
}

function AvatarScrollStrip({
  avatars,
  selected,
  onSelect,
}: {
  avatars: string[]
  selected: string
  onSelect: (avatar: string) => void
}) {
  const stripRef = useRef<HTMLDivElement>(null)
  const interaction = useRef({
    pointerId: -1,
    moved: false,
    startX: 0,
    scrollLeft: 0,
    avatar: null as string | null,
  })

  const scrollBy = (delta: number) => {
    stripRef.current?.scrollBy({ left: delta, behavior: "smooth" })
  }

  const onPointerDown = (e: React.PointerEvent, avatar: string | null) => {
    if (!stripRef.current) return
    interaction.current = {
      pointerId: e.pointerId,
      moved: false,
      startX: e.clientX,
      scrollLeft: stripRef.current.scrollLeft,
      avatar,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerId !== interaction.current.pointerId || !stripRef.current) return
    const dx = e.clientX - interaction.current.startX
    if (Math.abs(dx) > 6) interaction.current.moved = true
    if (interaction.current.moved) {
      stripRef.current.scrollLeft = interaction.current.scrollLeft - dx
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerId !== interaction.current.pointerId) return
    const { moved, avatar } = interaction.current
    interaction.current.pointerId = -1
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    if (!moved && avatar) onSelect(avatar)
  }

  return (
    <div className="w-full">
      <div className="relative flex items-center gap-1">
        <button
          type="button"
          onClick={() => scrollBy(-160)}
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="relative flex-1 min-w-0">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-6 z-10 bg-gradient-to-r from-[rgba(90,80,160,0.45)] to-transparent rounded-l-2xl" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 z-10 bg-gradient-to-l from-[rgba(90,80,160,0.45)] to-transparent rounded-r-2xl" />

          <div
            ref={stripRef}
            className="avatar-scroll flex gap-2.5 overflow-x-auto px-1 py-2 cursor-grab active:cursor-grabbing select-none touch-pan-x"
            onPointerDown={e => onPointerDown(e, null)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {avatars.map(a => (
              <button
                key={a}
                type="button"
                onPointerDown={e => {
                  e.stopPropagation()
                  onPointerDown(e, a)
                }}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden transition-transform duration-200 hover:scale-105"
                style={{
                  border: selected === a ? "3px solid #fde047" : "2px solid rgba(255,255,255,0.4)",
                  boxShadow: selected === a
                    ? "0 0 0 2px rgba(253,224,71,0.45), 0 4px 12px rgba(0,0,0,0.2)"
                    : "0 2px 8px rgba(0,0,0,0.15)",
                  transform: selected === a ? "scale(1.06)" : "scale(1)",
                }}
              >
                <img
                  src={a}
                  alt=""
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none"
                  onDragStart={e => e.preventDefault()}
                />
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => scrollBy(160)}
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

function FloatingDecor() {
  return (
    <>
      {/* Sparkles */}
      {[...Array(12)].map((_, i) => (
        <Sparkles
          key={`spark-${i}`}
          className="absolute text-yellow-200/70 pointer-events-none"
          style={{
            width: 10 + (i % 3) * 6,
            height: 10 + (i % 3) * 6,
            left: `${6 + (i * 8) % 88}%`,
            top: `${8 + (i * 11) % 84}%`,
            animation: `home-sparkle ${2 + (i % 4) * 0.4}s ease-in-out infinite`,
            animationDelay: `${i * 0.25}s`,
          }}
        />
      ))}

      {/* Floating mascot avatars */}
      {FLOATING_AVATARS.map((idx, i) => (
        <div
          key={idx}
          className="absolute pointer-events-none select-none rounded-full overflow-hidden shadow-xl border-[3px] border-white/40"
          style={{
            width: 44 + (i % 3) * 12,
            height: 44 + (i % 3) * 12,
            left: `${[4, 82, 8, 78, 2, 88, 12, 72][i]}%`,
            top: `${[12, 18, 72, 68, 42, 52, 82, 28][i]}%`,
            animation: `${i % 2 === 0 ? "home-float" : "home-float-reverse"} ${3.5 + i * 0.35}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
            opacity: 0.55,
          }}
        >
          <img src={AVATARS[idx]} alt="" className="w-full h-full object-cover" />
        </div>
      ))}

      {/* Soft blobs */}
      {[...Array(4)].map((_, i) => (
        <div
          key={`blob-${i}`}
          className="absolute rounded-full pointer-events-none blur-3xl"
          style={{
            width: 180 + i * 80,
            height: 180 + i * 80,
            background: ["rgba(255,255,255,0.12)", "rgba(255,215,0,0.15)", "rgba(240,147,251,0.2)", "rgba(102,126,234,0.18)"][i],
            left: `${[5, 60, 20, 70][i]}%`,
            top: `${[10, 55, 75, 25][i]}%`,
            animation: `home-float ${5 + i}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.6}s`,
          }}
        />
      ))}
    </>
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAvatar(randomAvatar())
      setMounted(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const selectAvatar = useCallback((next: string) => {
    if (next === avatar) return
    setPrevAvatar(avatar)
    setFading(false)
    setAvatar(next)
    requestAnimationFrame(() => setFading(true))
    setTimeout(() => {
      setPrevAvatar(null)
      setFading(false)
    }, 400)
  }, [avatar])

  const reroll = useCallback(() => {
    setSpinning(true)
    let next = randomAvatar()
    while (next === avatar) next = randomAvatar()
    selectAvatar(next)
    setTimeout(() => setSpinning(false), 400)
  }, [avatar, selectAvatar])

  const go = (roomId: string) => {
    if (!name.trim()) { setModal({ message: t("app.name_required"), emoji: "pencil" }); return }
    router.push(`/room?roomId=${roomId}&name=${encodeURIComponent(name.trim())}&avatar=${encodeURIComponent(avatar)}`)
  }

  const createRoom = () => go(Math.random().toString(36).substring(2, 8).toUpperCase())
  const joinRoom = () => {
    if (!joinId.trim()) { setModal({ message: t("app.code_required"), emoji: "home" }); return }
    go(joinId.trim().toUpperCase())
  }

  const tags = [
    { icon: Pencil, label: t("app.home_tag_draw"), color: "from-cyan-400 to-blue-500" },
    { icon: MessageCircle, label: t("app.home_tag_guess"), color: "from-pink-400 to-rose-500" },
    { icon: Users, label: t("app.home_tag_friends"), color: "from-amber-400 to-orange-500" },
  ]

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen overflow-x-hidden overflow-y-auto py-8 px-4"
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 35%, #f093fb 70%, #667eea 100%)",
        backgroundSize: "300% 300%",
        animation: "home-gradient-shift 12s ease infinite",
      }}
    >
      {modal && <Modal message={modal.message} emoji={modal.emoji} onClose={() => setModal(null)} />}
      <FloatingDecor />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #fff 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }}
      />

      {/* ── Hero ── */}
      <div
        className="flex flex-col items-center mb-6 z-10 text-center"
        style={{ animation: mounted ? "home-slide-in 0.7s ease-out both" : undefined }}
      >
        <div className="relative mb-3">
          <div className="absolute -inset-4 rounded-full bg-yellow-300/30 blur-2xl animate-pulse" />
          <div className="relative flex items-center justify-center" style={{ animation: "home-bob 3s ease-in-out infinite" }}>
            <img
              src="/logo.png"
              alt="DrawGuess"
              className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-2xl"
            />
          </div>
        </div>

        <h1
          className="text-4xl sm:text-6xl font-black tracking-tight drop-shadow-lg"
          style={{
            background: "linear-gradient(90deg, #fff 0%, #fde047 25%, #fff 50%, #f0abfc 75%, #fff 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "home-shimmer 4s linear infinite",
          }}
        >
          DrawGuess
        </h1>
        <p className="text-white/85 text-sm sm:text-base mt-2 font-semibold max-w-sm">{t("app.subtitle")}</p>

        {/* Feature tags */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {tags.map(({ icon: Icon, label, color }) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${color} shadow-lg`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Main card ── */}
      <div
        className="relative z-10 w-full max-w-2xl"
        style={{ animation: mounted ? "home-slide-in 0.65s ease-out 0.12s both" : undefined }}
      >
        <div
          className="rounded-3xl shadow-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.14)",
            backdropFilter: "blur(16px)",
            border: "2px solid rgba(255,255,255,0.35)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          {/* Avatar + name */}
          <div className="px-4 sm:px-10 pt-8 pb-6">
            <p className="text-center text-white font-black text-base sm:text-lg uppercase tracking-widest mb-5 drop-shadow">
              {t("app.choose_character")}
            </p>

            <div className="flex flex-col gap-5">
              <div className="flex flex-row items-center gap-4 sm:gap-6">
                {/* Avatar preview */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="relative">
                    <div
                      className="absolute -inset-2 rounded-full opacity-70"
                      style={{
                        background: "conic-gradient(from 0deg, #fde047, #f472b6, #818cf8, #22d3ee, #fde047)",
                        animation: "spin360 4s linear infinite",
                      }}
                    />
                    <div
                      className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-2xl"
                      style={{ border: "4px solid white", background: "linear-gradient(135deg, #c084fc, #a855f7)" }}
                    >
                      {prevAvatar && (
                        <img
                          src={prevAvatar}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                          style={{
                            opacity: fading ? 0 : 1,
                            transform: fading ? "scale(0.85) rotate(-8deg)" : "scale(1)",
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
                          transform: prevAvatar && fading ? "scale(1)" : prevAvatar ? "scale(0.85) rotate(10deg)" : "scale(1)",
                          transition: "opacity 0.35s ease, transform 0.35s ease",
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={reroll}
                      aria-label="Random avatar"
                      className="absolute -bottom-1 -right-1 w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95"
                      style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)", border: "3px solid white" }}
                    >
                      <RefreshCw className="w-4 h-4" style={{ animation: spinning ? "spin360 0.35s linear" : "none" }} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-w-0 self-center">
                  <AvatarScrollStrip
                    avatars={AVATARS}
                    selected={avatar}
                    onSelect={selectAvatar}
                  />
                </div>
              </div>

              <input
                className="home-input w-full rounded-2xl px-5 py-3.5 text-base sm:text-lg font-bold outline-none transition-all focus:ring-2 focus:ring-yellow-300/50"
                placeholder={t("app.name_placeholder")}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && tab === "create" && createRoom()}
              />
            </div>
          </div>

          {/* Tabs + CTA */}
          <div className="px-4 sm:px-10 pb-8 pt-2" style={{ background: "rgba(0,0,0,0.12)" }}>
            <div className="flex gap-2 rounded-2xl p-1 mb-5" style={{ background: "rgba(255,255,255,0.1)" }}>
              <button
                onClick={() => setTab("create")}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2"
                style={tab === "create"
                  ? { background: "rgba(255,255,255,0.95)", color: "#7c3aed", boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }
                  : { color: "rgba(255,255,255,0.65)" }}
              >
                <HomeIcon className="w-4 h-4" /> {t("app.create_room")}
              </button>
              <button
                onClick={() => setTab("join")}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2"
                style={tab === "join"
                  ? { background: "rgba(255,255,255,0.95)", color: "#7c3aed", boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }
                  : { color: "rgba(255,255,255,0.65)" }}
              >
                <Footprints className="w-4 h-4" /> {t("app.join_room")}
              </button>
            </div>

            {tab === "create" ? (
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{ animation: "home-pulse-ring 2s ease-out infinite", background: "rgba(255,255,255,0.35)" }}
                />
                <button
                  onClick={createRoom}
                  className="relative w-full py-4 rounded-2xl font-black text-purple-700 text-lg sm:text-xl shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                  style={{ background: "linear-gradient(135deg, #fff 0%, #f3e8ff 100%)" }}
                >
                  <Play className="w-6 h-6 fill-purple-700" />
                  {t("app.start")}
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  className="home-input w-full rounded-2xl px-5 py-3.5 outline-none font-mono font-black text-center text-xl sm:text-2xl tracking-[0.3em] transition-all focus:ring-2 focus:ring-yellow-300/50"
                  placeholder={t("app.code_placeholder")}
                  value={joinId}
                  onChange={e => setJoinId(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && joinRoom()}
                />
                <button
                  onClick={joinRoom}
                  className="w-full py-4 rounded-2xl font-black text-purple-700 text-lg sm:text-xl shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                  style={{ background: "linear-gradient(135deg, #fff 0%, #f3e8ff 100%)" }}
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
        .home-input {
          background: rgba(255,255,255,0.15);
          border: 2px solid rgba(255,255,255,0.4);
          color: white;
          backdrop-filter: blur(8px);
        }
        .home-input::placeholder { color: rgba(255,255,255,0.5); }
        .avatar-scroll {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.55) rgba(255,255,255,0.12);
        }
        .avatar-scroll::-webkit-scrollbar { height: 10px; }
        .avatar-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.12);
          border-radius: 999px;
          margin: 0 4px;
        }
        .avatar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.5);
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .avatar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.7);
          background-clip: padding-box;
        }
        @keyframes spin360 {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
