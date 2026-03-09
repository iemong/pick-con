import { useCallback, useRef, useState } from "react"

import { generateBatchJsonl } from "~lib/jsonl-generator"
import { generateBatchMarkdown } from "~lib/markdown-generator"
import type { Annotation, OutputFormat } from "~lib/types"

interface Props {
  annotations: Annotation[]
  activeAnnotationId: number | null
  onSelectAnnotation: (id: number) => void
  onUpdateInstruction: (id: number, instruction: string) => void
  onDeleteAnnotation: (id: number) => void
  onClose: () => void
}

export default function AnnotationPanel({
  annotations,
  activeAnnotationId,
  onSelectAnnotation,
  onUpdateInstruction,
  onDeleteAnnotation,
  onClose,
}: Props) {
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("jsonl")
  const [copied, setCopied] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const buildOutput = useCallback(() => {
    const input = {
      pageUrl: location.href,
      pageTitle: document.title,
      annotations,
    }
    return outputFormat === "jsonl"
      ? generateBatchJsonl(input)
      : generateBatchMarkdown(input)
  }, [annotations, outputFormat])

  const handleCopy = useCallback(async () => {
    const output = buildOutput()
    try {
      await navigator.clipboard.writeText(output)
    } catch {
      try {
        const textarea = document.createElement("textarea")
        textarea.value = output
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      } catch {
        // silently fail
      }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [buildOutput])

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
          flexShrink: 0,
        }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#cba6f7" }}>
          pick-con
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#6c7086" }}>
            {annotations.length} annotations
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
      </div>

      {/* Annotation list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 0",
        }}>
        {annotations.length === 0 ? (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              color: "#6c7086",
              fontSize: 12,
            }}>
            Click elements on the page to annotate them
          </div>
        ) : (
          annotations.map((annotation) => (
            <div
              key={annotation.id}
              onClick={() => onSelectAnnotation(annotation.id)}
              style={{
                padding: "8px 16px",
                borderLeft:
                  activeAnnotationId === annotation.id
                    ? "3px solid #cba6f7"
                    : "3px solid transparent",
                backgroundColor:
                  activeAnnotationId === annotation.id
                    ? "rgba(203, 166, 247, 0.05)"
                    : "transparent",
                cursor: "pointer",
                transition: "background-color 0.1s",
              }}>
              {/* Annotation header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    backgroundColor:
                      activeAnnotationId === annotation.id
                        ? "#cba6f7"
                        : "#585b70",
                    color:
                      activeAnnotationId === annotation.id
                        ? "#1e1e2e"
                        : "#cdd6f4",
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
                    {annotation.elementInfo.text.slice(0, 20)}
                    {annotation.elementInfo.text.length > 20 ? "..." : ""}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteAnnotation(annotation.id)
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#6c7086",
                    cursor: "pointer",
                    fontSize: 14,
                    padding: "0 2px",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}>
                  ×
                </button>
              </div>

              {/* Instruction input */}
              <textarea
                value={annotation.instruction}
                onChange={(e) =>
                  onUpdateInstruction(annotation.id, e.target.value)
                }
                onClick={(e) => e.stopPropagation()}
                placeholder="指示を入力..."
                rows={2}
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
            </div>
          ))
        )}
      </div>

      {/* Footer: format toggle + copy */}
      {annotations.length > 0 && (
        <div
          style={{
            borderTop: "1px solid #313244",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flexShrink: 0,
          }}>
          {/* Format toggle */}
          <div style={{ display: "flex", gap: 4 }}>
            {(["jsonl", "markdown"] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setOutputFormat(fmt)}
                style={{
                  flex: 1,
                  padding: "5px 0",
                  backgroundColor:
                    outputFormat === fmt ? "#cba6f7" : "transparent",
                  color: outputFormat === fmt ? "#1e1e2e" : "#6c7086",
                  border:
                    outputFormat === fmt ? "none" : "1px solid #45475a",
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

          {/* Copy button */}
          <button
            onClick={handleCopy}
            style={{
              width: "100%",
              padding: "10px 0",
              backgroundColor: copied ? "#a6e3a1" : "#cba6f7",
              color: "#1e1e2e",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}>
            {copied
              ? "Copied!"
              : `Copy All (${annotations.length}) as ${outputFormat === "jsonl" ? "JSONL" : "Markdown"}`}
          </button>
        </div>
      )}
    </div>
  )
}
