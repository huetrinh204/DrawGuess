"use client"

import { useCallback, useEffect, useRef, type ReactNode } from "react"
import { useRadialMenuContext } from "./RadialMenuProvider"

const LONG_PRESS_MS = 480
const MOVE_TOLERANCE_PX = 10

interface InteractiveAvatarProps {
  targetId: string
  targetName: string
  children: ReactNode
  className?: string
  disabled?: boolean
}

export default function InteractiveAvatar({
  targetId,
  targetName,
  children,
  className = "",
  disabled = false,
}: InteractiveAvatarProps) {
  const { openAt, registerAnchor } = useRadialMenuContext()
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPos = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const clearPress = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }, [])

  useEffect(() => {
    registerAnchor(targetId, containerRef.current)
    return () => registerAnchor(targetId, null)
  }, [registerAnchor, targetId])

  const openMenu = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return
      openAt(clientX, clientY, { id: targetId, name: targetName })
    },
    [disabled, openAt, targetId, targetName]
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()
      clearPress()
      openMenu(e.clientX, e.clientY)
    },
    [clearPress, disabled, openMenu]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || e.button !== 0) return
      startPos.current = { x: e.clientX, y: e.clientY }
      clearPress()
      pressTimer.current = setTimeout(() => {
        navigator.vibrate?.(18)
        openMenu(e.clientX, e.clientY)
      }, LONG_PRESS_MS)
    },
    [clearPress, disabled, openMenu]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pressTimer.current) return
      const dx = e.clientX - startPos.current.x
      const dy = e.clientY - startPos.current.y
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) clearPress()
    },
    [clearPress]
  )

  const handlePointerUp = useCallback(() => clearPress(), [clearPress])
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled || !["Enter", " ", "e", "E"].includes(e.key)) return
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) openMenu(rect.left + rect.width / 2, rect.top + rect.height / 2)
  }, [disabled, openMenu])

  return (
    <div
      ref={containerRef}
      className={`select-none touch-none ${className}`}
      role={disabled ? undefined : "button"}
      tabIndex={disabled ? -1 : 0}
      aria-label={disabled ? undefined : `Interact with ${targetName}`}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {children}
    </div>
  )
}
