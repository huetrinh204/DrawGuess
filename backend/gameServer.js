const crypto = require("crypto")
const express = require("express")
const http = require("http")
const cors = require("cors")
const { Server } = require("socket.io")

const PHASES = Object.freeze({
  LOBBY: "LOBBY",
  CHOOSING: "CHOOSING",
  DRAWING: "DRAWING",
  ROUND_END: "ROUND_END",
  GAME_OVER: "GAME_OVER",
})

const WORDS = [
  "mèo", "chó", "nhà", "xe hơi", "cây", "hoa", "mặt trời", "trăng", "sao",
  "cá", "chim", "bướm", "máy bay", "tàu thuyền", "núi", "biển", "sông",
  "bánh", "pizza", "kem", "táo", "chuối", "dưa hấu", "bóng đá", "bóng rổ",
  "đàn guitar", "piano", "trống", "điện thoại", "máy tính", "tivi", "sách",
  "bút chì", "kính", "mũ", "áo", "giày", "túi xách", "đồng hồ", "xe đạp",
]

const DEFAULT_TIMINGS = Object.freeze({
  preRoundMs: 2_000,
  chooseMs: 15_000,
  roundMs: 80_000,
  roundEndMs: 4_000,
  reconnectGraceMs: 30_000,
})

const INTERACTION_ACTIONS = new Set(["heart", "flower", "brick", "star", "fire", "clap"])
const INTERACTION_COOLDOWN_MS = 800

function normalizeRoomId(value) {
  if (typeof value !== "string") return ""
  const roomId = value.trim().toUpperCase()
  return /^[A-Z0-9]{4,12}$/.test(roomId) ? roomId : ""
}

function normalizeName(value) {
  if (typeof value !== "string") return ""
  const name = value.trim().replace(/\s+/g, " ")
  return name.length >= 1 && name.length <= 32 ? name : ""
}

function normalizeAvatar(value) {
  if (typeof value !== "string" || value.length > 512) return ""
  return value
}

function normalizeMessage(value) {
  if (typeof value !== "string") return ""
  const message = value.trim()
  return message.length >= 1 && message.length <= 300 ? message : ""
}

function isValidDrawData(data) {
  if (!data || typeof data !== "object") return false
  const finite = ["x", "y", "px", "py", "lineWidth"].every(key => Number.isFinite(data[key]))
  if (!finite) return false
  if (data.x < 0 || data.x > 700 || data.px < 0 || data.px > 700) return false
  if (data.y < 0 || data.y > 420 || data.py < 0 || data.py > 420) return false
  if (data.lineWidth < 1 || data.lineWidth > 50) return false
  return typeof data.color === "string" && /^#[0-9a-f]{6}$/i.test(data.color)
}

function pickTwoWords() {
  const firstIndex = crypto.randomInt(WORDS.length)
  let secondIndex = crypto.randomInt(WORDS.length - 1)
  if (secondIndex >= firstIndex) secondIndex += 1
  return [WORDS[firstIndex], WORDS[secondIndex]]
}

function levenshtein(a, b) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0]
    previous[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j]
      previous[j] = a[i - 1] === b[j - 1]
        ? diagonal
        : 1 + Math.min(previous[j], previous[j - 1], diagonal)
      diagonal = above
    }
  }
  return previous[b.length]
}

function isCloseGuess(guess, word) {
  const normalizedGuess = guess.toLocaleLowerCase("vi")
  const normalizedWord = word.toLocaleLowerCase("vi")
  if (normalizedGuess === normalizedWord || normalizedWord.length <= 3) return false
  return levenshtein(normalizedGuess, normalizedWord) <= (normalizedWord.length <= 5 ? 1 : 2)
}

function getMaskedWord(word) {
  return Array.from(word, character => character === " " ? " " : "_").join("")
}

