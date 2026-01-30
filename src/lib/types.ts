// Chrome runtime message (background → content script)
export interface ToggleMessage {
  type: "PICK_CON_TOGGLE"
}

// PostMessage types (Isolated World ↔ Main World)
export interface CollectRequest {
  type: "PICK_CON_COLLECT"
  selector: string
}

export interface CollectResult {
  type: "PICK_CON_RESULT"
  framework: FrameworkInfo | null
  component: ComponentInfo | null
}

export interface FrameworkInfo {
  framework: string | null   // "React" | "Vue"
  metaFramework: string | null // "Next.js (App Router)" | "Nuxt"
}

export interface ComponentInfo {
  framework: "react" | "vue"
  hierarchy: string[]
  props?: Record<string, unknown>
  state?: Record<string, unknown>
}

export interface ElementInfo {
  selector: string
  tag: string
  text: string
  attributes: Record<string, string>
}

export interface Rect {
  top: number
  left: number
  width: number
  height: number
}

export interface CaptureRequest {
  type: "PICK_CON_CAPTURE"
}

export interface CaptureResponse {
  success: boolean
  dataUrl?: string
  error?: string
}

export interface MarkdownInput {
  instruction: string
  pageUrl: string
  pageTitle: string
  frameworkInfo: FrameworkInfo | null
  elementInfo: ElementInfo
  componentInfo: ComponentInfo | null
}
