import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

const AGENT_BROWSER = "agent-browser"

export interface ExecResult {
  stdout: string
  stderr: string
}

/** agent-browser コマンドを実行 */
export async function exec(
  args: string[],
  options?: { timeout?: number; env?: Record<string, string> }
): Promise<ExecResult> {
  const env = { ...process.env, ...options?.env }
  const timeout = options?.timeout ?? 30_000

  const result = await execFileAsync(AGENT_BROWSER, args, {
    timeout,
    env,
    maxBuffer: 10 * 1024 * 1024,
  })

  return { stdout: result.stdout, stderr: result.stderr ?? "" }
}

/** ページを開く */
export async function open(
  url: string,
  options?: {
    headed?: boolean
    device?: string
    viewport?: { width: number; height: number }
    colorScheme?: "light" | "dark"
  }
): Promise<void> {
  const args = ["open", url]
  const env: Record<string, string> = {}

  if (options?.headed) {
    env.AGENT_BROWSER_HEADED = "1"
  }
  if (options?.colorScheme) {
    env.AGENT_BROWSER_COLOR_SCHEME = options.colorScheme
  }

  await exec(args, { env })

  if (options?.device) {
    await exec(["set", "device", options.device])
  }
  if (options?.viewport) {
    await exec(["set", "viewport", String(options.viewport.width), String(options.viewport.height)])
  }
}

/** スナップショット取得 */
export async function snapshot(interactive = true): Promise<string> {
  const args = ["snapshot"]
  if (interactive) args.push("-i")
  const result = await exec(args)
  return result.stdout
}

/** スクリーンショット撮影 */
export async function screenshot(
  path?: string,
  options?: { full?: boolean; annotate?: boolean }
): Promise<string> {
  const args = ["screenshot"]
  if (options?.full) args.push("--full")
  if (options?.annotate) args.push("--annotate")
  if (path) args.push(path)
  const result = await exec(args)
  return path ?? result.stdout.trim()
}

/** 録画開始 */
export async function recordStart(path: string): Promise<void> {
  await exec(["record", "start", path])
}

/** 録画停止 */
export async function recordStop(): Promise<void> {
  await exec(["record", "stop"])
}

/** 要素クリック */
export async function click(target: string): Promise<void> {
  await exec(["click", target])
}

/** 要素にテキスト入力 */
export async function fill(target: string, text: string): Promise<void> {
  await exec(["fill", target, text])
}

/** ホバー */
export async function hover(target: string): Promise<void> {
  await exec(["hover", target])
}

/** キー押下 */
export async function press(key: string): Promise<void> {
  await exec(["press", key])
}

/** スクロール */
export async function scroll(direction: string, amount?: number): Promise<void> {
  const args = ["scroll", direction]
  if (amount !== undefined) args.push(String(amount))
  await exec(args)
}

/** テキスト取得 */
export async function getText(target: string): Promise<string> {
  const result = await exec(["get", "text", target])
  return result.stdout.trim()
}

/** 現在のURL取得 */
export async function getUrl(): Promise<string> {
  const result = await exec(["get", "url"])
  return result.stdout.trim()
}

/** ページタイトル取得 */
export async function getTitle(): Promise<string> {
  const result = await exec(["get", "title"])
  return result.stdout.trim()
}

/** JavaScript実行 */
export async function evaluate(code: string): Promise<string> {
  const result = await exec(["eval", code])
  return result.stdout.trim()
}

/** 要素の表示確認 */
export async function isVisible(target: string): Promise<boolean> {
  const result = await exec(["is", "visible", target])
  return result.stdout.trim().toLowerCase() === "true"
}

/** 要素の表示待機 */
export async function wait(
  target: string,
  options?: { timeout?: number }
): Promise<void> {
  await exec(["wait", target], { timeout: options?.timeout ?? 30_000 })
}

/** テキスト待機 */
export async function waitForText(
  text: string,
  options?: { timeout?: number }
): Promise<void> {
  await exec(["wait", "--text", text], { timeout: options?.timeout ?? 30_000 })
}

/** URL待機 */
export async function waitForUrl(
  pattern: string,
  options?: { timeout?: number }
): Promise<void> {
  await exec(["wait", "--url", pattern], { timeout: options?.timeout ?? 30_000 })
}

/** ネットワークアイドル待機 */
export async function waitForNetworkIdle(): Promise<void> {
  await exec(["wait", "--load", "networkidle"])
}

/** スナップショット差分 */
export async function diffSnapshot(): Promise<string> {
  const result = await exec(["diff", "snapshot"])
  return result.stdout
}

/** ブラウザ終了 */
export async function close(): Promise<void> {
  await exec(["close"])
}
