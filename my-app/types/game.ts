export interface Player {
  id: string
  name: string
  avatar: string
  connected?: boolean
}

export interface ChatMessage {
  sender: string
  message: string
  type: "chat" | "system" | "correct" | "wrong"
  avatar?: string
  messageKey?: string
  messageVars?: Record<string, string>
}

export interface DrawData {
  x: number
  y: number
  px: number
  py: number
  color: string
  lineWidth: number
}

export interface RoundStartPayload {
  drawerId: string
  drawerName: string
  round: number
  maxRounds: number
  maskedWord: string
  wordLength: number
  timeLimit: number
  deadline?: number
  myWord?: string   // chỉ người vẽ nhận
}

export type GamePhase = "LOBBY" | "CHOOSING" | "DRAWING" | "ROUND_END" | "GAME_OVER"

export interface GameSnapshotPayload {
  phase: GamePhase
  players: Player[]
  scores: Record<string, number>
  hostId: string
  drawerId: string
  drawerName: string
  round: number
  maxRounds: number
  maskedWord: string
  deadline: number
  timeLimit: number
  wordChoices: string[]
  myWord?: string
  leaderboard?: { name: string; score: number; avatar: string }[]
}

export interface GameState {
  roomId: string
  playerName: string
  playerId: string
  players: Player[]
  scores: Record<string, number>
  drawerId: string
  drawerName: string
  round: number
  maxRounds: number
  maskedWord: string
  word: string          // chỉ người vẽ mới biết
  gameStarted: boolean
  roundActive: boolean
  timeLeft: number
  messages: ChatMessage[]
  leaderboard: { name: string; score: number; avatar: string }[]
  gameOver: boolean
}
