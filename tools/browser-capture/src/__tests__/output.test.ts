import { describe, it, expect } from "vitest"
import { toMarkdown, toJsonl, toJson } from "../output.js"
import type { TestResult } from "../types.js"

function makeResult(overrides?: Partial<TestResult>): TestResult {
  return {
    name: "login test",
    url: "http://localhost:3000/login",
    status: "passed",
    duration: 1234,
    steps: [
      {
        stepIndex: 0,
        description: "メール入力",
        action: "fill",
        status: "passed",
        duration: 100,
      },
      {
        stepIndex: 1,
        description: "ログインボタンクリック",
        action: "click",
        status: "passed",
        duration: 200,
        capture: {
          screenshotPath: "./captures/step-1.png",
          element: {
            ref: "",
            selector: "button[type=submit]",
            tag: "button",
            text: "ログイン",
            attributes: { type: "submit", class: "btn-primary" },
          },
          frameworkInfo: { framework: "React", metaFramework: "Next.js (App Router)" },
          componentInfo: {
            framework: "react",
            hierarchy: ["App", "LoginPage", "LoginForm", "Button"],
            props: { type: "submit", disabled: false },
          },
        },
      },
    ],
    page: {
      title: "Login - My App",
      url: "http://localhost:3000/login",
      frameworkInfo: { framework: "React", metaFramework: "Next.js (App Router)" },
    },
    timestamp: "2026-03-12T00:00:00.000Z",
    ...overrides,
  }
}

describe("toMarkdown", () => {
  it("generates markdown with all sections", () => {
    const md = toMarkdown(makeResult())

    expect(md).toContain("# login test")
    expect(md).toContain("**Status**: PASSED")
    expect(md).toContain("**URL**: http://localhost:3000/login")
    expect(md).toContain("**Framework**: React")
    expect(md).toContain("**Meta Framework**: Next.js (App Router)")
    expect(md).toContain("### Step 1: メール入力")
    expect(md).toContain("[PASS]")
    expect(md).toContain("### Step 2: ログインボタンクリック")
    expect(md).toContain("**Selector**: `button[type=submit]`")
    expect(md).toContain("**Tag**: `<button>`")
    expect(md).toContain('**Text**: "ログイン"')
    expect(md).toContain("Component Tree (React)")
    expect(md).toContain("`App` → `LoginPage` → `LoginForm` → `Button`")
  })

  it("shows FAILED status", () => {
    const md = toMarkdown(makeResult({
      status: "failed",
      steps: [{
        stepIndex: 0,
        description: "failed step",
        action: "click",
        status: "failed",
        duration: 50,
        error: "Element not found",
      }],
    }))

    expect(md).toContain("**Status**: FAILED")
    expect(md).toContain("[FAIL]")
    expect(md).toContain("**Error**: Element not found")
  })

  it("includes recording path", () => {
    const md = toMarkdown(makeResult({ recordingPath: "./captures/test.webm" }))
    expect(md).toContain("Recording")
    expect(md).toContain("./captures/test.webm")
  })
})

describe("toJsonl", () => {
  it("generates JSONL with correct line types", () => {
    const jsonl = toJsonl(makeResult())
    const lines = jsonl.split("\n").map((l) => JSON.parse(l))

    expect(lines[0].type).toBe("testResult")
    expect(lines[0].name).toBe("login test")
    expect(lines[0].status).toBe("passed")

    expect(lines[1].type).toBe("pageContext")
    expect(lines[1].framework).toBe("React")

    expect(lines[2].type).toBe("stepResult")
    expect(lines[2].stepIndex).toBe(0)

    expect(lines[3].type).toBe("stepResult")
    expect(lines[3].stepIndex).toBe(1)
    expect(lines[3].screenshotPath).toBe("./captures/step-1.png")
    expect(lines[3].element.selector).toBe("button[type=submit]")
    expect(lines[3].componentTree.framework).toBe("react")
  })
})

describe("toJson", () => {
  it("generates full JSON", () => {
    const json = toJson(makeResult())
    const parsed = JSON.parse(json)
    expect(parsed.name).toBe("login test")
    expect(parsed.steps).toHaveLength(2)
  })

  it("filters fields with --fields", () => {
    const json = toJson(makeResult(), ["name", "status", "duration"])
    const parsed = JSON.parse(json)
    expect(parsed.name).toBe("login test")
    expect(parsed.status).toBe("passed")
    expect(parsed.duration).toBe(1234)
    expect(parsed.steps).toBeUndefined()
    expect(parsed.url).toBeUndefined()
  })
})
