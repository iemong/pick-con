import type { TestResult, StepResult } from "./types.js"

/** テスト結果をMarkdown出力（tegakari互換） */
export function toMarkdown(result: TestResult): string {
  const sections: string[] = []

  // ヘッダー
  sections.push(`# ${result.name}`)
  sections.push(
    `**Status**: ${result.status === "passed" ? "PASSED" : "FAILED"} | ` +
    `**Duration**: ${result.duration}ms | ` +
    `**Time**: ${result.timestamp}`
  )

  // Page Context
  if (result.page) {
    const ctx: string[] = []
    ctx.push(`- **URL**: ${result.page.url}`)
    ctx.push(`- **Page Title**: ${result.page.title}`)
    if (result.page.frameworkInfo?.framework) {
      ctx.push(`- **Framework**: ${result.page.frameworkInfo.framework}`)
    }
    if (result.page.frameworkInfo?.metaFramework) {
      ctx.push(`- **Meta Framework**: ${result.page.frameworkInfo.metaFramework}`)
    }
    sections.push(`## Page Context\n${ctx.join("\n")}`)
  }

  // Steps
  for (const step of result.steps) {
    sections.push(stepToMarkdown(step))
  }

  // Recording
  if (result.recordingPath) {
    sections.push(`## Recording\n[${result.recordingPath}](${result.recordingPath})`)
  }

  return sections.join("\n\n")
}

function stepToMarkdown(step: StepResult): string {
  const icon = step.status === "passed" ? "[PASS]" : step.status === "failed" ? "[FAIL]" : "[SKIP]"
  const lines: string[] = []

  lines.push(`### Step ${step.stepIndex + 1}: ${step.description}`)
  lines.push(`${icon} \`${step.action}\` (${step.duration}ms)`)

  if (step.error) {
    lines.push(`\n**Error**: ${step.error}`)
  }

  if (step.capture) {
    if (step.capture.screenshotPath) {
      lines.push(`\n![step-${step.stepIndex + 1}](${step.capture.screenshotPath})`)
    }
    if (step.capture.element) {
      const el = step.capture.element
      lines.push(`\n- **Selector**: \`${el.selector}\``)
      lines.push(`- **Tag**: \`<${el.tag}>\``)
      if (el.text) lines.push(`- **Text**: "${el.text}"`)
      const attrs = Object.entries(el.attributes)
      if (attrs.length > 0) {
        lines.push(`- **Attributes**:`)
        for (const [k, v] of attrs) {
          lines.push(`  - ${k}: \`${v}\``)
        }
      }
    }
    if (step.capture.componentInfo) {
      const comp = step.capture.componentInfo
      const label = comp.framework === "react" ? "Component Tree (React)" : "Component Tree (Vue)"
      lines.push(`\n**${label}**:`)
      if (comp.hierarchy.length > 0) {
        lines.push(`- \`${comp.hierarchy.join("` → `")}\``)
      }
      if (comp.props) {
        lines.push(`- **Props**: \`${formatObject(comp.props)}\``)
      }
      if (comp.state) {
        const stateLabel = comp.framework === "vue" ? "Data" : "State"
        lines.push(`- **${stateLabel}**: \`${formatObject(comp.state)}\``)
      }
    }
  }

  return lines.join("\n")
}

/** テスト結果をJSONL出力 */
export function toJsonl(result: TestResult): string {
  const lines: string[] = []

  // テストメタ
  lines.push(JSON.stringify({
    type: "testResult",
    name: result.name,
    status: result.status,
    duration: result.duration,
    url: result.url,
    timestamp: result.timestamp,
  }))

  // ページコンテキスト
  if (result.page) {
    const ctx: Record<string, unknown> = {
      type: "pageContext",
      url: result.page.url,
      pageTitle: result.page.title,
    }
    if (result.page.frameworkInfo?.framework) ctx.framework = result.page.frameworkInfo.framework
    if (result.page.frameworkInfo?.metaFramework) ctx.metaFramework = result.page.frameworkInfo.metaFramework
    lines.push(JSON.stringify(ctx))
  }

  // 各ステップ
  for (const step of result.steps) {
    const entry: Record<string, unknown> = {
      type: "stepResult",
      stepIndex: step.stepIndex,
      description: step.description,
      action: step.action,
      status: step.status,
      duration: step.duration,
    }
    if (step.error) entry.error = step.error
    if (step.capture?.screenshotPath) entry.screenshotPath = step.capture.screenshotPath
    if (step.capture?.element) {
      entry.element = {
        selector: step.capture.element.selector,
        tag: step.capture.element.tag,
        text: step.capture.element.text,
        attributes: step.capture.element.attributes,
      }
    }
    if (step.capture?.componentInfo) {
      entry.componentTree = step.capture.componentInfo
    }
    lines.push(JSON.stringify(entry))
  }

  // 録画
  if (result.recordingPath) {
    lines.push(JSON.stringify({ type: "recording", path: result.recordingPath }))
  }

  return lines.join("\n")
}

/** テスト結果をJSON出力 */
export function toJson(result: TestResult, fields?: string[]): string {
  if (fields && fields.length > 0) {
    return JSON.stringify(filterFields(result as unknown as Record<string, unknown>, fields), null, 2)
  }
  return JSON.stringify(result, null, 2)
}

/** --fields によるフィールドフィルタリング（コンテキストウィンドウ節約） */
function filterFields(obj: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of fields) {
    const parts = field.split(".")
    let current: unknown = obj
    for (const part of parts) {
      if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part]
      } else {
        current = undefined
        break
      }
    }
    if (current !== undefined) {
      result[field] = current
    }
  }
  return result
}

function formatObject(obj: Record<string, unknown>): string {
  try {
    const entries = Object.entries(obj)
    if (entries.length === 0) return "{}"
    const parts = entries.map(([k, v]) => `${k}: ${formatValue(v)}`)
    return `{ ${parts.join(", ")} }`
  } catch {
    return "{...}"
  }
}

function formatValue(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (typeof value === "string") {
    if (["fn", "[Circular]", "...", "{...}"].includes(value)) return value
    return `"${value}"`
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]"
    return `[${value.map(formatValue).join(", ")}]`
  }
  if (typeof value === "object") {
    return formatObject(value as Record<string, unknown>)
  }
  return String(value)
}