function createGameServer(options = {}) {
  const timings = { ...DEFAULT_TIMINGS, ...options.timings }
  const app = express()
  app.use(cors({ origin: options.corsOrigin || "*" }))
  app.get("/health", (_request, response) => response.json({ ok: true }))

  const httpServer = http.createServer(app)
  const io = new Server(httpServer, { cors: { origin: options.corsOrigin || "*" } })
  const rooms = new Map()

  function clearTimer(room, key) {
    if (room[key]) {
      clearTimeout(room[key])
      room[key] = null
    }
  }

  function clearPhaseTimers(room) {
    clearTimer(room, "phaseTimer")
    clearTimer(room, "autoChooseTimer")
    clearTimer(room, "transitionTimer")
  }

  function publicPlayers(room) {
    return Array.from(room.players.values(), player => ({
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      connected: player.connected,
    }))
  }

  function publicScores(room) {
    return Object.fromEntries(
      Array.from(room.players.keys(), playerId => [playerId, room.scores.get(playerId) || 0])
    )
  }

  function leaderboard(room) {
    return publicPlayers(room)
      .map(player => ({
        name: player.name,
        score: room.scores.get(player.id) || 0,
        avatar: player.avatar,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
  }

  function broadcastRoomUpdate(room) {
    io.to(room.id).emit("room_update", {
      players: publicPlayers(room),
      scores: publicScores(room),
      hostId: room.hostId,
    })
  }

  function getDrawer(room) {
    return room.drawerId ? room.players.get(room.drawerId) : null
  }

  function emitToPlayer(room, playerId, event, payload) {
    const socketId = room.players.get(playerId)?.socketId
    if (socketId) io.to(socketId).emit(event, payload)
  }

  function broadcastExceptPlayer(room, playerId, event, payload) {
    for (const player of room.players.values()) {
      if (player.id !== playerId && player.socketId) {
        io.to(player.socketId).emit(event, payload)
      }
    }
  }

  function emitSnapshot(socket, room, player) {
    const drawer = getDrawer(room)
    const remainingMs = room.deadline ? Math.max(0, room.deadline - Date.now()) : 0
    const payload = {
      phase: room.phase,
      players: publicPlayers(room),
      scores: publicScores(room),
      hostId: room.hostId,
      drawerId: room.drawerId,
      drawerName: drawer?.name || "",
      round: room.round,
      maxRounds: room.maxRounds,
      maskedWord: room.word ? getMaskedWord(room.word) : "",
      deadline: room.deadline,
      timeLimit: Math.ceil(remainingMs / 1000),
      wordChoices: room.phase === PHASES.CHOOSING && player.id === room.drawerId ? room.wordChoices : [],
      myWord: room.phase === PHASES.DRAWING && player.id === room.drawerId ? room.word : undefined,
      leaderboard: room.phase === PHASES.GAME_OVER ? leaderboard(room) : undefined,
    }
    socket.emit("game_snapshot", payload)
  }

  function closeRoom(roomId, reason) {
    const room = rooms.get(roomId)
    if (!room) return
    clearPhaseTimers(room)
    for (const player of room.players.values()) {
      if (player.disconnectTimer) clearTimeout(player.disconnectTimer)
    }
    io.to(roomId).emit("room_closed", { reason })
    rooms.delete(roomId)
  }

  function createRoom(roomId) {
    const room = {
      id: roomId,
      players: new Map(),
      hostId: "",
      phase: PHASES.LOBBY,
      word: "",
      wordChoices: [],
      drawerId: "",
      round: 0,
      maxRounds: 0,
      turnQueue: [],
      scores: new Map(),
      guessed: new Set(),
      deadline: 0,
      roundStartTime: 0,
      phaseTimer: null,
      autoChooseTimer: null,
      transitionTimer: null,
    }
    rooms.set(roomId, room)
    return room
  }

  function finishGame(room) {
    clearPhaseTimers(room)
    room.phase = PHASES.GAME_OVER
    room.deadline = 0
    room.drawerId = ""
    room.wordChoices = []
    io.to(room.id).emit("game_over", { leaderboard: leaderboard(room) })
  }

  function scheduleNextRound(room) {
    if (room.turnQueue.some(playerId => room.players.has(playerId))) {
      room.transitionTimer = setTimeout(() => startRound(room.id), timings.roundEndMs)
    } else {
      finishGame(room)
    }
  }

  function endRound(roomId) {
    const room = rooms.get(roomId)
    if (!room || room.phase !== PHASES.DRAWING) return false
    clearTimer(room, "phaseTimer")
    room.phase = PHASES.ROUND_END
    room.deadline = 0
    io.to(room.id).emit("round_end", {
      word: room.word,
      scores: publicScores(room),
    })
    scheduleNextRound(room)
    return true
  }

  function abortChoosingRound(room) {
    if (room.phase !== PHASES.CHOOSING) return
    clearTimer(room, "phaseTimer")
    clearTimer(room, "autoChooseTimer")
    room.phase = PHASES.ROUND_END
    room.deadline = 0
    io.to(room.id).emit("round_end", { word: "", scores: publicScores(room) })
    scheduleNextRound(room)
  }

  function handleWordChosen(roomId, playerId, word) {
    const room = rooms.get(roomId)
    if (
      !room ||
      room.phase !== PHASES.CHOOSING ||
      room.drawerId !== playerId ||
      !room.wordChoices.includes(word)
    ) return false

    clearTimer(room, "phaseTimer")
    clearTimer(room, "autoChooseTimer")
    room.phase = PHASES.DRAWING
    room.word = word
    room.wordChoices = []
    room.roundStartTime = Date.now()
    room.deadline = room.roundStartTime + timings.roundMs
    const drawer = getDrawer(room)
    const commonPayload = {
      drawerId: room.drawerId,
      drawerName: drawer?.name || "",
      round: room.round,
      maxRounds: room.maxRounds,
      maskedWord: getMaskedWord(word),
      wordLength: Array.from(word).length,
      timeLimit: Math.ceil(timings.roundMs / 1000),
      deadline: room.deadline,
    }
    emitToPlayer(room, room.drawerId, "round_start", { ...commonPayload, myWord: word })
    broadcastExceptPlayer(room, room.drawerId, "round_start", commonPayload)
    io.to(room.id).emit("clear_canvas")
    room.phaseTimer = setTimeout(() => endRound(room.id), timings.roundMs)
    return true
  }

  function startRound(roomId) {
    const room = rooms.get(roomId)
    if (!room || ![PHASES.ROUND_END, PHASES.LOBBY, PHASES.GAME_OVER].includes(room.phase)) return
    clearPhaseTimers(room)

    let drawerId = ""
    while (room.turnQueue.length && !drawerId) {
      const candidateId = room.turnQueue.shift()
      if (room.players.has(candidateId)) drawerId = candidateId
    }
    if (!drawerId) {
      finishGame(room)
      return
    }

    room.round += 1
    room.drawerId = drawerId
    room.word = ""
    room.guessed = new Set()
    room.phase = PHASES.CHOOSING
    room.wordChoices = pickTwoWords()
    room.deadline = Date.now() + timings.preRoundMs + timings.chooseMs
    const drawer = getDrawer(room)

    io.to(room.id).emit("pre_round", {
      drawerId,
      drawerName: drawer?.name || "",
      round: room.round,
      maxRounds: room.maxRounds,
    })

    room.phaseTimer = setTimeout(() => {
      const currentRoom = rooms.get(room.id)
      if (!currentRoom || currentRoom.phase !== PHASES.CHOOSING || currentRoom.drawerId !== drawerId) return
      emitToPlayer(currentRoom, drawerId, "choose_word", { words: currentRoom.wordChoices, deadline: currentRoom.deadline })
      broadcastExceptPlayer(currentRoom, drawerId, "waiting_for_word", {
        drawerName: drawer?.name || "",
        round: currentRoom.round,
        maxRounds: currentRoom.maxRounds,
        deadline: currentRoom.deadline,
      })
      currentRoom.autoChooseTimer = setTimeout(() => {
        const latestRoom = rooms.get(room.id)
        if (latestRoom?.phase === PHASES.CHOOSING) {
          handleWordChosen(latestRoom.id, latestRoom.drawerId, latestRoom.wordChoices[0])
        }
      }, timings.chooseMs)
    }, timings.preRoundMs)
  }

  function removePlayer(room, playerId, reason) {
    const player = room.players.get(playerId)
    if (!player) return
    if (player.disconnectTimer) clearTimeout(player.disconnectTimer)

    const wasDrawer = room.drawerId === playerId
    const wasQueued = room.turnQueue.includes(playerId)
    room.players.delete(playerId)
    room.scores.delete(playerId)
    room.guessed.delete(playerId)
    room.turnQueue = room.turnQueue.filter(id => id !== playerId)
    if (wasQueued) room.maxRounds = Math.max(room.round, room.maxRounds - 1)

    if (room.hostId === playerId) {
      room.hostId = room.players.values().next().value?.id || ""
    }

    if (room.players.size < 2) {
      closeRoom(room.id, reason)
      return
    }

    broadcastRoomUpdate(room)
    io.to(room.id).emit("chat_message", {
      sender: "System",
      message: `${player.name} đã rời phòng`,
      type: "system",
    })

    if (wasDrawer && room.phase === PHASES.DRAWING) {
      endRound(room.id)
    } else if (wasDrawer && room.phase === PHASES.CHOOSING) {
      abortChoosingRound(room)
    } else if (room.phase === PHASES.DRAWING) {
      const remainingGuessers = Array.from(room.players.keys()).filter(id => id !== room.drawerId)
      if (remainingGuessers.length > 0 && remainingGuessers.every(id => room.guessed.has(id))) {
        endRound(room.id)
      }
    }
  }

  function leaveCurrentRoom(socket, immediate, reason = "player_left") {
    const { roomId, playerId } = socket.data
    if (!roomId || !playerId) return
    const room = rooms.get(roomId)
    socket.leave(roomId)
    socket.data.roomId = null
    socket.data.playerId = null
    if (!room) return

    const player = room.players.get(playerId)
    if (!player || player.socketId !== socket.id) return
    player.connected = false
    player.socketId = null

    if (immediate) {
      removePlayer(room, playerId, reason)
      return
    }

    broadcastRoomUpdate(room)
    player.disconnectTimer = setTimeout(() => {
      const latestRoom = rooms.get(roomId)
      const latestPlayer = latestRoom?.players.get(playerId)
      if (latestRoom && latestPlayer && !latestPlayer.connected) {
        removePlayer(latestRoom, playerId, "reconnect_timeout")
      }
    }, timings.reconnectGraceMs)
  }

  function resolveMembership(socket) {
    const room = rooms.get(socket.data.roomId)
    const player = room?.players.get(socket.data.playerId)
    if (!room || !player || player.socketId !== socket.id || !player.connected) return null
    return { room, player }
  }

  io.on("connection", socket => {
    socket.on("join_room", (rawPayload = {}) => {
      const roomId = normalizeRoomId(rawPayload.roomId)
      const name = normalizeName(rawPayload.name)
      const avatar = normalizeAvatar(rawPayload.avatar)
      const resumeToken = typeof rawPayload.resumeToken === "string" ? rawPayload.resumeToken : ""
      if (!roomId || !name) {
        socket.emit("error_msg", "Mã phòng hoặc tên người chơi không hợp lệ")
        return
      }

      let room = rooms.get(roomId)
      let player = room
        ? Array.from(room.players.values()).find(candidate => resumeToken && candidate.resumeToken === resumeToken)
        : null

      if (!room) room = createRoom(roomId)
      if (!player && ![PHASES.LOBBY, PHASES.GAME_OVER].includes(room.phase)) {
        socket.emit("error_msg", "Game đang diễn ra, không thể thêm người chơi mới")
        return
      }
      if (!player && Array.from(room.players.values()).some(candidate => candidate.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"))) {
        socket.emit("error_msg", "Tên này đã được sử dụng trong phòng")
        return
      }

      if (socket.data.roomId && (socket.data.roomId !== roomId || socket.data.playerId !== player?.id)) {
        leaveCurrentRoom(socket, true)
      }

      const resumed = Boolean(player)
      if (!player) {
        player = {
          id: crypto.randomUUID(),
          resumeToken: crypto.randomBytes(32).toString("base64url"),
          name,
          avatar,
          socketId: null,
          connected: false,
          disconnectTimer: null,
          lastInteractionAt: 0,
        }
        room.players.set(player.id, player)
        room.scores.set(player.id, 0)
        if (!room.hostId) room.hostId = player.id
      } else {
        if (player.disconnectTimer) {
          clearTimeout(player.disconnectTimer)
          player.disconnectTimer = null
        }
        if (player.socketId && player.socketId !== socket.id) {
          const previousSocket = io.sockets.sockets.get(player.socketId)
          if (previousSocket) {
            previousSocket.leave(roomId)
            previousSocket.data.roomId = null
            previousSocket.data.playerId = null
          }
        }
        player.name = name
        player.avatar = avatar || player.avatar
      }

      player.socketId = socket.id
      player.connected = true
      socket.data.roomId = roomId
      socket.data.playerId = player.id
      socket.join(roomId)

      socket.emit("session_joined", {
        roomId,
        playerId: player.id,
        resumeToken: player.resumeToken,
        resumed,
      })
      broadcastRoomUpdate(room)
      emitSnapshot(socket, room, player)
      if (!resumed) {
        io.to(roomId).emit("chat_message", {
          sender: "System",
          message: `${player.name} đã tham gia phòng`,
          type: "system",
        })
      }
    })

    socket.on("start_game", () => {
      const membership = resolveMembership(socket)
      if (!membership) return
      const { room, player } = membership
      if (room.hostId !== player.id) {
        socket.emit("error_msg", "Chỉ chủ phòng mới có thể bắt đầu game")
        return
      }
      if (![PHASES.LOBBY, PHASES.GAME_OVER].includes(room.phase)) {
        socket.emit("error_msg", "Game đã bắt đầu")
        return
      }
      const connectedPlayers = Array.from(room.players.values()).filter(candidate => candidate.connected)
      if (connectedPlayers.length < 2) {
        socket.emit("error_msg", "Cần ít nhất 2 người chơi")
        return
      }

      clearPhaseTimers(room)
      room.scores = new Map(connectedPlayers.map(candidate => [candidate.id, 0]))
      room.turnQueue = connectedPlayers.map(candidate => candidate.id)
      room.maxRounds = room.turnQueue.length
      room.round = 0
      room.drawerId = ""
      room.word = ""
      room.guessed = new Set()
      broadcastRoomUpdate(room)
      startRound(room.id)
    })

    socket.on("word_chosen", ({ word } = {}) => {
      const membership = resolveMembership(socket)
      if (membership) handleWordChosen(membership.room.id, membership.player.id, word)
    })

    socket.on("request_snapshot", () => {
      const membership = resolveMembership(socket)
      if (membership) emitSnapshot(socket, membership.room, membership.player)
    })

    socket.on("player_interaction", (payload = {}) => {
      const membership = resolveMembership(socket)
      if (!membership) return
      const { room, player } = membership
      const actionId = typeof payload.actionId === "string" ? payload.actionId : ""
      const targetId = typeof payload.targetId === "string" ? payload.targetId : ""
      const target = room.players.get(targetId)
      if (!INTERACTION_ACTIONS.has(actionId) || !target || !target.connected || target.id === player.id) return

      const now = Date.now()
      if (now - player.lastInteractionAt < INTERACTION_COOLDOWN_MS) return
      player.lastInteractionAt = now

      io.to(room.id).emit("interaction_effect", {
        effectId: crypto.randomUUID(),
        actionId,
        senderId: player.id,
        targetId: target.id,
        createdAt: now,
      })
    })

    socket.on("draw", data => {
      const membership = resolveMembership(socket)
      if (!membership) return
      const { room, player } = membership
      if (room.phase !== PHASES.DRAWING || room.drawerId !== player.id || !isValidDrawData(data)) return
      socket.to(room.id).emit("draw", data)
    })

    socket.on("clear_canvas", () => {
      const membership = resolveMembership(socket)
      if (!membership) return
      const { room, player } = membership
      if (room.phase === PHASES.DRAWING && room.drawerId === player.id) {
        io.to(room.id).emit("clear_canvas")
      }
    })

    socket.on("send_message", (payload = {}) => {
      const membership = resolveMembership(socket)
      if (!membership) return
      const { room, player } = membership
      if (payload.roomId && normalizeRoomId(payload.roomId) !== room.id) {
        socket.emit("error_msg", "Bạn không thuộc phòng này")
        return
      }
      const message = normalizeMessage(payload.message)
      if (!message) {
        socket.emit("error_msg", "Tin nhắn không hợp lệ hoặc quá dài")
        return
      }
      if (room.phase !== PHASES.DRAWING) {
        io.to(room.id).emit("chat_message", { sender: player.name, message, type: "chat", avatar: player.avatar })
        return
      }
      if (player.id === room.drawerId) {
        socket.emit("chat_message", { sender: "System", message: "Bạn đang vẽ, không thể đoán!", type: "system" })
        return
      }

      const correct = message.toLocaleLowerCase("vi") === room.word.toLocaleLowerCase("vi")
      if (room.guessed.has(player.id)) {
        if (correct) {
          socket.emit("chat_message", { sender: "System", message: "Bạn đã đoán đúng từ này rồi!", type: "system" })
        } else {
          io.to(room.id).emit("chat_message", { sender: player.name, message, type: "chat", avatar: player.avatar })
        }
        return
      }

      if (correct) {
        room.guessed.add(player.id)
        const elapsed = Math.max(0, (Date.now() - room.roundStartTime) / 1000)
        const points = Math.max(10, Math.min(100, Math.round(100 - elapsed)))
        const drawerPoints = 20
        room.scores.set(player.id, (room.scores.get(player.id) || 0) + points)
        room.scores.set(room.drawerId, (room.scores.get(room.drawerId) || 0) + drawerPoints)
        const drawer = getDrawer(room)
        const scores = publicScores(room)

        io.to(room.id).emit("correct_guess", {
          playerId: player.id,
          playerName: player.name,
          points,
          drawerId: room.drawerId,
          drawerName: drawer?.name || "",
          drawerPoints,
          scores,
        })
        io.to(room.id).emit("chat_message", {
          sender: "System",
          message: `${player.name} đã đoán đúng!`,
          type: "correct",
        })

        const guessers = Array.from(room.players.keys()).filter(id => id !== room.drawerId)
        if (guessers.length > 0 && guessers.every(id => room.guessed.has(id))) endRound(room.id)
        return
      }

      if (isCloseGuess(message, room.word)) {
        socket.emit("close_guess", { message: "Gần đúng rồi! Cố thêm chút nữa 🔥" })
      }
      io.to(room.id).emit("chat_message", { sender: player.name, message, type: "chat", avatar: player.avatar })
    })

    socket.on("leave_room", () => leaveCurrentRoom(socket, true))
    socket.on("disconnect", () => leaveCurrentRoom(socket, false))
  })

  return {
    app,
    httpServer,
    io,
    rooms,
    phases: PHASES,
    timings,
    listen(port = options.port ?? 5000, host = options.host) {
      return new Promise(resolve => {
        httpServer.listen(port, host, () => resolve(httpServer.address()))
      })
    },
    async close() {
      for (const room of rooms.values()) {
        clearPhaseTimers(room)
        for (const player of room.players.values()) {
          if (player.disconnectTimer) clearTimeout(player.disconnectTimer)
        }
      }
      rooms.clear()
      if (!httpServer.listening) return
      await new Promise(resolve => io.close(resolve))
    },
  }
}

module.exports = {
  createGameServer,
  PHASES,
}
