const test = require("node:test")
const assert = require("node:assert/strict")
const { io: createClient } = require("socket.io-client")
const { createGameServer, PHASES } = require("../gameServer")

function waitForEvent(socket, event, timeoutMs = 1_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent)
      reject(new Error(`Timed out waiting for ${event}`))
    }, timeoutMs)
    const onEvent = payload => {
      clearTimeout(timer)
      resolve(payload)
    }
    socket.once(event, onEvent)
  })
}

function expectNoEvent(socket, event, timeoutMs = 60) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent)
      resolve()
    }, timeoutMs)
    const onEvent = () => {
      clearTimeout(timer)
      reject(new Error(`Unexpected ${event} event`))
    }
    socket.once(event, onEvent)
  })
}

function waitForMatchingEvent(socket, event, predicate, timeoutMs = 1_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent)
      reject(new Error(`Timed out waiting for matching ${event}`))
    }, timeoutMs)
    const onEvent = payload => {
      if (!predicate(payload)) return
      clearTimeout(timer)
      socket.off(event, onEvent)
      resolve(payload)
    }
    socket.on(event, onEvent)
  })
}

async function connectClient(url) {
  const socket = createClient(url, {
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
  })
  await waitForEvent(socket, "connect")
  return socket
}

async function joinRoom(socket, payload) {
  const joined = waitForEvent(socket, "session_joined")
  const snapshot = waitForEvent(socket, "game_snapshot")
  socket.emit("join_room", payload)
  return {
    session: await joined,
    snapshot: await snapshot,
  }
}

async function createFixture(t, timingOverrides = {}) {
  const server = createGameServer({
    timings: {
      preRoundMs: 5,
      chooseMs: 200,
      roundMs: 250,
      roundEndMs: 10,
      reconnectGraceMs: 80,
      ...timingOverrides,
    },
  })
  const address = await server.listen(0, "127.0.0.1")
  const url = `http://127.0.0.1:${address.port}`
  const sockets = []
  t.after(async () => {
    for (const socket of sockets) socket.disconnect()
    await server.close()
  })
  return {
    server,
    async client() {
      const socket = await connectClient(url)
      sockets.push(socket)
      return socket
    },
  }
}

const validStroke = {
  x: 100,
  y: 100,
  px: 90,
  py: 90,
  color: "#1A1A1A",
  lineWidth: 6,
}

test("server enforces host, drawer, and room membership authorization", async t => {
  const fixture = await createFixture(t)
  const host = await fixture.client()
  const guest = await fixture.client()
  const outsider = await fixture.client()
  await joinRoom(host, { roomId: "AUTH1", name: "Host", avatar: "/host.png" })
  await joinRoom(guest, { roomId: "AUTH1", name: "Guest", avatar: "/guest.png" })
  await joinRoom(outsider, { roomId: "OTHER", name: "Outsider", avatar: "/other.png" })

  const deniedStart = waitForEvent(guest, "error_msg")
  guest.emit("start_game", { roomId: "AUTH1" })
  assert.match(await deniedStart, /chủ phòng/i)
  assert.equal(fixture.server.rooms.get("AUTH1").phase, PHASES.LOBBY)

  const preRound = waitForEvent(host, "pre_round")
  host.emit("start_game", { roomId: "AUTH1" })
  const round = await preRound
  assert.equal(round.drawerName, "Host")

  const choicesPromise = waitForEvent(host, "choose_word")
  const choices = await choicesPromise
  const guestRoundStart = waitForEvent(guest, "round_start")
  host.emit("word_chosen", { roomId: "AUTH1", word: choices.words[0] })
  await guestRoundStart

  const hostDidNotReceive = expectNoEvent(host, "draw")
  guest.emit("draw", validStroke)
  await hostDidNotReceive

  const relayedStroke = waitForEvent(guest, "draw")
  host.emit("draw", validStroke)
  assert.deepEqual(await relayedStroke, validStroke)

  const crossRoomDenied = waitForEvent(outsider, "error_msg")
  outsider.emit("send_message", { roomId: "AUTH1", message: "hello" })
  assert.match(await crossRoomDenied, /không thuộc phòng/i)
})

test("answers after round end never change scores", async t => {
  const fixture = await createFixture(t, { roundMs: 45, roundEndMs: 100 })
  const host = await fixture.client()
  const guest = await fixture.client()
  const hostJoin = await joinRoom(host, { roomId: "SCORE", name: "Host", avatar: "" })
  const guestJoin = await joinRoom(guest, { roomId: "SCORE", name: "Guest", avatar: "" })
  const guestId = guestJoin.session.playerId

  const choicesPromise = waitForEvent(host, "choose_word")
  host.emit("start_game")
  const choices = await choicesPromise
  let roundEndCount = 0
  guest.on("round_end", () => { roundEndCount += 1 })
  const roundEnd = waitForEvent(guest, "round_end")
  host.emit("word_chosen", { word: choices.words[0] })
  await roundEnd

  const room = fixture.server.rooms.get("SCORE")
  assert.equal(room.phase, PHASES.ROUND_END)
  const scoreBefore = room.scores.get(guestId)
  guest.emit("send_message", { roomId: "SCORE", message: choices.words[0] })
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(room.scores.get(guestId), scoreBefore)
  assert.equal(roundEndCount, 1)
  assert.equal(hostJoin.session.playerId, room.hostId)
})

