/**
 * @tegakari/browser-capture - Agent-first browser testing & capture tool
 *
 * 設計思想:
 * - Claude Codeが自然言語テストケースを構造化JSONに変換して渡す
 * - ツールがagent-browserで実行し、動画/スクリーンショットをキャプチャー
 * - 結果をtegakari互換のMarkdown/JSONLで返す
 */

// ============================================================
// テストケーススキーマ（JSON入力）
// ============================================================

/** テストステップ: 1つの操作 */
export interface TestStep {
  /** 操作の説明（自然言語） */
  description: string
  /** 操作種別 */
  action: "navigate" | "click" | "fill" | "hover" | "press" | "scroll" | "wait" | "assert" | "capture"
  /** 対象セレクタ or ref（navigate時はURL） */
  target: string
  /** 入力値（fill, press で使用） */
  value?: string
  /** 操作後の待機条件 */
  waitFor?: {
    selector?: string
    text?: string
    url?: string
    networkIdle?: boolean
    timeout?: number
  }
  /** このステップでキャプチャーを取るか */
  capture?: {
    screenshot?: boolean
    fullPage?: boolean
    /** キャプチャー対象セレクタ（省略時はtarget） */
    selector?: string
  }
  /** アサーション（assert action で使用） */
  assert?: {
    /** 検証種別 */
    type: "visible" | "hidden" | "text" | "url" | "title" | "count"
    expected?: string | number
  }
}

/** テストケース全体 */
export interface TestCase {
  /** テスト名 */
  name: string
  /** テストの説明（自然言語でOK） */
  description?: string
  /** 開始URL */
  url: string
  /** ブラウザ設定 */
  browser?: {
    device?: string
    viewport?: { width: number; height: number }
    headed?: boolean
    colorScheme?: "light" | "dark"
  }
  /** テストステップ */
  steps: TestStep[]
  /** 全ステップで動画を録画するか */
  record?: boolean
  /** 出力設定 */
  output?: {
    format?: "markdown" | "jsonl" | "json"
    dir?: string
    /** 出力に含めるフィールド（コンテキストウィンドウ節約用） */
    fields?: string[]
  }
}

// ============================================================
// 実行結果
// ============================================================

/** ステップ実行結果 */
export interface StepResult {
  stepIndex: number
  description: string
  action: string
  status: "passed" | "failed" | "skipped"
  /** 実行時間(ms) */
  duration: number
  /** エラーメッセージ（失敗時） */
  error?: string
  /** キャプチャー結果 */
  capture?: {
    screenshotPath?: string
    element?: CapturedElement
    frameworkInfo?: FrameworkInfo | null
    componentInfo?: ComponentInfo | null
  }
  /** スナップショット（操作後の状態） */
  snapshot?: string
}

/** テスト実行結果 */
export interface TestResult {
  name: string
  url: string
  status: "passed" | "failed"
  /** 全体実行時間(ms) */
  duration: number
  steps: StepResult[]
  /** 動画パス */
  recordingPath?: string
  /** ページ情報 */
  page?: {
    title: string
    url: string
    frameworkInfo: FrameworkInfo | null
  }
  timestamp: string
}

// ============================================================
// 要素・フレームワーク情報（tegakari互換）
// ============================================================

export interface CapturedElement {
  ref: string
  selector: string
  tag: string
  text: string
  attributes: Record<string, string>
  role?: string
  name?: string
}

export interface FrameworkInfo {
  framework: string | null
  metaFramework: string | null
}

export interface ComponentInfo {
  framework: "react" | "vue"
  hierarchy: string[]
  props?: Record<string, unknown>
  state?: Record<string, unknown>
}

// ============================================================
// CLI スキーマ（--describe で出力される自己記述情報）
// ============================================================

export interface CommandSchema {
  name: string
  description: string
  input: {
    type: "json" | "flags"
    schema?: Record<string, unknown>
  }
  output: {
    formats: string[]
    schema?: Record<string, unknown>
  }
  examples: Array<{
    description: string
    command: string
    input?: string
  }>
}
