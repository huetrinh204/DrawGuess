const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, { cors: { origin: "*" } })

// rooms: { [roomId]: { players: [], word: '', drawerId: '', round: 0, maxRounds: 3, scores: {}, guessed: [], timer: null } }
const rooms = {}

const WORDS = [
  "mèo", "chó", "nhà", "xe hơi", "cây", "hoa", "mặt trời", "trăng", "sao",
  "cá", "chim", "bướm", "máy bay", "tàu thuyền", "núi", "biển", "sông",
  "bánh", "pizza", "kem", "táo", "chuối", "dưa hấu", "bóng đá", "bóng rổ",
  "đàn guitar", "piano", "trống", "điện thoại", "máy tính", "tivi", "sách",
  "bút chì", "kính", "mũ", "áo", "giày", "túi xách", "đồng hồ", "xe đạp"
]



function pickWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)]
}

function pickTwoWords() {
  const shuffled = [...WORDS].sort(() => Math.random() - 0.5)
  return [shuffled[0], shuffled[1]]
}

function getMaskedWord(word) {
  return word.split("").map(c => c === " " ? " " : "_").join("")
}

function startRound(roomId) {
  const room = rooms[roomId]
  if (!room || room.players.length < 2) return

  room.drawerIndex = (room.drawerIndex + 1) % room.players.length
  const drawer = room.players[room.drawerIndex]
  room.drawerId = drawer.id
  room.word = ""
  room.guessed = []
  room.choosingWord = true
  room.readyPlayers = new Set()

  const wordChoices = pickTwoWords()
  room.wordChoices = wordChoices

  // Bước 1: báo tất cả navigate sang /game trước
  io.to(roomId).emit("pre_round", {
    drawerId: drawer.id,
    drawerName: drawer.name,
    round: room.round,
    maxRounds: room.maxRounds
  })

  // Sau 2 giây (đủ thời gian navigate) mới gửi choose_word
  if (room.chooseTimer) clearTimeout(room.chooseTimer)
  room.chooseTimer = setTimeout(() => {
    io.to(drawer.id).emit("choose_word", { words: wordChoices })
    socket_broadcast_except(roomId, drawer.id, "waiting_for_word", {
      drawerName: drawer.name,
      round: room.round,
      maxRounds: room.maxRounds
    })

    // 15 giây không chọn thì tự chọn
    room.autoChooseTimer = setTimeout(() => {
      if (room.choosingWord) {
        handleWordChosen(roomId, wordChoices[0])
      }
    }, 15000)
  }, 2000)
}

function socket_broadcast_except(roomId, exceptId, event, data) {
  const room = rooms[roomId]
  if (!room) return
  room.players.forEach(p => {
    if (p.id !== exceptId) {
      io.to(p.id).emit(event, data)
    }
  })
}

function handleWordChosen(roomId, word) {
  const room = rooms[roomId]
  if (!room) return
  if (room.chooseTimer) { clearTimeout(room.chooseTimer); room.chooseTimer = null }
  if (room.autoChooseTimer) { clearTimeout(room.autoChooseTimer); room.autoChooseTimer = null }
  room.choosingWord = false
  room.word = word
  room.roundStartTime = Date.now()

  const drawer = room.players.find(p => p.id === room.drawerId)

  // Gửi round_start cho người vẽ kèm myWord
  io.to(room.drawerId).emit("round_start", {
    drawerId: room.drawerId,
    drawerName: drawer?.name || "",
    round: room.round,
    maxRounds: room.maxRounds,
    maskedWord: getMaskedWord(word),
    wordLength: word.length,
    timeLimit: 80,
    myWord: word
  })

  // Gửi round_start cho người còn lại (không có myWord)
  socket_broadcast_except(roomId, room.drawerId, "round_start", {
    drawerId: room.drawerId,
    drawerName: drawer?.name || "",
    round: room.round,
    maxRounds: room.maxRounds,
    maskedWord: getMaskedWord(word),
    wordLength: word.length,
    timeLimit: 80
  })

  // Xóa canvas
  io.to(roomId).emit("clear_canvas")

  // Đếm ngược 80 giây
  if (room.timer) clearTimeout(room.timer)
  room.timer = setTimeout(() => {
    endRound(roomId)
  }, 80000)
}

function endRound(roomId) {
  const room = rooms[roomId]
  if (!room) return
  if (room.timer) { clearTimeout(room.timer); room.timer = null }

  io.to(roomId).emit("round_end", {
    word: room.word,
    scores: room.scores
  })

  room.round++
  if (room.round > room.maxRounds) {
    // Kết thúc game
    const sorted = room.players
      .map(p => ({ name: p.name, score: room.scores[p.id] || 0, avatar: p.avatar || "" }))
      .sort((a, b) => b.score - a.score)
    io.to(roomId).emit("game_over", { leaderboard: sorted })
    room.started = false
    room.round = 0
    room.drawerIndex = -1
  } else {
    setTimeout(() => startRound(roomId), 4000)
  }
}

