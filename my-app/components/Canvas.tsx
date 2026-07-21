"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { getSocket } from "@/services/socket"
import { useLang } from "@/contexts/LanguageContext"
import { DrawData } from "@/types/game"
import { Paintbrush2, Eraser, Undo2, Trash2, Radio } from "lucide-react"

interface Props {
  isDrawer: boolean
}

type Stroke = DrawData[]

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
  const strokeHistory = useRef<Stroke[]>([])
  const activeStroke = useRef<Stroke>([])
  const [color, setColor] = useState("#1A1A1A")
  const [lineWidth, setLineWidth] = useState(6)
  const [activeTool, setActiveTool] = useState<"brush" | "eraser">("brush")
  const [scale, setScale] = useState(1)
  const [canUndo, setCanUndo] = useState(false)

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

  const syncCanUndo = useCallback(() => {
    setCanUndo(strokeHistory.current.length > 0 || activeStroke.current.length > 0)
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

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    for (const stroke of strokeHistory.current) {
      for (const segment of stroke) {
        drawLine(ctx, segment)
      }
    }
  }, [drawLine])

  const commitActiveStroke = useCallback(() => {
    if (activeStroke.current.length === 0) return
    strokeHistory.current.push(activeStroke.current)
    activeStroke.current = []
    syncCanUndo()
  }, [syncCanUndo])

  const clearCanvas = useCallback(() => {
    strokeHistory.current = []
    activeStroke.current = []
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext("2d")?.clearRect(0, 0, CANVAS_W, CANVAS_H)
    syncCanUndo()
  }, [syncCanUndo])

  useEffect(() => {
    const socket = getSocket()
    const onDraw = (data: DrawData) => {
      const ctx = canvasRef.current?.getContext("2d")
      activeStroke.current.push(data)
      if (ctx) drawLine(ctx, data)
    }
    const onStrokeEnd = () => {
      commitActiveStroke()
    }
    const onStrokeCancel = () => {
      activeStroke.current = []
      redrawCanvas()
      syncCanUndo()
    }
    const onUndo = () => {
      if (strokeHistory.current.length === 0) return
      strokeHistory.current.pop()
      activeStroke.current = []
      redrawCanvas()
      syncCanUndo()
    }
    socket.on("draw", onDraw)
    socket.on("stroke_end", onStrokeEnd)
    socket.on("stroke_cancel", onStrokeCancel)
    socket.on("undo", onUndo)
    socket.on("clear_canvas", clearCanvas)
    return () => {
      socket.off("draw", onDraw)
      socket.off("stroke_end", onStrokeEnd)
      socket.off("stroke_cancel", onStrokeCancel)
      socket.off("undo", onUndo)
      socket.off("clear_canvas", clearCanvas)
    }
  }, [drawLine, clearCanvas, redrawCanvas, commitActiveStroke, syncCanUndo])

  const getPos = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    }
  }

  const strokeAt = (pos: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext("2d")
    const drawColor = activeTool === "eraser" ? "#FFFFFF" : color
    const data: DrawData = { x: pos.x, y: pos.y, px: lastPos.current.x, py: lastPos.current.y, color: drawColor, lineWidth }
    activeStroke.current.push(data)
    if (ctx) drawLine(ctx, data)
    getSocket().emit("draw", data)
    lastPos.current = pos
    syncCanUndo()
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    activeStroke.current = []
    lastPos.current = getPos(e.clientX, e.clientY)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !drawing.current) return
    strokeAt(getPos(e.clientX, e.clientY))
  }

  const stopDrawing = () => {
    if (!drawing.current) return
    drawing.current = false
    if (activeStroke.current.length > 0) {
      strokeHistory.current.push(activeStroke.current)
      activeStroke.current = []
      syncCanUndo()
      if (isDrawer) getSocket().emit("stroke_end")
    }
  }

  const handleClear = () => {
    clearCanvas()
    getSocket().emit("clear_canvas")
  }

  const handleUndo = () => {
    if (!isDrawer) return
    if (activeStroke.current.length > 0) {
      drawing.current = false
      activeStroke.current = []
      redrawCanvas()
      syncCanUndo()
      getSocket().emit("stroke_cancel")
      return
    }
    if (strokeHistory.current.length === 0) return
    drawing.current = false
    getSocket().emit("undo")
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-b-3xl overflow-hidden">
      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-2 md:p-4 bg-white"
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
            style={{ transformOrigin: "top left", transform: `scale(${scale})`, touchAction: "none" }}
            className={`bg-white ${isDrawer ? "cursor-crosshair" : "cursor-default"}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
            onPointerCancel={stopDrawing}
          />
        </div>
      </div>

      {/* Drawing toolbar — only for drawer */}
      {isDrawer && (
        <div className="shrink-0 px-3 md:px-5 pb-4 md:pb-5 pt-3 bg-purple-50 border-t border-purple-100">
          {/* Row 1: tools + brush sizes */}
          <div className="flex items-center justify-between gap-2 md:gap-4 mb-3">
            {/* Tools */}
            <div className="flex items-center gap-2 bg-white p-2 rounded-full shadow-sm">
              <button
                onClick={() => setActiveTool("brush")}
                className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center transition-colors ${activeTool === "brush" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:bg-gray-100"}`}
                title={t("app.canvas_brush")}
              >
                <Paintbrush2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTool("eraser")}
                className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center transition-colors ${activeTool === "eraser" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:bg-gray-100"}`}
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
                  className={`rounded-full border-2 flex items-center justify-center transition-all min-w-[44px] min-h-[44px] ${lineWidth === s ? "border-purple-600 ring-2 ring-purple-200" : "border-white bg-gray-300"}`}
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
          <div className="flex items-center justify-between gap-2 md:gap-4">
            {/* Undo / Clear */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="flex items-center gap-1.5 bg-yellow-100 text-yellow-700 px-3 py-2 rounded-xl font-bold text-xs border border-yellow-200 hover:bg-yellow-200 transition-colors min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-yellow-100"
              >
                <Undo2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t("app.canvas_undo")}</span>
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 bg-red-100 text-red-600 px-3 py-2 rounded-xl font-bold text-xs border border-red-200 hover:bg-red-200 transition-colors min-h-[44px]"
              >
                <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t("app.canvas_clear")}</span>
              </button>
            </div>

            {/* Color palette */}
            <div className="flex gap-1 overflow-x-auto justify-end [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => { setColor(c); setActiveTool("brush") }}
                  title={c}
                  className={`w-8 h-8 md:w-7 md:h-7 rounded-lg border-2 transition-transform hover:scale-110 shrink-0 ${color === c && activeTool === "brush" ? "border-purple-600 ring-2 ring-purple-200 scale-110" : "border-white"}`}
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
