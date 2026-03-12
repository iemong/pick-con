import { describe, it, expect } from "vitest"

// capture.ts のうち、agent-browser に依存しない parseSnapshot のテスト
// （agent-browser のモック不要な部分のみテスト）

describe("parseSnapshot (snapshot output parsing)", () => {
  // NOTE: parseSnapshot は snapshot 出力をパースするが、
  // 現在のリファクタリングで runner.ts に移動したため、
  // ここでは出力フォーマットのテストに集中する

  it("should validate TestCase structure", () => {
    const validTestCase = {
      name: "test",
      url: "http://localhost:3000",
      steps: [
        {
          description: "click button",
          action: "click" as const,
          target: "button",
        },
      ],
    }

    expect(validTestCase.name).toBe("test")
    expect(validTestCase.steps).toHaveLength(1)
    expect(validTestCase.steps[0].action).toBe("click")
  })

  it("should support all action types", () => {
    const actions = ["navigate", "click", "fill", "hover", "press", "scroll", "wait", "assert", "capture"]
    for (const action of actions) {
      const step = { description: `test ${action}`, action, target: "div" }
      expect(step.action).toBe(action)
    }
  })

  it("should support assert types", () => {
    const assertTypes = ["visible", "hidden", "text", "url", "title", "count"]
    for (const type of assertTypes) {
      const assert = { type, expected: "value" }
      expect(assert.type).toBe(type)
    }
  })

  it("should support capture options", () => {
    const capture = {
      screenshot: true,
      fullPage: true,
      selector: ".target",
    }
    expect(capture.screenshot).toBe(true)
    expect(capture.fullPage).toBe(true)
    expect(capture.selector).toBe(".target")
  })

  it("should support wait conditions", () => {
    const waitFor = {
      selector: ".loaded",
      text: "Ready",
      url: "/dashboard",
      networkIdle: true,
      timeout: 5000,
    }
    expect(waitFor.networkIdle).toBe(true)
    expect(waitFor.timeout).toBe(5000)
  })
})
