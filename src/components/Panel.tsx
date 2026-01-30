import { useCallback, useState } from "react"

import { generateMarkdown } from "~lib/markdown-generator"
import type { ComponentInfo, ElementInfo, FrameworkInfo } from "~lib/types"

interface Props {
  elementInfo: ElementInfo
  frameworkInfo: FrameworkInfo | null
  componentInfo: ComponentInfo | null
  onClose: () => void
}

export default function Panel({
  elementInfo,
  frameworkInfo,
  componentInfo,
  onClose,
}: Props) {
  const [instruction, setInstruction] = useState("")
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const markdown = generateMarkdown({
      instruction,
      pageUrl: location.href,
      pageTitle: document.title,
      frameworkInfo,
      elementInfo,
      componentInfo,
    })

    try {
      await navigator.clipboard.writeText(markdown)
    } catch {
      // Fallback for contexts where clipboard API is unavailable
      const textarea = document.createElement("textarea")
      textarea.value = markdown
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [instruction, frameworkInfo, elementInfo, componentInfo])

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        width: 360,
        maxHeight: "calc(100vh - 32px)",
        backgroundColor: "#1e1e2e",
        color: "#cdd6f4",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 13,
        pointerEvents: "auto",
        zIndex: 2147483647,
      }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #313244",
        }}>
        <span
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: "#cba6f7",
          }}>
          pick-con
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#6c7086",
            cursor: "pointer",
            fontSize: 18,
            padding: "0 4px",
            lineHeight: 1,
          }}>
          ×
        </button>
      </div>

      {/* Selected element info */}
      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid #313244",
          color: "#a6adc8",
          fontSize: 12,
        }}>
        <code
          style={{
            backgroundColor: "#313244",
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: 11,
            wordBreak: "break-all",
          }}>
          {`<${elementInfo.tag}>`}
        </code>
        {elementInfo.text && (
          <span style={{ marginLeft: 8 }}>
            {elementInfo.text.length > 30
              ? elementInfo.text.slice(0, 30) + "..."
              : elementInfo.text}
          </span>
        )}
      </div>

      {/* Instruction textarea */}
      <div style={{ padding: "12px 16px" }}>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="指示を入力（例：このボタンの色を赤に変更したい）"
          style={{
            width: "100%",
            minHeight: 80,
            backgroundColor: "#313244",
            color: "#cdd6f4",
            border: "1px solid #45475a",
            borderRadius: 8,
            padding: "10px 12px",
            resize: "vertical",
            fontFamily: "inherit",
            fontSize: 13,
            lineHeight: 1.5,
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
      </div>

      {/* Copy button */}
      <div style={{ padding: "0 16px 16px" }}>
        <button
          onClick={handleCopy}
          style={{
            width: "100%",
            padding: "10px 0",
            backgroundColor: copied ? "#a6e3a1" : "#cba6f7",
            color: copied ? "#1e1e2e" : "#1e1e2e",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}>
          {copied ? "Copied!" : "Copy Markdown"}
        </button>
      </div>
    </div>
  )
}
