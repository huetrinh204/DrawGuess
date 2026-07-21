"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { useLang } from "@/contexts/LanguageContext"
import type { RadialMenuItem as RadialMenuItemType } from "./types"

interface MenuItemProps {
  item: RadialMenuItemType
  index: number
  total: number
  radius: number
  onSelect: (item: RadialMenuItemType) => void
  staggerDelay: number
  active?: boolean
}

function MenuItem({ item, index, total, radius, onSelect, staggerDelay, active = false }: MenuItemProps) {
  const { t } = useLang()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const hoverTween = useRef<gsap.core.Tween | null>(null)

  const startAngle = -Math.PI / 2
  const angle = startAngle + (index / total) * Math.PI * 2
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius

  useEffect(() => {
    const el = buttonRef.current
    if (!el) return

    gsap.fromTo(
      el,
      { x: 0, y: 0, scale: 0, opacity: 0 },
      {
        x,
        y,
        scale: 1,
        opacity: 1,
        duration: 0.38,
        delay: staggerDelay + index * 0.04,
        ease: "back.out(1.7)",
      }
    )
  }, [buttonRef, index, staggerDelay, x, y])

  const handleEnter = () => {
    const el = buttonRef.current
    if (!el) return
    hoverTween.current?.kill()
    hoverTween.current = gsap.to(el, {
      scale: 1.18,
      duration: 0.18,
      ease: "power2.out",
      overwrite: true,
    })
  }

  const handleLeave = () => {
    const el = buttonRef.current
    if (!el) return
    hoverTween.current?.kill()
    hoverTween.current = gsap.to(el, {
      scale: 1,
      duration: 0.2,
      ease: "power2.out",
      overwrite: true,
    })
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`radial-menu-item ${active ? "radial-menu-item-active" : ""}`}
      aria-label={t(item.labelKey)}
      onClick={() => onSelect(item)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      <span className="radial-menu-item-emoji" aria-hidden>
        {item.emoji}
      </span>
      <span className="radial-menu-item-label">{t(item.labelKey)}</span>
    </button>
  )
}

export default MenuItem