test("a multiplayer game gives each initial player exactly one turn", async t => {
  const fixture = await createFixture(t, {
    preRoundMs: 1,
    chooseMs: 8,
    roundMs: 15,
    roundEndMs: 3,
  })
  const first = await fixture.client()
  const second = await fixture.client()
  const third = await fixture.client()
  await joinRoom(first, { roomId: "TURNS", name: "One", avatar: "" })
  await joinRoom(second, { roomId: "TURNS", name: "Two", avatar: "" })
  await joinRoom(third, { roomId: "TURNS", name: "Three", avatar: "" })

  const drawers = []
  first.on("pre_round", payload => drawers.push(payload.drawerId))
  const gameOver = waitForEvent(first, "game_over", 1_000)
  first.emit("start_game")
  await gameOver

  assert.equal(drawers.length, 3)
  assert.equal(new Set(drawers).size, 3)
  assert.equal(fixture.server.rooms.get("TURNS").phase, PHASES.GAME_OVER)
})

test("resume token preserves identity and role within reconnect grace", async t => {
  const fixture = await createFixture(t, { chooseMs: 500, reconnectGraceMs: 100 })
  const host = await fixture.client()
  const guest = await fixture.client()
  const hostJoin = await joinRoom(host, { roomId: "BACK", name: "Host", avatar: "" })
  await joinRoom(guest, { roomId: "BACK", name: "Guest", avatar: "" })

  const preRound = waitForEvent(host, "pre_round")
  host.emit("start_game")
  const round = await preRound
  assert.equal(round.drawerId, hostJoin.session.playerId)
  fixture.server.rooms.get("BACK").scores.set(hostJoin.session.playerId, 42)
  const disconnectedUpdate = waitForMatchingEvent(
    guest,
    "room_update",
    payload => payload.players.some(player => player.id === hostJoin.session.playerId && player.connected === false)
  )
  host.disconnect()
  await disconnectedUpdate

  const disconnectedPlayer = fixture.server.rooms.get("BACK").players.get(hostJoin.session.playerId)
  assert.equal(disconnectedPlayer.connected, false)

  const resumedHost = await fixture.client()
  const resumed = await joinRoom(resumedHost, {
    roomId: "BACK",
    name: "Host",
    avatar: "",
    resumeToken: hostJoin.session.resumeToken,
  })
  assert.equal(resumed.session.resumed, true)
  assert.equal(resumed.session.playerId, hostJoin.session.playerId)
  assert.equal(resumed.snapshot.phase, PHASES.CHOOSING)
  assert.equal(resumed.snapshot.drawerId, hostJoin.session.playerId)
  assert.equal(resumed.snapshot.hostId, hostJoin.session.playerId)
  assert.equal(resumed.snapshot.scores[hostJoin.session.playerId], 42)
  assert.equal(resumed.snapshot.wordChoices.length, 2)

  const roomClosed = waitForEvent(guest, "room_closed")
  resumedHost.disconnect()
  await roomClosed
  assert.equal(fixture.server.rooms.has("BACK"), false)
})

test("social interactions validate catalog, target membership, self-target, and cooldown", async t => {
  const fixture = await createFixture(t)
  const sender = await fixture.client()
  const target = await fixture.client()
  const outsider = await fixture.client()
  const senderJoin = await joinRoom(sender, { roomId: "SOCIAL", name: "Sender", avatar: "" })
  const targetJoin = await joinRoom(target, { roomId: "SOCIAL", name: "Target", avatar: "" })
  await joinRoom(outsider, { roomId: "AWAY1", name: "Outsider", avatar: "" })

  for (const actionId of ["heart", "flower", "brick", "star", "fire", "clap"]) {
    fixture.server.rooms.get("SOCIAL").players.get(senderJoin.session.playerId).lastInteractionAt = 0
    const senderEffect = waitForEvent(sender, "interaction_effect")
    const targetEffect = waitForEvent(target, "interaction_effect")
    sender.emit("player_interaction", { actionId, targetId: targetJoin.session.playerId })
    const payload = await senderEffect
    assert.deepEqual(await targetEffect, payload)
    assert.equal(payload.actionId, actionId)
    assert.equal(payload.senderId, senderJoin.session.playerId)
    assert.equal(payload.targetId, targetJoin.session.playerId)
    assert.equal(typeof payload.effectId, "string")
  }

  const room = fixture.server.rooms.get("SOCIAL")
  room.players.get(senderJoin.session.playerId).lastInteractionAt = 0
  const firstEffect = waitForEvent(target, "interaction_effect")
  sender.emit("player_interaction", { actionId: "heart", targetId: targetJoin.session.playerId })
  await firstEffect
  const cooldownBlocks = expectNoEvent(target, "interaction_effect")
  sender.emit("player_interaction", { actionId: "flower", targetId: targetJoin.session.playerId })
  await cooldownBlocks

  room.players.get(senderJoin.session.playerId).lastInteractionAt = 0
  const invalidBlocked = expectNoEvent(target, "interaction_effect")
  sender.emit("player_interaction", { actionId: "not-real", targetId: targetJoin.session.playerId })
  await invalidBlocked

  const selfBlocked = expectNoEvent(target, "interaction_effect")
  sender.emit("player_interaction", { actionId: "heart", targetId: senderJoin.session.playerId })
  await selfBlocked

  const crossRoomBlocked = expectNoEvent(target, "interaction_effect")
  outsider.emit("player_interaction", { actionId: "heart", targetId: targetJoin.session.playerId })
  await crossRoomBlocked
})

test("isCloseGuess treats messages containing the keyword as close", () => {
  const { isCloseGuess } = require("../gameServer")
  assert.equal(isCloseGuess("mèo", "mèo"), false)
  assert.equal(isCloseGuess("có phải mèo không", "mèo"), true)
  assert.equal(isCloseGuess("xe hơi đúng không", "xe hơi"), true)
  assert.equal(isCloseGuess("mèoo", "mèo"), true)
  assert.equal(isCloseGuess("chó", "mèo"), false)
})