io.on("connection", (socket) => {
  console.log("connected:", socket.id)

  // Tham gia phòng
  socket.on("join_room", ({ roomId, name, avatar }) => {
    socket.join(roomId)

    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        hostId: socket.id,
        word: "",
        drawerId: "",
        drawerIndex: -1,
        round: 0,
        maxRounds: 3,
        scores: {},
        guessed: [],
        started: false,
        choosingWord: false,
        wordChoices: [],
        timer: null,
        chooseTimer: null,
        autoChooseTimer: null
      }
    }

    const room = rooms[roomId]

    // Tránh trùng socket
    if (!room.players.find(p => p.id === socket.id)) {
      room.players.push({ id: socket.id, name, avatar: avatar || "" })
      room.scores[socket.id] = 0
    }

    socket.data.roomId = roomId
    socket.data.name = name

    io.to(roomId).emit("room_update", {
      players: room.players,
      scores: room.scores,
      hostId: room.hostId
    })

    // Nếu game đang chạy, gửi trạng thái hiện tại
    if (room.started && room.word) {
      socket.emit("round_start", {
        drawerId: room.drawerId,
        drawerName: room.players.find(p => p.id === room.drawerId)?.name,
        round: room.round,
        maxRounds: room.maxRounds,
        maskedWord: getMaskedWord(room.word),
        wordLength: room.word.length,
        timeLimit: 80
      })
    } else if (room.started && room.choosingWord) {
      // Đang trong giai đoạn chọn từ
      const drawer = room.players.find(p => p.id === room.drawerId)
      if (socket.id === room.drawerId) {
        socket.emit("choose_word", { words: room.wordChoices })
      } else {
        socket.emit("waiting_for_word", { drawerName: drawer?.name || "", round: room.round, maxRounds: room.maxRounds })
      }
    }

    io.to(roomId).emit("chat_message", {
      sender: "System",
      message: `${name} đã tham gia phòng`,
      type: "system"
    })
  })

  // Bắt đầu game (host)
  socket.on("start_game", ({ roomId }) => {
    const room = rooms[roomId]
    if (!room || room.players.length < 2) {
      socket.emit("error_msg", "Cần ít nhất 2 người chơi")
      return
    }
    room.started = true
    room.round = 1
    room.drawerIndex = -1
    room.scores = {}
    room.players.forEach(p => { room.scores[p.id] = 0 })
    startRound(roomId)
  })

  // Người vẽ chọn từ
  socket.on("word_chosen", ({ roomId, word }) => {
    const room = rooms[roomId]
    if (!room || room.drawerId !== socket.id || !room.choosingWord) return
    if (!room.wordChoices.includes(word)) return
    handleWordChosen(roomId, word)
  })

  // Vẽ realtime
  socket.on("draw", (data) => {
    const roomId = socket.data.roomId
    socket.to(roomId).emit("draw", data)
  })

  // Xóa canvas
  socket.on("clear_canvas", () => {
    const roomId = socket.data.roomId
    if (rooms[roomId]?.drawerId === socket.id) {
      io.to(roomId).emit("clear_canvas")
    }
  })

  // Chat / đoán chữ
  socket.on("send_message", ({ roomId, message }) => {
    const room = rooms[roomId]
    if (!room) return

    const sender = socket.data.name || "Unknown"

    // Người vẽ không được đoán
    if (socket.id === room.drawerId) {
      socket.emit("chat_message", { sender: "System", message: "Bạn đang vẽ, không thể đoán!", type: "system" })
      return
    }

    // Đã đoán đúng rồi thì không đoán nữa
    if (room.guessed.includes(socket.id)) {
      io.to(roomId).emit("chat_message", { sender, message, type: "chat" })
      return
    }

    const correct = message.trim().toLowerCase() === room.word.toLowerCase()

    if (correct && room.started) {
      room.guessed.push(socket.id)

      // Tính điểm: người đoán sớm được nhiều điểm hơn
      const elapsed = (Date.now() - room.roundStartTime) / 1000
      const points = Math.max(10, Math.round(100 - elapsed))
      room.scores[socket.id] = (room.scores[socket.id] || 0) + points

      // Người vẽ cũng được điểm
      room.scores[room.drawerId] = (room.scores[room.drawerId] || 0) + 20

      io.to(roomId).emit("correct_guess", {
        playerId: socket.id,
        playerName: sender,
        points,
        scores: room.scores
      })

      io.to(roomId).emit("chat_message", {
        sender: "System",
        message: `${sender} đã đoán đúng!`,
        type: "correct"
      })

      // Nếu tất cả đoán đúng thì kết thúc vòng sớm
      const nonDrawers = room.players.filter(p => p.id !== room.drawerId)
      if (room.guessed.length >= nonDrawers.length) {
        endRound(roomId)
      }
    } else {
      io.to(roomId).emit("chat_message", { sender, message, type: "chat" })
    }
  })

  // Ngắt kết nối
  socket.on("disconnect", () => {
    const roomId = socket.data.roomId
    if (!roomId || !rooms[roomId]) return

    const room = rooms[roomId]
    room.players = room.players.filter(p => p.id !== socket.id)
    delete room.scores[socket.id]

    // Nếu host rời thì chuyển host sang người đầu tiên còn lại
    if (room.hostId === socket.id && room.players.length > 0) {
      room.hostId = room.players[0].id
    }

    io.to(roomId).emit("room_update", { players: room.players, scores: room.scores, hostId: room.hostId })
    io.to(roomId).emit("chat_message", {
      sender: "System",
      message: `${socket.data.name} đã rời phòng`,
      type: "system"
    })

    // Nếu người vẽ rời thì kết thúc vòng
    if (room.drawerId === socket.id && room.started) {
      endRound(roomId)
    }

    if (room.players.length === 0) {
      if (room.timer) clearTimeout(room.timer)
      delete rooms[roomId]
    }
  })
})

server.listen(5000, () => console.log("Server running on port 5000"))
