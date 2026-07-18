"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { getSocket } from "@/services/socket"
import { useLang } from "@/contexts/LanguageContext"
import { DrawData } from "@/types/game"
import { Paintbrush2, Eraser, Undo2, Trash2, Radio } from "lucide-react"

interface Props {
  isDrawer: boolean
}

const COLORS = [
  "#1A1A1A", "#E53E3E", "#ED8936", "#D69E2E", "#38A169", "#319795",
  "#3182CE", "#805AD5", "#D53F8C", "#F56565", "#975A16", "#22543D",
  "#2A4365", "#6B46C1", "#9B2C2C", "#FFFFFF"
]
const BRUSH_SIZES = [3, 6, 10, 16]
const CANVAS_W = 700
const CANVAS_H = 420

export default function Canvas({ isDrawer }: Props) {
  const { t } = useLang()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const [color, setColor] = useState("#1A1A1A")
  const [lineWidth, setLineWidth] = useState(6)
  const [activeTool, setActiveTool] = useState<"brush" | "eraser">("brush")
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      const s = Math.min(1, container.clientWidth / CANVAS_W)
      setScale(s)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const drawLine = useCallback((ctx: CanvasRenderingContext2D, data: DrawData) => {
    ctx.strokeStyle = data.color
    ctx.lineWidth = data.lineWidth
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.beginPath()
    ctx.moveTo(data.px, data.py)
    ctx.lineTo(data.x, data.y)
    ctx.stroke()
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext("2d")?.clearRect(0, 0, CANVAS_W, CANVAS_H)
  }, [])

  useEffect(() => {
    const socket = getSocket()
    socket.on("draw", (data: DrawData) => {
      const ctx = canvasRef.current?.getContext("2d")
      if (ctx) drawLine(ctx, data)
    })
    socket.on("clear_canvas", clearCanvas)
    return () => {
      socket.off("draw")
      socket.off("clear_canvas")
    }
  }, [drawLine, clearCanvas])

  const getPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (!isDrawer) return
    drawing.current = true
    lastPos.current = getPos(e)
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDrawer || !drawing.current) return
    const pos = getPos(e)
    const ctx = canvasRef.current?.getContext("2d")
    const drawColor = activeTool === "eraser" ? "#FFFFFF" : color
    const data: DrawData = { x: pos.x, y: pos.y, px: lastPos.current.x, py: lastPos.current.y, color: drawColor, lineWidth }
    if (ctx) drawLine(ctx, data)
    getSocket().emit("draw", data)
    lastPos.current = pos
  }

  const onMouseUp = () => { drawing.current = false }

  const handleClear = () => {
    clearCanvas()
    getSocket().emit("clear_canvas")
  }

  const handleUndo = () => {
    // TODO: implement undo with history
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-b-3xl overflow-hidden">
      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-4 bg-white"
        style={{
          backgroundImage: "radial-gradient(#d1d5db 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {/* LIVE badge */}
        <div className="absolute top-4 right-4 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full flex items-center gap-2 z-10 pointer-events-none">
          <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          <span className="text-[10px] font-bold text-purple-600">{t("app.canvas_live")}</span>
        </div>

        <div
          style={{
            width: CANVAS_W * scale,
            height: CANVAS_H * scale,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ transformOrigin: "top left", transform: `scale(${scale})` }}
            className={`bg-white ${isDrawer ? "cursor-crosshair" : "cursor-default"}`}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          />
        </div>
      </div>

      {/* Drawing toolbar — only for drawer */}
      {isDrawer && (
        <div className="shrink-0 px-5 pb-5 pt-3 bg-purple-50 border-t border-purple-100">
          {/* Row 1: tools + brush sizes */}
          <div className="flex items-center justify-between gap-4 mb-3">
            {/* Tools */}
            <div className="flex items-center gap-2 bg-white p-2 rounded-full shadow-sm">
              <button
                onClick={() => setActiveTool("brush")}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${activeTool === "brush" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:bg-gray-100"}`}
                title={t("app.canvas_brush")}
              >
                <Paintbrush2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTool("eraser")}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${activeTool === "eraser" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:bg-gray-100"}`}
                title={t("app.canvas_eraser")}
              >
                <Eraser className="w-4 h-4" />
              </button>
            </div>

            {/* Brush sizes */}
            <div className="flex items-center gap-2">
              {BRUSH_SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => setLineWidth(s)}
                  className={`rounded-full border-2 flex items-center justify-center transition-all ${lineWidth === s ? "border-purple-600 ring-2 ring-purple-200" : "border-white bg-gray-300"}`}
                  style={{ width: s + 14, height: s + 14 }}
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: s + 2,
                      height: s + 2,
                      backgroundColor: lineWidth === s ? "#9333ea" : "#9ca3af"
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: undo/clear + colors */}
          <div className="flex items-center justify-between gap-4">
            {/* Undo / Clear */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleUndo}
                className="flex items-center gap-1.5 bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-xl font-bold text-xs border border-yellow-200 hover:bg-yellow-200 transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" /> {t("app.canvas_undo")}
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 bg-red-100 text-red-600 px-3 py-1.5 rounded-xl font-bold text-xs border border-red-200 hover:bg-red-200 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> {t("app.canvas_clear")}
              </button>
            </div>

            {/* Color palette */}
            <div className="flex flex-wrap gap-1 justify-end">
              {COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => { setColor(c); setActiveTool("brush") }}
                  title={c}
                  className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 shrink-0 ${color === c && activeTool === "brush" ? "border-purple-600 ring-2 ring-purple-200 scale-110" : "border-white"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
