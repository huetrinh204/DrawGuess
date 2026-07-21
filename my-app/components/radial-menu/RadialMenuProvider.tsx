"use client"

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react"
import RadialMenu from "./RadialMenu"
import InteractionEffectRenderer from "./EffectLayer"
import { useRadialMenu } from "./useRadialMenu"
import type { ActiveEffect, RadialMenuItem, RadialMenuPosition } from "./types"

interface RadialMenuContextValue {
  openAt: (clientX: number, clientY: number, target: { id: string; name: string }) => void
  close: () => void
  registerAnchor: (playerId: string, element: HTMLElement | null) => void
  enqueueEffect: (effect: ActiveEffect) => void
}

const RadialMenuContext = createContext<RadialMenuContextValue | null>(null)

export function useRadialMenuContext() {
  const ctx = useContext(RadialMenuContext)
  if (!ctx) throw new Error("useRadialMenuContext must be used within RadialMenuProvider")
  return ctx
}

interface RadialMenuProviderProps {
  children: ReactNode
  onInteraction?: (payload: { item: RadialMenuItem; targetId: string; targetName: string }) => void
}

export function RadialMenuProvider({ children, onInteraction }: RadialMenuProviderProps) {
  const menu = useRadialMenu()
  const anchorsRef = useRef(new Map<string, HTMLElement>())
  const lastPositionsRef = useRef(new Map<string, RadialMenuPosition>())

  const openAt = useCallback(
    (clientX: number, clientY: number, target: { id: string; name: string }) => {
      const margin = 118
      const x = Math.min(window.innerWidth - margin, Math.max(margin, clientX))
      const y = Math.min(window.innerHeight - margin, Math.max(margin, clientY))
      menu.open({ x, y }, target)
    },
    [menu]
  )

  const registerAnchor = useCallback((playerId: string, element: HTMLElement | null) => {
    if (element) anchorsRef.current.set(playerId, element)
    else anchorsRef.current.delete(playerId)
  }, [])

  const resolveAnchor = useCallback((playerId: string, fallbackSide: "left" | "right") => {
    const element = anchorsRef.current.get(playerId)
    if (element?.isConnected) {
      const rect = element.getBoundingClientRect()
      const position = {
        x: Math.min(window.innerWidth - 16, Math.max(16, rect.left + rect.width / 2)),
        y: Math.min(window.innerHeight - 16, Math.max(16, rect.top + rect.height / 2)),
      }
      lastPositionsRef.current.set(playerId, position)
      return position
    }
    return lastPositionsRef.current.get(playerId) ?? {
      x: fallbackSide === "left" ? 24 : window.innerWidth - 24,
      y: window.innerHeight / 2,
    }
  }, [])

  const getAnchorElement = useCallback((playerId: string) => {
    return anchorsRef.current.get(playerId) ?? null
  }, [])

  const handleSelect = useCallback(
    (item: RadialMenuItem) => {
      const result = menu.selectItem(item)
      if (result.target && onInteraction) {
        onInteraction({
          item,
          targetId: result.target.id,
          targetName: result.target.name,
        })
      }
    },
    [menu, onInteraction]
  )

  const contextValue = useMemo(
    () => ({
      openAt,
      close: menu.close,
      registerAnchor,
      enqueueEffect: menu.enqueueEffect,
    }),
    [openAt, menu.close, registerAnchor, menu.enqueueEffect]
  )

  return (
    <RadialMenuContext.Provider value={contextValue}>
      {children}
      <RadialMenu
        isOpen={menu.isOpen}
        position={menu.position}
        target={menu.target}
        onSelect={handleSelect}
        onClose={menu.close}
      />
      <InteractionEffectRenderer
        effects={menu.effects}
        resolveAnchor={resolveAnchor}
        getAnchorElement={getAnchorElement}
        onEffectComplete={menu.removeEffect}
      />
    </RadialMenuContext.Provider>
  )
}
