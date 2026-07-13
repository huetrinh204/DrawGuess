import { create } from "zustand"
import { ChatMessage, Player } from "@/types/game"

interface GameStore {
  roomId: string
  playerName: string
  players: Player[]
  scores: Record<string, number>
  hostId: string
  mySocketId: string
  drawerId: string
  drawerName: string
  round: number
  maxRounds: number
  maskedWord: string
  myWord: string
  gameStarted: boolean
  roundActive: boolean
  timeLeft: number
  messages: ChatMessage[]
  leaderboard: { name: string; score: number; avatar: string }[]
  gameOver: boolean
  // chọn từ
  choosingWord: boolean
  wordChoices: string[]
  waitingForDrawer: boolean
  waitingDrawerName: string
  // gần đúng — dùng object { key, message } để force remount toast mỗi lần mới
  closeGuessHint: { key: number; message: string }
  // hiệu ứng cộng điểm: [{ id, name, points }]
  scorePopups: { id: string; name: string; points: number }[]
  // màn hình kết thúc trước bảng xếp hạng
  showGameEndSplash: boolean

  setRoom: (roomId: string, playerName: string) => void
  setPlayers: (players: Player[], scores: Record<string, number>, hostId: string) => void
  setMySocketId: (id: string) => void
  setRoundStart: (data: { drawerId: string; drawerName: string; round: number; maxRounds: number; maskedWord: string; timeLimit: number; myWord?: string }) => void
  setMyWord: (word: string) => void
  setMaskedWord: (w: string) => void
  addMessage: (msg: ChatMessage) => void
  setTimeLeft: (t: number) => void
  setRoundEnd: (word: string, scores: Record<string, number>) => void
  setGameOver: (leaderboard: { name: string; score: number; avatar: string }[]) => void
  setGameStarted: (v: boolean) => void
  setChoosingWord: (choices: string[]) => void
  setWaitingForDrawer: (drawerName: string) => void
  setPreRound: (drawerId: string, drawerName: string, round: number, maxRounds: number) => void
  setCloseGuessHint: (msg: string) => void
  addScorePopup: (id: string, name: string, points: number) => void
  removeScorePopup: (id: string) => void
  setShowGameEndSplash: (v: boolean) => void
  resetGame: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  roomId: "",
  playerName: "",
  players: [],
  scores: {},
  hostId: "",
  mySocketId: "",
  drawerId: "",
  drawerName: "",
  round: 0,
  maxRounds: 3,
  maskedWord: "",
  myWord: "",
  gameStarted: false,
  roundActive: false,
  timeLeft: 80,
  messages: [],
  leaderboard: [],
  gameOver: false,
  choosingWord: false,
  wordChoices: [],
  waitingForDrawer: false,
  waitingDrawerName: "",
  closeGuessHint: { key: 0 as number, message: "" },
  scorePopups: [],
  showGameEndSplash: false,

  setRoom: (roomId, playerName) => set({ roomId, playerName }),
  setPlayers: (players, scores, hostId) => set({ players, scores, hostId }),
  setMySocketId: (id) => set({ mySocketId: id }),
  setRoundStart: (data) => set({
    drawerId: data.drawerId,
    drawerName: data.drawerName,
    round: data.round,
    maxRounds: data.maxRounds,
    maskedWord: data.maskedWord,
    roundActive: true,
    gameOver: false,
    timeLeft: data.timeLimit,
    myWord: data.myWord ?? "",   // giữ từ nếu có, không reset về ""
    choosingWord: false,
    wordChoices: [],
    waitingForDrawer: false,
  }),
  setMyWord: (word) => set({ myWord: word }),
  setMaskedWord: (w) => set({ maskedWord: w }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setTimeLeft: (t) => set({ timeLeft: t }),
  setRoundEnd: (word, scores) => set({ roundActive: false, maskedWord: word, scores }),
  setGameOver: (leaderboard) => set({ gameOver: true, roundActive: false, leaderboard, gameStarted: false, showGameEndSplash: true }),
  setGameStarted: (v) => set({ gameStarted: v }),
  setChoosingWord: (choices) => set({ choosingWord: true, wordChoices: choices, waitingForDrawer: false }),
  setWaitingForDrawer: (drawerName) => set({ waitingForDrawer: true, waitingDrawerName: drawerName, choosingWord: false }),
  setPreRound: (drawerId, drawerName, round, maxRounds) => set({ drawerId, drawerName, round, maxRounds, roundActive: false, choosingWord: false, wordChoices: [], waitingForDrawer: false }),
  setCloseGuessHint: (msg) => set(s => ({ closeGuessHint: { key: s.closeGuessHint.key + 1, message: msg } })),
  addScorePopup: (id, name, points) => set(s => ({ scorePopups: [...s.scorePopups, { id, name, points }] })),
  removeScorePopup: (id) => set(s => ({ scorePopups: s.scorePopups.filter(p => p.id !== id) })),
  setShowGameEndSplash: (v) => set({ showGameEndSplash: v }),
  resetGame: () => set({ gameStarted: false, roundActive: false, gameOver: false, round: 0, messages: [], leaderboard: [], myWord: "", maskedWord: "", choosingWord: false, wordChoices: [], waitingForDrawer: false, closeGuessHint: { key: 0 as number, message: "" }, scorePopups: [], showGameEndSplash: false })
}))
