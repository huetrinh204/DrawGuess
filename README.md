<div align="center">

<img src="./my-app/public/logo.png" alt="DrawGuess Logo" width="140" />

# 🎨 DrawGuess

### *Vẽ hình đoán chữ cùng bạn bè — realtime, vui hết nấc!*

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-realtime-010101?style=for-the-badge&logo=socket.io)](https://socket.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## ✨ Tính năng

- 🏡 **Tạo & tham gia phòng** — tạo phòng riêng, chia sẻ mã code cho bạn bè
- 🎭 **Chọn nhân vật** — 33 avatar nội bộ để thể hiện cá tính
- 🖌️ **Vẽ realtime** — canvas đồng bộ tức thì cho tất cả người chơi
- 💬 **Chat & đoán chữ** — gõ đáp án vào chat, đoán đúng là có điểm ngay
- 🏆 **Bảng xếp hạng** — điểm tính theo tốc độ đoán, ai nhanh thì nhiều điểm hơn
- 🎵 **Nhạc nền** — bật/tắt nhạc tùy thích, tự dừng khi vào game
- 👑 **Host controls** — chủ phòng toàn quyền bắt đầu game
- ⚡ **Realtime hoàn toàn** — dùng WebSocket, không cần refresh

---

## 🎮 Cách chơi

```
1. 🏠  Vào trang chủ → nhập tên + chọn avatar
2. 🏡  Tạo phòng mới hoặc nhập mã để vào phòng bạn bè
3. ⏳  Chờ đủ 2 người → host bấm "Bắt đầu game"
4. 🖊️  Người vẽ chọn 1 trong 2 từ gợi ý rồi vẽ lên canvas
5. 💬  Người còn lại đoán từ qua chat — đoán đúng = điểm!
6. 🔄  Mỗi người vẽ đúng một lượt → xem bảng xếp hạng cuối game
```

---

## 🗂️ Cấu trúc dự án

```
📦 root
├── 🖥️  backend/
│   ├── server.js          # Entry point
│   ├── gameServer.js      # State machine + Socket.IO protocol
│   ├── test/              # Integration tests đa client
│   └── package.json
│
└── 🌐 my-app/
    ├── app/
    │   ├── page.tsx        # Trang chủ (chọn tên, avatar, tạo/vào phòng)
    │   ├── room/page.tsx   # Phòng chờ
    │   ├── game/page.tsx   # Màn hình game chính
    │   └── layout.tsx      # Root layout + AudioProvider
    ├── components/
    │   ├── Canvas.tsx      # Canvas vẽ realtime
    │   ├── ChatBox.tsx     # Chat & đoán chữ
    │   ├── PlayerList.tsx  # Danh sách người chơi + điểm
    │   └── AudioProvider.tsx # Quản lý nhạc nền toàn app
    ├── store/
    │   └── gameStore.ts    # Zustand global state
    ├── services/
    │   └── socket.ts       # Socket.io client
    └── types/
        └── game.ts         # TypeScript types
```

---

## 🚀 Chạy dự án

### Yêu cầu
- Node.js 18+
- npm hoặc yarn

### 1. Clone & cài dependencies

```bash
git clone <repo-url>

# Backend
cd backend
npm install

# Frontend
cd ../my-app
npm install
```

### 2. Khởi động

```bash
# Từ thư mục gốc: backend 5000 + frontend 3000
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) và chơi thôi! 🎉

Chạy bằng Docker:

```bash
# Development
docker compose -f docker-compose.dev.yml up --build

# Production qua Nginx tại cổng 80
docker compose up --build
```

---

## 🛠️ Tech Stack

| Layer | Công nghệ |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand |
| Realtime | Socket.io |
| Backend | Node.js + Express |
| Avatars | PNG nội bộ |

---

## 🔌 Realtime protocol & an toàn trạng thái

- Server là nguồn dữ liệu authoritative cho host, drawer, phase, timer và điểm.
- Game đi qua các phase: `LOBBY → CHOOSING → DRAWING → ROUND_END → GAME_OVER`.
- `playerId` ổn định và resume token thay cho socket ID; token được giữ trong `sessionStorage`.
- Mất mạng có 30 giây để reconnect mà vẫn giữ điểm, host và vai trò hiện tại.
- Chỉ host được bắt đầu; chỉ drawer được chọn từ/vẽ/xóa; chỉ thành viên đúng phòng được chat/đoán.
- Timer dùng deadline server và `endRound` là idempotent để tránh chấm điểm hoặc chuyển vòng hai lần.

Các event client chính: `join_room`, `request_snapshot`, `start_game`, `word_chosen`, `draw`, `clear_canvas`, `send_message`, `leave_room`.

Các event server chính: `session_joined`, `game_snapshot`, `room_update`, `pre_round`, `choose_word`, `waiting_for_word`, `round_start`, `round_end`, `game_over`, `room_closed`.

> Trạng thái phòng vẫn nằm trong RAM của một process. Restart server sẽ mất phòng và triển khai nhiều backend instance cần shared state/Socket.IO adapter.

## ✅ Kiểm tra

```bash
cd backend
npm test

cd ../my-app
npm run lint
npm run build
```

---

<div align="center">

Made By Huệ Trinh Meo ☕

</div>
