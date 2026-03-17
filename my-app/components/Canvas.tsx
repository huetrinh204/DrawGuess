"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { getSocket } from "@/services/socket"
import { DrawData } from "@/types/game"

interface Props {
  isDrawer: boolean
}

const COLORS = ["#000000", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#ffffff"]
const CANVAS_W = 700
const CANVAS_H = 420

export default function Canvas({ isDrawer }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const [color, setColor] = useState("#000000")
  const [lineWidth, setLineWidth] = useState(5)
  const [scale, setScale] = useState(1)

  // Resize canvas display theo container, giữ nguyên nội dung
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

  // Chuyển tọa độ màn hình → tọa độ canvas thực (bù scale)
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
    const data: DrawData = { x: pos.x, y: pos.y, px: lastPos.current.x, py: lastPos.current.y, color, lineWidth }
    if (ctx) drawLine(ctx, data)
    getSocket().emit("draw", data)
    lastPos.current = pos
  }

  const onMouseUp = () => { drawing.current = false }

  const handleClear = () => {
    clearCanvas()
    getSocket().emit("clear_canvas")
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-2 w-full">
      {/* Canvas scale bằng CSS transform, không thay đổi resolution */}
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
          className={`border-2 border-gray-300 rounded bg-white ${isDrawer ? "cursor-crosshair" : "cursor-default"}`}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
      </div>

      {isDrawer && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                title={c}
                className={`w-7 h-7 rounded-full border-2 shrink-0 ${color === c ? "border-gray-800 scale-110" : "border-gray-300"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="range" min={2} max={30} value={lineWidth}
              onChange={e => setLineWidth(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-xs text-gray-500 w-12">Size: {lineWidth}</span>
          </div>
          <button
            onClick={handleClear}
            className="ml-auto shrink-0 bg-red-100 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-200"
          >
            Xóa
          </button>
        </div>
      )}
    </div>
  )
}
