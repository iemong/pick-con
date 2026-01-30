import type { Rect } from "~lib/types"

interface Props {
  rect: Rect
}

export default function HighlightBox({ rect }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        border: "2px solid #4A90D9",
        backgroundColor: "rgba(74, 144, 217, 0.15)",
        pointerEvents: "none",
        zIndex: 2147483646,
        boxSizing: "border-box",
        borderRadius: 2,
        transition: "all 0.05s ease-out",
      }}
    />
  )
}
