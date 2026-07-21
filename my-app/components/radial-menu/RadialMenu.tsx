"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import gsap from "gsap"
import MenuItem from "./MenuItem"
import type { RadialMenuItem, RadialMenuPosition, RadialMenuTarget } from "./types"
import { DEFAULT_RADIAL_ITEMS } from "./types"
import "./radial-menu.css"

interface RadialMenuProps {
  isOpen: boolean
  position: RadialMenuPosition
  target: RadialMenuTarget | null
  items?: RadialMenuItem[]
  radius?: number
  onSelect: (item: RadialMenuItem) => void
  onClose: () => void
}

export default function RadialMenu({
  isOpen,
  position,
  target,
  items = DEFAULT_RADIAL_ITEMS,
  radius = 78,
  onSelect,
  onClose,
}: RadialMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const activeIndexRef = useRef(-1)

  useEffect(() => {
    if (!isOpen) {
      mounted.current = false
      activeIndexRef.current = -1
      const resetFrame = requestAnimationFrame(() => setActiveIndex(-1))
      return () => cancelAnimationFrame(resetFrame)
    }

    const root = rootRef.current
    const ring = ringRef.current
    if (!root || !ring) return

    gsap.set(root, { left: position.x, top: position.y })
    gsap.fromTo(
      ring,
      { scale: 0.45, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.28, ease: "back.out(2)" }
    )

    mounted.current = true
  }, [isOpen, position.x, position.y])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault()
        const next = (activeIndexRef.current + 1 + items.length) % items.length
        activeIndexRef.current = next
        setActiveIndex(next)
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault()
        const next = (activeIndexRef.current - 1 + items.length) % items.length
        activeIndexRef.current = next
        setActiveIndex(next)
      }
      if ((e.key === "Enter" || e.key === " ") && activeIndexRef.current >= 0) {
        e.preventDefault()
        onSelect(items[activeIndexRef.current])
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - position.x
      const dy = e.clientY - position.y
      if (Math.hypot(dx, dy) < 38) {
        activeIndexRef.current = -1
        setActiveIndex(-1)
        return
      }
      const angleFromTop = Math.atan2(dy, dx) + Math.PI / 2
      const normalized = (angleFromTop + Math.PI * 2) % (Math.PI * 2)
      const next = Math.round((normalized / (Math.PI * 2)) * items.length) % items.length
      activeIndexRef.current = next
      setActiveIndex(next)
    }

    const onPointerUp = () => {
      if (activeIndexRef.current >= 0) onSelect(items[activeIndexRef.current])
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }
  }, [isOpen, items, onClose, onSelect, position.x, position.y])

  if (!isOpen || typeof document === "undefined") return null

  const centerLabel = target?.name ? target.name.split(" ")[0] : "Send"

  return createPortal(
    <>
      <div className="radial-menu-backdrop" onClick={onClose} onContextMenu={e => e.preventDefault()} />
      <div ref={rootRef} className="radial-menu-root" role="menu" aria-label="Interaction wheel">
        <div ref={ringRef} className="radial-menu-ring">
          <div className="radial-menu-center">{centerLabel}</div>
          {items.map((item, index) => (
            <MenuItem
              key={item.id}
              item={item}
              index={index}
              total={items.length}
              radius={radius}
              staggerDelay={0.06}
              onSelect={onSelect}
              active={activeIndex === index}
            />
          ))}
        </div>
      </div>
    </>,
    document.body
  )
}
