import { io, Socket } from "socket.io-client"

let socket: Socket | null = null
let configuredRoom: RoomSessionConfig | null = null
let joinedSocketId = ""
let joinInFlightRoomId = ""
let lifecycleBound = false

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "")
const SESSION_PREFIX = "drawguess:room-session:"

export interface RoomSessionConfig {
  roomId: string
  name: string
  avatar: string
}

export interface JoinedSession {
  roomId: string
  playerId: string
  resumeToken: string
  resumed: boolean
}

function getStoredToken(roomId: string) {
  if (typeof window === "undefined") return ""
  return window.sessionStorage.getItem(`${SESSION_PREFIX}${roomId}`) || ""
}

function storeSession(session: JoinedSession) {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(`${SESSION_PREFIX}${session.roomId}`, session.resumeToken)
}

function emitConfiguredJoin(force = false) {
  const current = getSocket()
  if (!configuredRoom || !current.connected) return
  if (joinInFlightRoomId === configuredRoom.roomId) return
  if (!force && joinedSocketId === current.id) return
  joinInFlightRoomId = configuredRoom.roomId
  joinedSocketId = current.id || ""
  current.emit("join_room", {
    ...configuredRoom,
    resumeToken: getStoredToken(configuredRoom.roomId),
  })
}

function bindLifecycle(current: Socket) {
  if (lifecycleBound) return
  lifecycleBound = true
  current.on("connect", () => {
    joinedSocketId = ""
    joinInFlightRoomId = ""
    emitConfiguredJoin()
  })
  current.on("session_joined", (session: JoinedSession) => {
    storeSession(session)
    joinedSocketId = current.id || ""
    joinInFlightRoomId = ""
  })
  current.on("disconnect", () => {
    joinedSocketId = ""
    joinInFlightRoomId = ""
  })
  current.on("error_msg", () => {
    joinInFlightRoomId = ""
  })
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      autoConnect: false,
      reconnection: true,
    })
    bindLifecycle(socket)
  }
  return socket
}

export function configureRoomSession(config: RoomSessionConfig) {
  configuredRoom = {
    roomId: config.roomId.trim().toUpperCase(),
    name: config.name.trim(),
    avatar: config.avatar,
  }
}

export function connectSocket(config?: RoomSessionConfig, forceJoin = false) {
  if (config) configureRoomSession(config)
  const current = getSocket()
  if (!current.connected) current.connect()
  else emitConfiguredJoin(forceJoin)
}

export function requestGameSnapshot() {
  const current = getSocket()
  if (current.connected) current.emit("request_snapshot")
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
  configuredRoom = null
  joinedSocketId = ""
  joinInFlightRoomId = ""
  lifecycleBound = false
}

export function leaveRoom() {
  const s = getSocket()
  if (s.connected) s.emit("leave_room")
  if (configuredRoom && typeof window !== "undefined") {
    window.sessionStorage.removeItem(`${SESSION_PREFIX}${configuredRoom.roomId}`)
  }
  configuredRoom = null
  joinedSocketId = ""
  joinInFlightRoomId = ""
}
