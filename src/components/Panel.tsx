import { useCallback, useState } from "react"

import { generateMarkdown } from "~lib/markdown-generator"
import type { ComponentInfo, ElementInfo, FrameworkInfo } from "~lib/types"

interface Props {
  elementInfo: ElementInfo
  frameworkInfo: FrameworkInfo | null
  componentInfo: ComponentInfo | null
  screenshotDataUrl: string | null
  onClose: () => void
}

export default function Panel({
  elementInfo,
  frameworkInfo,
  componentInfo,
  screenshotDataUrl,
  onClose,
}: Props) {
  const [instruction, setInstruction] = useState("")
  const [copied, setCopied] = useState<"screenshot" | "markdown" | false>(false)

  const buildMarkdown = useCallback(() => {
    return generateMarkdown({
      instruction,
      pageUrl: location.href,
      pageTitle: document.title,
      frameworkInfo,
      elementInfo,
      componentInfo,
    })
  }, [instruction, frameworkInfo, elementInfo, componentInfo])

  const copyTextFallback = useCallback((text: string) => {
    try {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    } catch {
      // silently fail
    }
  }, [])

  const handleCopyWithScreenshot = useCallback(async () => {
    const markdown = buildMarkdown()

    try {
      const response = await fetch(screenshotDataUrl!)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([markdown], { type: "text/plain" }),
          "image/png": blob,
        }),
      ])
    } catch {
      // Fallback: copy text only
      try {
        await navigator.clipboard.writeText(markdown)
      } catch {
        copyTextFallback(markdown)
      }
    }

    setCopied("screenshot")
    setTimeout(() => setCopied(false), 2000)
  }, [buildMarkdown, screenshotDataUrl, copyTextFallback])

  const handleCopyMarkdown = useCallback(async () => {
    const markdown = buildMarkdown()

    try {
      await navigator.clipboard.writeText(markdown)
    } catch {
      copyTextFallback(markdown)
    }

    setCopied("markdown")
    setTimeout(() => setCopied(false), 2000)
  }, [buildMarkdown, copyTextFallback])

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

      {/* Copy buttons */}
      <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={handleCopyWithScreenshot}
          disabled={!screenshotDataUrl}
          style={{
            width: "100%",
            padding: "10px 0",
            backgroundColor: copied === "screenshot"
              ? "#a6e3a1"
              : screenshotDataUrl
                ? "#cba6f7"
                : "#45475a",
            color: "#1e1e2e",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            cursor: screenshotDataUrl ? "pointer" : "default",
            transition: "background-color 0.2s",
            opacity: screenshotDataUrl ? 1 : 0.6,
          }}>
          {copied === "screenshot"
            ? "Copied!"
            : screenshotDataUrl
              ? "Copy with Screenshot"
              : "Capturing..."}
        </button>
        <button
          onClick={handleCopyMarkdown}
          style={{
            width: "100%",
            padding: "10px 0",
            backgroundColor: copied === "markdown" ? "#a6e3a1" : "transparent",
            color: copied === "markdown" ? "#1e1e2e" : "#cdd6f4",
            border: "1px solid #45475a",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "background-color 0.2s, color 0.2s",
          }}>
          {copied === "markdown" ? "Copied!" : "Copy Markdown Only"}
        </button>
      </div>
    </div>
  )
}
