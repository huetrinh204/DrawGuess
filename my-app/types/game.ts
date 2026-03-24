export interface Player {
  id: string
  name: string
  avatar: string
}

export interface ChatMessage {
  sender: string
  message: string
  type: "chat" | "system" | "correct"
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
  myWord?: string   // chỉ người vẽ nhận
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
