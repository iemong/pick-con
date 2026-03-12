import * as browser from "./agent-browser.js"
import { collectComponentInfo, detectFramework, inspectElement } from "./capture.js"
import type { StepResult, TestCase, TestResult, TestStep } from "./types.js"

/** テストケースを実行 */
export async function runTestCase(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now()
  const outputDir = testCase.output?.dir ?? "./captures"
  const steps: StepResult[] = []
  let failed = false

  try {
    // ブラウザ起動 & 初期ページ
    await browser.open(testCase.url, {
      headed: testCase.browser?.headed,
      device: testCase.browser?.device,
      viewport: testCase.browser?.viewport,
      colorScheme: testCase.browser?.colorScheme,
    })
    await browser.waitForNetworkIdle()

    // 録画開始
    if (testCase.record) {
      const recordPath = `${outputDir}/${sanitize(testCase.name)}-${Date.now()}.webm`
      await browser.recordStart(recordPath)
    }

    // ステップ実行
    for (let i = 0; i < testCase.steps.length; i++) {
      const step = testCase.steps[i]
      const stepResult = await executeStep(step, i, outputDir)
      steps.push(stepResult)

      if (stepResult.status === "failed") {
        failed = true
        // 失敗したら以降のステップをスキップ
        for (let j = i + 1; j < testCase.steps.length; j++) {
          steps.push({
            stepIndex: j,
            description: testCase.steps[j].description,
            action: testCase.steps[j].action,
            status: "skipped",
            duration: 0,
          })
        }
        break
      }
    }

    // 録画停止
    let recordingPath: string | undefined
    if (testCase.record) {
      await browser.recordStop()
      recordingPath = `${outputDir}/${sanitize(testCase.name)}-${startTime}.webm`
    }

    // ページ情報取得
    const [title, url, frameworkInfo] = await Promise.all([
      browser.getTitle().catch(() => ""),
      browser.getUrl().catch(() => testCase.url),
      detectFramework().catch(() => null),
    ])

    return {
      name: testCase.name,
      url: testCase.url,
      status: failed ? "failed" : "passed",
      duration: Date.now() - startTime,
      steps,
      recordingPath,
      page: { title, url, frameworkInfo },
      timestamp: new Date().toISOString(),
    }
  } finally {
    await browser.close().catch(() => {})
  }
}

/** 個別ステップを実行 */
async function executeStep(
  step: TestStep,
  index: number,
  outputDir: string
): Promise<StepResult> {
  const startTime = Date.now()

  try {
    // アクション実行
    switch (step.action) {
      case "navigate":
        await browser.open(step.target)
        break
      case "click":
        await browser.click(step.target)
        break
      case "fill":
        await browser.fill(step.target, step.value ?? "")
        break
      case "hover":
        await browser.hover(step.target)
        break
      case "press":
        await browser.press(step.value ?? step.target)
        break
      case "scroll":
        await browser.scroll(step.target, step.value ? Number(step.value) : undefined)
        break
      case "wait":
        await executeWait(step)
        break
      case "assert":
        await executeAssert(step)
        break
      case "capture":
        // capture は操作なし、下のキャプチャーブロックで処理
        break
    }

    // 待機条件
    if (step.waitFor) {
      if (step.waitFor.networkIdle) {
        await browser.waitForNetworkIdle()
      }
      if (step.waitFor.selector) {
        await browser.wait(step.waitFor.selector, { timeout: step.waitFor.timeout })
      }
      if (step.waitFor.text) {
        await browser.waitForText(step.waitFor.text, { timeout: step.waitFor.timeout })
      }
      if (step.waitFor.url) {
        await browser.waitForUrl(step.waitFor.url, { timeout: step.waitFor.timeout })
      }
    }

    // キャプチャー
    let capture: StepResult["capture"]
    if (step.capture || step.action === "capture") {
      const captureSelector = step.capture?.selector ?? step.target
      capture = {}

      if (step.capture?.screenshot !== false) {
        const path = `${outputDir}/step-${index}-${Date.now()}.png`
        capture.screenshotPath = await browser.screenshot(path, {
          full: step.capture?.fullPage,
        })
      }

      // 要素情報取得（captureやCSSセレクタ系のみ）
      if (captureSelector && !captureSelector.startsWith("@")) {
        const [element, frameworkInfo] = await Promise.all([
          inspectElement(captureSelector).catch(() => null),
          detectFramework().catch(() => null),
        ])
        capture.element = element ?? undefined
        capture.frameworkInfo = frameworkInfo

        if (element) {
          capture.componentInfo = await collectComponentInfo(captureSelector).catch(() => null)
        }
      }
    }

    return {
      stepIndex: index,
      description: step.description,
      action: step.action,
      status: "passed",
      duration: Date.now() - startTime,
      capture,
    }
  } catch (e) {
    return {
      stepIndex: index,
      description: step.description,
      action: step.action,
      status: "failed",
      duration: Date.now() - startTime,
      error: (e as Error).message,
    }
  }
}

/** wait ステップ実行 */
async function executeWait(step: TestStep): Promise<void> {
  if (step.waitFor?.selector) {
    await browser.wait(step.waitFor.selector, { timeout: step.waitFor.timeout })
  } else if (step.waitFor?.text) {
    await browser.waitForText(step.waitFor.text, { timeout: step.waitFor.timeout })
  } else if (step.waitFor?.url) {
    await browser.waitForUrl(step.waitFor.url, { timeout: step.waitFor.timeout })
  } else if (step.waitFor?.networkIdle) {
    await browser.waitForNetworkIdle()
  } else {
    // target をセレクタとして待機
    await browser.wait(step.target, { timeout: step.waitFor?.timeout })
  }
}

/** assert ステップ実行 */
async function executeAssert(step: TestStep): Promise<void> {
  if (!step.assert) throw new Error("assert requires assert configuration")

  switch (step.assert.type) {
    case "visible": {
      const visible = await browser.isVisible(step.target)
      if (!visible) throw new Error(`Expected ${step.target} to be visible`)
      break
    }
    case "hidden": {
      const visible = await browser.isVisible(step.target)
      if (visible) throw new Error(`Expected ${step.target} to be hidden`)
      break
    }
    case "text": {
      const text = await browser.getText(step.target)
      if (step.assert.expected && !text.includes(String(step.assert.expected))) {
        throw new Error(
          `Expected text "${step.assert.expected}" in ${step.target}, got "${text.slice(0, 100)}"`
        )
      }
      break
    }
    case "url": {
      const url = await browser.getUrl()
      if (step.assert.expected && !url.includes(String(step.assert.expected))) {
        throw new Error(`Expected URL to contain "${step.assert.expected}", got "${url}"`)
      }
      break
    }
    case "title": {
      const title = await browser.getTitle()
      if (step.assert.expected && !title.includes(String(step.assert.expected))) {
        throw new Error(`Expected title to contain "${step.assert.expected}", got "${title}"`)
      }
      break
    }
  }
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50)
}
