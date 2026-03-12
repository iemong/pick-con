// Public API - プログラマティックに使う場合
export { runTestCase } from "./runner.js"
export { toMarkdown, toJsonl, toJson } from "./output.js"
export { getSchema } from "./schema.js"
export { detectFramework, collectComponentInfo, inspectElement } from "./capture.js"
export * as browser from "./agent-browser.js"
export type {
  TestCase,
  TestStep,
  TestResult,
  StepResult,
  CapturedElement,
  FrameworkInfo,
  ComponentInfo,
  CommandSchema,
} from "./types.js"
