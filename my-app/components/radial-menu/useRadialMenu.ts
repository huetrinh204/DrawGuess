"use client"

import { useCallback, useState } from "react"
import type { ActiveEffect, RadialMenuItem, RadialMenuPosition, RadialMenuTarget } from "./types"

export function useRadialMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<RadialMenuPosition>({ x: 0, y: 0 })
  const [target, setTarget] = useState<RadialMenuTarget | null>(null)
  const [effects, setEffects] = useState<ActiveEffect[]>([])

  const open = useCallback((pos: RadialMenuPosition, nextTarget: RadialMenuTarget) => {
    setPosition(pos)
    setTarget(nextTarget)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setTarget(null)
  }, [])

  const enqueueEffect = useCallback((effect: ActiveEffect) => {
    setEffects(prev => prev.some(item => item.effectId === effect.effectId) ? prev : [...prev, effect])
  }, [])

  const removeEffect = useCallback((id: string) => {
    setEffects(prev => prev.filter(effect => effect.effectId !== id))
  }, [])

  const selectItem = useCallback(
    (item: RadialMenuItem) => {
      close()
      return { item, target }
    },
    [close, target]
  )

  return {
    isOpen,
    position,
    target,
    effects,
    open,
    close,
    selectItem,
    enqueueEffect,
    removeEffect,
  }
}

export type RadialMenuController = ReturnType<typeof useRadialMenu>
