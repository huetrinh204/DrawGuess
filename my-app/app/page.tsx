"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const BASE = "https://api.dicebear.com/9.x/adventurer/svg"

const AVATARS = [
  { id: "Mia",   url: `${BASE}?seed=Mia&backgroundColor=ffb3ba` },
  { id: "Luna",  url: `${BASE}?seed=Luna&backgroundColor=ffc8dd` },
  { id: "Lily",  url: `${BASE}?seed=Lily&backgroundColor=cdb4db` },
  { id: "Zoe",   url: `${BASE}?seed=Zoe&backgroundColor=b5ead7` },
  { id: "Nala",  url: `${BASE}?seed=Nala&backgroundColor=ffdac1` },
  { id: "Cleo",  url: `${BASE}?seed=Cleo&backgroundColor=ffffba` },
  { id: "Hana",  url: `${BASE}?seed=Hana&backgroundColor=a2d2ff` },
  { id: "Yuki",  url: `${BASE}?seed=Yuki&backgroundColor=e8baff` },
  { id: "Felix", url: `${BASE}?seed=Felix&backgroundColor=bae1ff` },
  { id: "Leo",   url: `${BASE}?seed=Leo&backgroundColor=b5ead7` },
  { id: "Max",   url: `${BASE}?seed=Max&backgroundColor=ffdac1` },
  { id: "Kai",   url: `${BASE}?seed=Kai&backgroundColor=ffb3ba` },
  { id: "Riku",  url: `${BASE}?seed=Riku&backgroundColor=cdb4db` },
  { id: "Sora",  url: `${BASE}?seed=Sora&backgroundColor=ffffba` },
  { id: "Kira",  url: `${BASE}?seed=Kira&backgroundColor=ffc8dd` },
  { id: "Nova",  url: `${BASE}?seed=Nova&backgroundColor=a2d2ff` },
]

const FLOATS = ["🐱", "🌸", "🍭", "🦋", "🌙", "🍬", "🐰", "💫"]

export default function Home() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [avatar, setAvatar] = useState(AVATARS[0].url)
  const [joinId, setJoinId] = useState("")
  const [tab, setTab] = useState<"create" | "join">("create")

  const go = (roomId: string) => {
    if (!name.trim()) { alert("Nhập tên trước nhé! 😊"); return }
    router.push(`/room?roomId=${roomId}&name=${encodeURIComponent(name.trim())}&avatar=${encodeURIComponent(avatar)}`)
  }

  const createRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    go(roomId)
  }

  const joinRoom = () => {
    if (!joinId.trim()) { alert("Nhập mã phòng nhé!"); return }
    go(joinId.trim().toUpperCase())
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden"
      style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)" }}>

      {/* Floating decorations */}
      {FLOATS.map((emoji, i) => (
        <span
          key={i}
          className="absolute select-none pointer-events-none text-2xl opacity-30"
          style={{
            left: `${8 + i * 12}%`,
            top: `${10 + (i % 3) * 25}%`,
            animation: `float ${3 + i * 0.4}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.3}s`,
          }}
        >
          {emoji}
        </span>
      ))}

      {/* Bubbles background */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className="absolute rounded-full opacity-10 bg-white"
          style={{
            width: `${60 + i * 40}px`,
            height: `${60 + i * 40}px`,
            right: `${5 + i * 8}%`,
            bottom: `${5 + i * 10}%`,
            animation: `pulse ${2 + i * 0.5}s ease-in-out infinite alternate`,
          }}
        />
      ))}

      {/* Logo + title */}
      <div className="flex flex-col items-center mb-6 z-10"
        style={{ animation: "bounceIn 0.8s ease-out" }}>
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-xl opacity-50 bg-yellow-300 scale-110" />
          <img
            src="/logo.png"
            alt="DrawGuess"
            className="relative w-36 h-36 object-contain drop-shadow-2xl"
            style={{ animation: "wiggle 3s ease-in-out infinite" }}
          />
        </div>
        <h1 className="text-6xl font-black mt-2 drop-shadow-lg"
          style={{
            background: "linear-gradient(90deg, #fff 0%, #ffd700 50%, #fff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "none",
            letterSpacing: "-1px"
          }}>
          DrawGuess
        </h1>
        <p className="text-white/80 text-sm font-medium mt-1 tracking-wide">🌸 Vẽ hình đoán chữ cùng bạn bè 🌸</p>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mx-4"
        style={{ animation: "slideUp 0.6s ease-out 0.2s both" }}>
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 flex flex-col gap-4"
          style={{ border: "3px solid rgba(255,255,255,0.8)" }}>

          {/* Avatar preview + tên */}
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-purple-300 shadow-lg"
                style={{ animation: "pulse 2s ease-in-out infinite" }}>
                <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <span className="absolute -bottom-1 -right-1 text-lg">🌸</span>
            </div>
            <input
              className="flex-1 border-2 border-purple-200 rounded-2xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 text-gray-700 font-medium transition-all"
              placeholder="Tên của bạn 😊"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && tab === "create" && createRoom()}
            />
          </div>

          {/* Chọn avatar */}
          <div>
            <p className="text-xs font-bold text-purple-500 mb-2 uppercase tracking-wider">🐰 Chọn nhân vật</p>
            <div className="grid grid-cols-8 gap-1.5">
              {AVATARS.map(a => (
                <button
                  key={a.id}
                  title={a.id}
                  onClick={() => setAvatar(a.url)}
                  className={`w-10 h-10 rounded-full overflow-hidden border-3 transition-all duration-200
                    ${avatar === a.url
                      ? "border-purple-500 scale-125 shadow-lg shadow-purple-300 z-10 relative"
                      : "border-gray-200 hover:border-purple-300 hover:scale-110"
                    }`}
                  style={{ border: avatar === a.url ? "3px solid #a855f7" : "2px solid #e5e7eb" }}
                >
                  <img src={a.url} alt={a.id} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Tab */}
          <div className="flex gap-2 bg-gray-100 rounded-2xl p-1">
            <button
              onClick={() => setTab("create")}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all duration-200
                ${tab === "create"
                  ? "bg-white text-purple-600 shadow-md"
                  : "text-gray-400 hover:text-gray-600"}`}
            >
              🏡 Tạo phòng
            </button>
            <button
              onClick={() => setTab("join")}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all duration-200
                ${tab === "join"
                  ? "bg-white text-purple-600 shadow-md"
                  : "text-gray-400 hover:text-gray-600"}`}
            >
              🐾 Vào phòng
            </button>
          </div>

          {tab === "create" ? (
            <button
              onClick={createRoom}
              className="relative overflow-hidden py-3 rounded-2xl font-black text-white text-lg shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
              style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
            >
              <span className="relative z-10">🍭 Tạo phòng mới!</span>
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                className="border-2 border-purple-200 rounded-2xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-400 uppercase font-mono font-bold text-center text-lg tracking-widest text-purple-700"
                placeholder="CODE"
                value={joinId}
                onChange={e => setJoinId(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && joinRoom()}
              />
              <button
                onClick={joinRoom}
                className="py-3 rounded-2xl font-black text-white text-lg shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
                style={{ background: "linear-gradient(135deg, #11998e, #38ef7d)" }}
              >
              🐾 Tham gia ngay!
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes float {
          from { transform: translateY(0px) rotate(0deg); }
          to   { transform: translateY(-20px) rotate(10deg); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg) scale(1); }
          50%       { transform: rotate(3deg) scale(1.05); }
        }
        @keyframes bounceIn {
          0%   { transform: scale(0.3); opacity: 0; }
          60%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          from { transform: scale(1); }
          to   { transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
