export type EffectType = "hearts" | "petals" | "brick" | "stars" | "fire" | "confetti"
export type InteractionActionId = "heart" | "flower" | "brick" | "star" | "fire" | "clap"
export type TargetReaction = "bounce" | "spin" | "shake" | "glow" | "pulse"

export interface RadialMenuItem {
  id: InteractionActionId
  labelKey: string
  emoji: string
  effect: EffectType
  projectile: boolean
  duration: number
  trail: string[]
  impact: string[]
  reaction: TargetReaction
  soundFrequency: number
}

export interface RadialMenuPosition {
  x: number
  y: number
}

export interface EffectOrigin {
  x: number
  y: number
}

export interface ActiveEffect {
  effectId: string
  actionId: InteractionActionId
  senderId: string
  targetId: string
  createdAt: number
}

export type InteractionEffectPayload = ActiveEffect

export interface RadialMenuTarget {
  id: string
  name: string
}

export interface RadialMenuState {
  isOpen: boolean
  position: RadialMenuPosition
  target: RadialMenuTarget | null
}

export const DEFAULT_RADIAL_ITEMS: RadialMenuItem[] = [
  {
    id: "heart", labelKey: "app.interaction.heart", emoji: "❤️", effect: "hearts",
    projectile: true, duration: 0.75, trail: ["💕", "💗"], impact: ["❤️", "💖", "✨"],
    reaction: "bounce", soundFrequency: 660,
  },
  {
    id: "flower", labelKey: "app.interaction.flower", emoji: "🌸", effect: "petals",
    projectile: true, duration: 0.9, trail: ["🌸", "·"], impact: ["🌸", "🌺", "🌼"],
    reaction: "spin", soundFrequency: 540,
  },
  {
    id: "brick", labelKey: "app.interaction.brick", emoji: "🧱", effect: "brick",
    projectile: true, duration: 0.62, trail: ["▪", "·"], impact: ["💥", "🧱", "⭐"],
    reaction: "shake", soundFrequency: 150,
  },
  {
    id: "star", labelKey: "app.interaction.star", emoji: "⭐", effect: "stars",
    projectile: true, duration: 0.78, trail: ["✨", "·"], impact: ["⭐", "✨", "🌟"],
    reaction: "glow", soundFrequency: 760,
  },
  {
    id: "fire", labelKey: "app.interaction.fire", emoji: "🔥", effect: "fire",
    projectile: true, duration: 0.68, trail: ["🔥", "💨"], impact: ["🔥", "💥", "✨"],
    reaction: "pulse", soundFrequency: 240,
  },
  {
    id: "clap", labelKey: "app.interaction.clap", emoji: "👏", effect: "confetti",
    projectile: false, duration: 0.35, trail: [], impact: ["👏", "🎉", "✨", "💜"],
    reaction: "bounce", soundFrequency: 480,
  },
]

export const INTERACTION_CATALOG = Object.fromEntries(
  DEFAULT_RADIAL_ITEMS.map(item => [item.id, item])
) as Record<InteractionActionId, RadialMenuItem>
