"use client"

import { useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import gsap from "gsap"
import type { ActiveEffect, RadialMenuPosition, RadialMenuItem } from "./types"
import { INTERACTION_CATALOG } from "./types"
import "./radial-menu.css"

interface EffectLayerProps {
  effects: ActiveEffect[]
  resolveAnchor: (playerId: string, fallbackSide: "left" | "right") => RadialMenuPosition
  getAnchorElement: (playerId: string) => HTMLElement | null
  onEffectComplete: (id: string) => void
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  bornAt: number
  lifeMs: number
  size: number
  rotation: number
  spin: number
  emoji: string
  gravity: number
}

interface Projectile {
  x: number
  y: number
  rotation: number
  emoji: string
  size: number
}

function pointOnCurve(
  start: RadialMenuPosition,
  control: RadialMenuPosition,
  target: RadialMenuPosition,
  progress: number
) {
  const inverse = 1 - progress
  return {
    x: inverse * inverse * start.x + 2 * inverse * progress * control.x + progress * progress * target.x,
    y: inverse * inverse * start.y + 2 * inverse * progress * control.y + progress * progress * target.y,
  }
}

export default function InteractionEffectRenderer({
  effects,
  resolveAnchor,
  getAnchorElement,
  onEffectComplete,
}: EffectLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const projectilesRef = useRef(new Map<string, Projectile>())
  const tweensRef = useRef(new Map<string, gsap.core.Tween>())
  const completionTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const startedRef = useRef(new Set<string>())
  const rafRef = useRef(0)
  const ensureLoopRef = useRef<() => void>(() => {})
  const audioContextRef = useRef<AudioContext | null>(null)

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(window.innerWidth * dpr)
    canvas.height = Math.round(window.innerHeight * dpr)
    canvas.style.width = `${window.innerWidth}px`
    canvas.style.height = `${window.innerHeight}px`
    canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0)
  }, [])

  const spawnParticles = useCallback((
    position: RadialMenuPosition,
    emojis: string[],
    count: number,
    power: number,
    trail = false
  ) => {
    const now = performance.now()
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2
      const speed = power * (0.45 + Math.random() * 0.75)
      particlesRef.current.push({
        x: position.x + (Math.random() - 0.5) * 8,
        y: position.y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (trail ? 5 : 25),
        bornAt: now,
        lifeMs: trail ? 350 + Math.random() * 220 : 650 + Math.random() * 450,
        size: trail ? 8 + Math.random() * 7 : 15 + Math.random() * 13,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 5,
        emoji: emojis[Math.floor(Math.random() * emojis.length)] || "✨",
        gravity: trail ? 20 : 65,
      })
    }
    ensureLoopRef.current()
  }, [])

  const playSound = useCallback((frequency: number) => {
    try {
      const AudioContextClass = window.AudioContext
      audioContextRef.current ??= new AudioContextClass()
      const context = audioContextRef.current
      if (context.state === "suspended") void context.resume()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(frequency, context.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(80, frequency * 0.72), context.currentTime + 0.12)
      gain.gain.setValueAtTime(0.045, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.17)
    } catch {
      // Browsers may block sound until the local user has interacted with the page.
    }
  }, [])

  const animateTarget = useCallback((element: HTMLElement | null, config: RadialMenuItem, reducedMotion: boolean) => {
    if (!element || reducedMotion) return
    gsap.killTweensOf(element)
    const common = { duration: 0.12, ease: "power2.out" }
    if (config.reaction === "shake") {
      gsap.timeline().to(element, { x: -8, rotation: -7, ...common }).to(element, { x: 8, rotation: 7, repeat: 2, yoyo: true, ...common }).to(element, { x: 0, rotation: 0, duration: 0.16 })
    } else if (config.reaction === "spin") {
      gsap.fromTo(element, { rotation: -8, scale: 1 }, { rotation: 352, scale: 1.16, duration: 0.55, ease: "back.out(1.5)", clearProps: "transform" })
    } else if (config.reaction === "glow") {
      gsap.fromTo(element, { scale: 1, filter: "drop-shadow(0 0 0 rgba(250,204,21,0))" }, { scale: 1.22, filter: "drop-shadow(0 0 12px rgba(250,204,21,0.95))", duration: 0.24, repeat: 1, yoyo: true, clearProps: "transform,filter" })
    } else if (config.reaction === "pulse") {
      gsap.fromTo(element, { scale: 1 }, { scale: 1.2, duration: 0.16, repeat: 3, yoyo: true, ease: "sine.inOut", clearProps: "transform" })
    } else {
      gsap.timeline().to(element, { y: -10, scale: 1.18, duration: 0.2, ease: "back.out(2)" }).to(element, { y: 0, scale: 1, duration: 0.26, ease: "bounce.out", clearProps: "transform" })
    }
  }, [])

  const completeLater = useCallback((effectId: string, delayMs: number) => {
    const timer = setTimeout(() => {
      completionTimersRef.current.delete(effectId)
      startedRef.current.delete(effectId)
      onEffectComplete(effectId)
    }, delayMs)
    completionTimersRef.current.set(effectId, timer)
  }, [onEffectComplete])

  const startEffect = useCallback((effect: ActiveEffect) => {
    const config = INTERACTION_CATALOG[effect.actionId]
    if (!config) {
      onEffectComplete(effect.effectId)
      return
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const start = resolveAnchor(effect.senderId, "left")
    const target = resolveAnchor(effect.targetId, "right")
    const particleScale = reducedMotion ? 0.3 : 1
    spawnParticles(start, [config.emoji, "✨"], Math.max(2, Math.round(6 * particleScale)), 55)

    const impact = () => {
      spawnParticles(target, config.impact, Math.max(4, Math.round(18 * particleScale)), config.id === "brick" ? 145 : 95)
      animateTarget(getAnchorElement(effect.targetId), config, reducedMotion)
      playSound(config.soundFrequency)
      completeLater(effect.effectId, reducedMotion ? 260 : 1_050)
    }

    if (!config.projectile) {
      impact()
      return
    }

    const projectile: Projectile = {
      ...start,
      rotation: 0,
      emoji: config.emoji,
      size: config.id === "brick" ? 34 : 30,
    }
    projectilesRef.current.set(effect.effectId, projectile)
    const state = { progress: 0 }
    const dx = target.x - start.x
    const dy = target.y - start.y
    const distance = Math.max(1, Math.hypot(dx, dy))
    const curve = config.id === "brick" ? 38 : -Math.min(115, 55 + distance * 0.12)
    const control = {
      x: (start.x + target.x) / 2 - (dy / distance) * curve,
      y: (start.y + target.y) / 2 + (dx / distance) * curve,
    }
    let previousTrailProgress = 0

    const tween = gsap.to(state, {
      progress: 1,
      duration: reducedMotion ? 0.18 : config.duration,
      ease: config.id === "brick" ? "power2.in" : "power1.inOut",
      onUpdate: () => {
        const point = pointOnCurve(start, control, target, state.progress)
        projectile.x = point.x
        projectile.y = point.y
        projectile.rotation += config.id === "brick" ? 0.2 : 0.09
        if (config.trail.length > 0 && state.progress - previousTrailProgress >= 0.055) {
          previousTrailProgress = state.progress
          spawnParticles(point, config.trail, reducedMotion ? 1 : 2, 18, true)
        }
        ensureLoopRef.current()
      },
      onComplete: () => {
        projectilesRef.current.delete(effect.effectId)
        tweensRef.current.delete(effect.effectId)
        impact()
      },
    })
    tweensRef.current.set(effect.effectId, tween)
    ensureLoopRef.current()
  }, [animateTarget, completeLater, getAnchorElement, onEffectComplete, playSound, resolveAnchor, spawnParticles])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [resizeCanvas])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return

    const tick = (now: number) => {
      rafRef.current = 0
      context.clearRect(0, 0, window.innerWidth, window.innerHeight)
      particlesRef.current = particlesRef.current.filter(particle => {
        const age = now - particle.bornAt
        if (age >= particle.lifeMs) return false
        const dt = 1 / 60
        particle.vy += particle.gravity * dt
        particle.x += particle.vx * dt
        particle.y += particle.vy * dt
        particle.rotation += particle.spin * dt
        context.save()
        context.globalAlpha = 1 - age / particle.lifeMs
        context.translate(particle.x, particle.y)
        context.rotate(particle.rotation)
        context.font = `${particle.size}px sans-serif`
        context.textAlign = "center"
        context.textBaseline = "middle"
        context.fillText(particle.emoji, 0, 0)
        context.restore()
        return true
      })
      for (const projectile of projectilesRef.current.values()) {
        context.save()
        context.translate(projectile.x, projectile.y)
        context.rotate(projectile.rotation)
        context.font = `${projectile.size}px sans-serif`
        context.textAlign = "center"
        context.textBaseline = "middle"
        context.shadowBlur = 12
        context.shadowColor = "rgba(147,51,234,0.35)"
        context.fillText(projectile.emoji, 0, 0)
        context.restore()
      }
      if (particlesRef.current.length > 0 || projectilesRef.current.size > 0) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    ensureLoopRef.current = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(tick)
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      ensureLoopRef.current = () => {}
    }
  }, [])

  useEffect(() => {
    for (const effect of effects) {
      if (startedRef.current.has(effect.effectId)) continue
      startedRef.current.add(effect.effectId)
      startEffect(effect)
    }
  }, [effects, startEffect])

  useEffect(() => {
    const tweens = tweensRef.current
    const completionTimers = completionTimersRef.current
    return () => {
      for (const tween of tweens.values()) tween.kill()
      for (const timer of completionTimers.values()) clearTimeout(timer)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      void audioContextRef.current?.close()
    }
  }, [])

  if (typeof document === "undefined") return null
  return createPortal(<canvas ref={canvasRef} className="radial-effect-layer" aria-hidden />, document.body)
}
