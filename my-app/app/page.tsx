"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

// Dùng DiceBear Adventurer style - chibi anime dễ thương, màu pastel
const BASE = "https://api.dicebear.com/9.x/adventurer/svg"

const AVATARS = [
  { id: "Mia",     label: "Mia",     url: `${BASE}?seed=Mia&backgroundColor=ffb3ba` },
  { id: "Luna",    label: "Luna",    url: `${BASE}?seed=Luna&backgroundColor=ffc8dd` },
  { id: "Lily",    label: "Lily",    url: `${BASE}?seed=Lily&backgroundColor=cdb4db` },
  { id: "Zoe",     label: "Zoe",     url: `${BASE}?seed=Zoe&backgroundColor=b5ead7` },
  { id: "Nala",    label: "Nala",    url: `${BASE}?seed=Nala&backgroundColor=ffdac1` },
  { id: "Cleo",    label: "Cleo",    url: `${BASE}?seed=Cleo&backgroundColor=ffffba` },
  { id: "Hana",    label: "Hana",    url: `${BASE}?seed=Hana&backgroundColor=a2d2ff` },
  { id: "Yuki",    label: "Yuki",    url: `${BASE}?seed=Yuki&backgroundColor=e8baff` },
  { id: "Felix",   label: "Felix",   url: `${BASE}?seed=Felix&backgroundColor=bae1ff` },
  { id: "Leo",     label: "Leo",     url: `${BASE}?seed=Leo&backgroundColor=b5ead7` },
  { id: "Max",     label: "Max",     url: `${BASE}?seed=Max&backgroundColor=ffdac1` },
  { id: "Kai",     label: "Kai",     url: `${BASE}?seed=Kai&backgroundColor=ffb3ba` },
  { id: "Riku",    label: "Riku",    url: `${BASE}?seed=Riku&backgroundColor=cdb4db` },
  { id: "Sora",    label: "Sora",    url: `${BASE}?seed=Sora&backgroundColor=ffffba` },
  { id: "Kira",    label: "Kira",    url: `${BASE}?seed=Kira&backgroundColor=ffc8dd` },
  { id: "Nova",    label: "Nova",    url: `${BASE}?seed=Nova&backgroundColor=a2d2ff` },
]

export default function Home() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [avatar, setAvatar] = useState(AVATARS[0].url)
  const [joinId, setJoinId] = useState("")
  const [tab, setTab] = useState<"create" | "join">("create")

  const go = (roomId: string) => {
    if (!name.trim()) { alert("Nhập tên trước nhé!"); return }
    router.push(`/room?roomId=${roomId}&name=${encodeURIComponent(name.trim())}&avatar=${encodeURIComponent(avatar)}`)
  }

  const createRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    go(roomId)
  }

  const joinRoom = () => {
    if (!joinId.trim()) { alert("Nhập mã phòng"); return }
    go(joinId.trim().toUpperCase())
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 py-8 bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold text-blue-600">🎨 DrawGuess</h1>
        <p className="text-gray-500 mt-1">Vẽ hình đoán chữ cùng bạn bè</p>
      </div>

      <div className="bg-white shadow-md rounded-xl p-6 w-96 flex flex-col gap-4">

        {/* Avatar preview + tên */}
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-300 overflow-hidden shrink-0">
            <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
          </div>
          <input
            className="flex-1 border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Tên của bạn"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Chọn avatar */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Chọn nhân vật cute:</p>
          <div className="grid grid-cols-8 gap-1">
            {AVATARS.map(a => (
              <button
                key={a.id}
                title={a.label}
                onClick={() => setAvatar(a.url)}
                className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all bg-white
                  ${avatar === a.url
                    ? "border-blue-500 scale-110 shadow-lg"
                    : "border-gray-200 hover:border-blue-300 hover:scale-105"
                  }`}
              >
                <img src={a.url} alt={a.label} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Tab tạo / vào phòng */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("create")}
            className={`flex-1 py-1 rounded text-sm font-medium ${tab === "create" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            Tạo phòng
          </button>
          <button
            onClick={() => setTab("join")}
            className={`flex-1 py-1 rounded text-sm font-medium ${tab === "join" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            Vào phòng
          </button>
        </div>

        {tab === "create" ? (
          <button
            onClick={createRoom}
            className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600 font-semibold"
          >
            Tạo phòng mới
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              className="border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300 uppercase"
              placeholder="Mã phòng"
              value={joinId}
              onChange={e => setJoinId(e.target.value.toUpperCase())}
            />
            <button
              onClick={joinRoom}
              className="bg-green-500 text-white py-2 rounded hover:bg-green-600 font-semibold"
            >
              Tham gia
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
