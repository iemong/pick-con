import { useCallback, useEffect, useRef, useState } from "react"

import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"

import HighlightBox from "~components/HighlightBox"
import Panel from "~components/Panel"
import { generateSelector } from "~lib/selector"
import type {
  CollectResult,
  ComponentInfo,
  ElementInfo,
  FrameworkInfo,
  Rect,
} from "~lib/types"

import styleText from "data-text:~style.css"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}

function getAttributes(element: Element): Record<string, string> {
  const attrs: Record<string, string> = {}
  const interestingAttrs = [
    "class",
    "id",
    "name",
    "type",
    "href",
    "src",
    "role",
    "aria-label",
    "aria-describedby",
    "data-testid",
  ]

  for (const name of interestingAttrs) {
    const value = element.getAttribute(name)
    if (value !== null) {
      attrs[name] = value
    }
  }

  // Include data-* attributes not already captured
  for (const attr of Array.from(element.attributes)) {
    if (attr.name.startsWith("data-") && !(attr.name in attrs)) {
      attrs[attr.name] = attr.value
    }
  }

  return attrs
}

function truncateText(text: string, maxLength: number): string {
  const trimmed = text.trim().replace(/\s+/g, " ")
  if (trimmed.length <= maxLength) return trimmed
  return trimmed.slice(0, maxLength) + "..."
}

function isPlasmoElement(target: Element): boolean {
  return !!(
    target.closest?.("[id^='plasmo-']") ||
    target.id?.startsWith("plasmo-")
  )
}

export default function Overlay() {
  const [isActive, setIsActive] = useState(false)
  const [hoveredRect, setHoveredRect] = useState<Rect | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [elementInfo, setElementInfo] = useState<ElementInfo | null>(null)
  const [frameworkInfo, setFrameworkInfo] = useState<FrameworkInfo | null>(null)
  const [componentInfo, setComponentInfo] = useState<ComponentInfo | null>(null)

  const cursorStyleRef = useRef<HTMLStyleElement | null>(null)

  // Listen for toggle from background
  useEffect(() => {
    const handler = (message: any) => {
      if (message?.type === "PICK_CON_TOGGLE") {
        setIsActive((prev) => {
          if (prev) {
            // Deactivating
            setShowPanel(false)
            setHoveredRect(null)
            setElementInfo(null)
            setFrameworkInfo(null)
            setComponentInfo(null)
          }
          return !prev
        })
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  // Listen for results from main world
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return
      if (event.data?.type !== "PICK_CON_RESULT") return
      const result = event.data as CollectResult
      setFrameworkInfo(result.framework)
      setComponentInfo(result.component)
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])

  // Cursor style when inspector is active
  useEffect(() => {
    if (isActive) {
      const style = document.createElement("style")
      style.id = "pick-con-cursor"
      style.textContent = "* { cursor: crosshair !important; }"
      document.head.appendChild(style)
      cursorStyleRef.current = style
    } else {
      cursorStyleRef.current?.remove()
      cursorStyleRef.current = null
    }
    return () => {
      cursorStyleRef.current?.remove()
      cursorStyleRef.current = null
    }
  }, [isActive])

  // Mouse handlers for inspector mode
  useEffect(() => {
    if (!isActive) return

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as Element
      if (isPlasmoElement(target)) {
        setHoveredRect(null)
        return
      }
      const rect = target.getBoundingClientRect()
      setHoveredRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      })
    }

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element
      if (isPlasmoElement(target)) return

      e.preventDefault()
      e.stopPropagation()

      const info: ElementInfo = {
        selector: generateSelector(target),
        tag: target.tagName.toLowerCase(),
        text: truncateText(
          (target as HTMLElement).innerText || "",
          200
        ),
        attributes: getAttributes(target),
      }

      setElementInfo(info)
      setFrameworkInfo(null)
      setComponentInfo(null)
      setShowPanel(true)
      setIsActive(false)
      setHoveredRect(null)

      // Request framework info from main world
      window.postMessage(
        { type: "PICK_CON_COLLECT", selector: info.selector },
        "*"
      )
    }

    document.addEventListener("mousemove", handleMouseMove, true)
    document.addEventListener("click", handleClick, true)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true)
      document.removeEventListener("click", handleClick, true)
    }
  }, [isActive])

  const handleClose = useCallback(() => {
    setShowPanel(false)
    setElementInfo(null)
    setFrameworkInfo(null)
    setComponentInfo(null)
  }, [])

  if (!isActive && !showPanel) return null

  return (
    <>
      {isActive && hoveredRect && <HighlightBox rect={hoveredRect} />}
      {showPanel && elementInfo && (
        <Panel
          elementInfo={elementInfo}
          frameworkInfo={frameworkInfo}
          componentInfo={componentInfo}
          onClose={handleClose}
        />
      )}
    </>
  )
}
