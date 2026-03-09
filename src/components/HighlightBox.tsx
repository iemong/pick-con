import { useTheme } from "~lib/theme"
import type { Rect } from "~lib/types"

interface Props {
  rect: Rect
}

export default function HighlightBox({ rect }: Props) {
  const { theme } = useTheme()

  return (
    <div
      style={{
        position: "fixed",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        border: `2px solid ${theme.accent}`,
        backgroundColor: theme.accentMuted,
        pointerEvents: "none",
        zIndex: 2147483646,
        boxSizing: "border-box",
        borderRadius: 3,
        transition: "all 0.05s ease-out",
      }}
    />
  )
}
