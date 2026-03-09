import { useCallback, useState } from "react"

import { generateJsonl } from "~lib/jsonl-generator"
import { generateMarkdown } from "~lib/markdown-generator"
import type { ComponentInfo, ElementInfo, FrameworkInfo, OutputFormat } from "~lib/types"

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
  const [copied, setCopied] = useState<"text" | "screenshot" | "both" | false>(false)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("jsonl")

  const buildOutput = useCallback(() => {
    const input = {
      instruction,
      pageUrl: location.href,
      pageTitle: document.title,
      frameworkInfo,
      elementInfo,
      componentInfo,
    }
    return outputFormat === "jsonl" ? generateJsonl(input) : generateMarkdown(input)
  }, [instruction, frameworkInfo, elementInfo, componentInfo, outputFormat])

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

  const handleCopyText = useCallback(async () => {
    const output = buildOutput()

    try {
      await navigator.clipboard.writeText(output)
    } catch {
      copyTextFallback(output)
    }

    setCopied("text")
    setTimeout(() => setCopied(false), 2000)
  }, [buildOutput, copyTextFallback])

  const handleCopyScreenshot = useCallback(async () => {
    try {
      const response = await fetch(screenshotDataUrl!)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ])
    } catch {
      // silently fail — image-only copy not supported
    }

    setCopied("screenshot")
    setTimeout(() => setCopied(false), 2000)
  }, [screenshotDataUrl])

  const handleCopyBoth = useCallback(async () => {
    const output = buildOutput()

    try {
      const response = await fetch(screenshotDataUrl!)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([output], { type: "text/plain" }),
          "image/png": blob,
        }),
      ])
    } catch {
      try {
        await navigator.clipboard.writeText(output)
      } catch {
        copyTextFallback(output)
      }
    }

    setCopied("both")
    setTimeout(() => setCopied(false), 2000)
  }, [buildOutput, screenshotDataUrl, copyTextFallback])

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
          tegakari
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

      {/* Format toggle */}
      <div style={{ padding: "0 16px 8px", display: "flex", gap: 4 }}>
        {(["jsonl", "markdown"] as const).map((fmt) => (
          <button
            key={fmt}
            onClick={() => setOutputFormat(fmt)}
            style={{
              flex: 1,
              padding: "6px 0",
              backgroundColor: outputFormat === fmt ? "#cba6f7" : "transparent",
              color: outputFormat === fmt ? "#1e1e2e" : "#6c7086",
              border: outputFormat === fmt ? "none" : "1px solid #45475a",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 11,
              cursor: "pointer",
              transition: "background-color 0.2s, color 0.2s",
            }}>
            {fmt === "jsonl" ? "JSONL" : "Markdown"}
          </button>
        ))}
      </div>

      {/* Copy buttons */}
      <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Primary: copy text */}
        <button
          onClick={handleCopyText}
          style={{
            width: "100%",
            padding: "10px 0",
            backgroundColor: copied === "text" ? "#a6e3a1" : "#cba6f7",
            color: "#1e1e2e",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}>
          {copied === "text" ? "Copied!" : `Copy ${outputFormat === "jsonl" ? "JSONL" : "Markdown"}`}
        </button>

        {/* Secondary row: screenshot / both */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleCopyScreenshot}
            disabled={!screenshotDataUrl}
            style={{
              flex: 1,
              padding: "10px 0",
              backgroundColor: copied === "screenshot" ? "#a6e3a1" : "transparent",
              color: copied === "screenshot" ? "#1e1e2e" : "#cdd6f4",
              border: "1px solid #45475a",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 12,
              cursor: screenshotDataUrl ? "pointer" : "default",
              transition: "background-color 0.2s, color 0.2s",
              opacity: screenshotDataUrl ? 1 : 0.5,
            }}>
            {copied === "screenshot"
              ? "Copied!"
              : screenshotDataUrl
                ? "Screenshot"
                : "Capturing..."}
          </button>
          <button
            onClick={handleCopyBoth}
            disabled={!screenshotDataUrl}
            style={{
              flex: 1,
              padding: "10px 0",
              backgroundColor: copied === "both" ? "#a6e3a1" : "transparent",
              color: copied === "both" ? "#1e1e2e" : "#cdd6f4",
              border: "1px solid #45475a",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 12,
              cursor: screenshotDataUrl ? "pointer" : "default",
              transition: "background-color 0.2s, color 0.2s",
              opacity: screenshotDataUrl ? 1 : 0.5,
            }}>
            {copied === "both"
              ? "Copied!"
              : screenshotDataUrl
                ? "Text + Screenshot"
                : "Capturing..."}
          </button>
        </div>
      </div>
    </div>
  )
}
