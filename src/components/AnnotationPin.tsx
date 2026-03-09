import { useEffect, useRef, useState } from "react"

import type { Annotation } from "~lib/types"

interface Props {
  annotation: Annotation
  isActive: boolean
  onClick: () => void
  onUpdateInstruction: (id: number, instruction: string) => void
  onDeselect: () => void
}

export default function AnnotationPin({
  annotation,
  isActive,
  onClick,
  onUpdateInstruction,
  onDeselect,
}: Props) {
  const [draft, setDraft] = useState(annotation.instruction)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync draft when annotation instruction changes externally (e.g. from panel)
  useEffect(() => {
    if (!isActive) {
      setDraft(annotation.instruction)
    }
  }, [annotation.instruction, isActive])

  // Focus textarea when popover opens
  useEffect(() => {
    if (isActive) {
      setDraft(annotation.instruction)
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }, [isActive, annotation.instruction])

  const element = document.querySelector(annotation.elementInfo.selector)
  if (!element) return null

  const rect = element.getBoundingClientRect()

  const handleSave = () => {
    onUpdateInstruction(annotation.id, draft)
    onDeselect()
  }

  // Place popover below pin; flip above if near bottom of viewport
  const popoverTop = rect.top + 20
  const flipUp = popoverTop + 120 > window.innerHeight
  const popoverStyle: React.CSSProperties = {
    position: "fixed",
    left: rect.right + 4,
    width: 240,
    ...(flipUp
      ? { bottom: window.innerHeight - rect.top + 12 }
      : { top: popoverTop }),
  }

  return (
    <>
      {/* Pin circle */}
      <div
        onClick={(e) => {
          e.stopPropagation()
          if (isActive) {
            handleSave()
          } else {
            onClick()
          }
        }}
        style={{
          position: "fixed",
          top: rect.top - 8,
          left: rect.right + 4,
          width: 22,
          height: 22,
          borderRadius: "50%",
          backgroundColor: isActive ? "#cba6f7" : "#585b70",
          color: isActive ? "#1e1e2e" : "#cdd6f4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          zIndex: 2147483646,
          boxShadow: isActive
            ? "0 0 0 3px rgba(203, 166, 247, 0.3), 0 2px 8px rgba(0,0,0,0.3)"
            : "0 2px 8px rgba(0,0,0,0.3)",
          transition: "background-color 0.15s, box-shadow 0.15s",
          pointerEvents: "auto",
          userSelect: "none",
        }}>
        {annotation.id}
      </div>

      {/* Popover form */}
      {isActive && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            ...popoverStyle,
            backgroundColor: "#1e1e2e",
            border: "1px solid #45475a",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            zIndex: 2147483647,
            pointerEvents: "auto",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}>
          {/* Element label */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                backgroundColor: "#cba6f7",
                color: "#1e1e2e",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}>
              {annotation.id}
            </span>
            <code
              style={{
                backgroundColor: "#313244",
                color: "#cdd6f4",
                padding: "1px 5px",
                borderRadius: 3,
                fontSize: 11,
              }}>
              {`<${annotation.elementInfo.tag}>`}
            </code>
            {annotation.elementInfo.text && (
              <span
                style={{
                  fontSize: 11,
                  color: "#a6adc8",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}>
                {annotation.elementInfo.text.slice(0, 15)}
                {annotation.elementInfo.text.length > 15 ? "..." : ""}
              </span>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSave()
              }
              // Prevent Escape from closing the whole overlay
              if (e.key === "Escape") {
                e.stopPropagation()
                handleSave()
              }
            }}
            placeholder="指示を入力..."
            rows={3}
            style={{
              width: "100%",
              backgroundColor: "#313244",
              color: "#cdd6f4",
              border: "1px solid #45475a",
              borderRadius: 6,
              padding: "6px 8px",
              resize: "vertical",
              fontFamily: "inherit",
              fontSize: 12,
              lineHeight: 1.4,
              boxSizing: "border-box",
              outline: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#cba6f7"
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#45475a"
            }}
          />

          <button
            onClick={handleSave}
            style={{
              width: "100%",
              padding: "6px 0",
              backgroundColor: "#cba6f7",
              color: "#1e1e2e",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              transition: "background-color 0.15s",
            }}>
            Save
          </button>
        </div>
      )}
    </>
  )
}
