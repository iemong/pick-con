#!/usr/bin/env node

/**
 * @tegakari/browser-capture - Agent-first browser testing & capture CLI
 *
 * 設計原則（参考: "You Need to Rewrite Your CLI for AI Agents"）:
 * - JSON入力 > フラグ（エージェントはネスト構造を扱える）
 * - --describe でランタイムスキーマ自己記述
 * - --dry-run で安全にステップ確認
 * - --fields でコンテキストウィンドウ節約
 * - --output json がデフォルト（機械可読）
 */

import { readFile, writeFile, mkdir } from "node:fs/promises"
import { resolve } from "node:path"
import { runTestCase } from "./runner.js"
import { toJson, toJsonl, toMarkdown } from "./output.js"
import { getSchema } from "./schema.js"
import type { TestCase } from "./types.js"

const HELP = `
@tegakari/browser-capture - Agent-first browser testing & capture tool

Usage:
  browser-capture run [options]        テストケースを実行
  browser-capture describe [command]   コマンドスキーマを表示（エージェント用）

Run Options:
  --json <json>       テストケースJSON（インライン）
  --file <path>       テストケースJSONファイル
  --stdin             標準入力からJSON読み込み
  --format <fmt>      出力形式: json（デフォルト）/ markdown / jsonl
  --fields <f1,f2>    出力フィールド制限（コンテキストウィンドウ節約）
  --dry-run           実行せずステップを表示
  --output-dir <dir>  出力ディレクトリ（デフォルト: ./captures）
  -h, --help          ヘルプ

Design:
  Claude Codeで自然言語のテストケースを書く
  → このツールが構造化JSONに変換して受け取る
  → agent-browserで実行、動画/スクリーンショットをキャプチャー
  → 結果をtegakari互換形式で返す

Example (Claude Code workflow):
  # Claude Codeに自然言語で指示:
  # 「localhost:3000のログインページで、メールとパスワードを入力してログインボタンを押し、
  #   ダッシュボードに遷移することを確認して」
  #
  # → Claude Codeがテストケースに変換:
  browser-capture run --json '{
    "name": "ログインテスト",
    "url": "http://localhost:3000/login",
    "steps": [
      {"description": "メール入力", "action": "fill", "target": "input[name=email]", "value": "test@example.com"},
      {"description": "パスワード入力", "action": "fill", "target": "input[name=password]", "value": "pass123"},
      {"description": "ログイン", "action": "click", "target": "button[type=submit]", "capture": {"screenshot": true}},
      {"description": "遷移確認", "action": "assert", "target": "h1", "assert": {"type": "text", "expected": "Dashboard"}}
    ],
    "record": true
  }'
`.trim()

interface CliArgs {
  command: string
  json?: string
  file?: string
  stdin: boolean
  format: "json" | "markdown" | "jsonl"
  fields?: string[]
  dryRun: boolean
  outputDir: string
  describeTarget?: string
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2)

  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log(HELP)
    process.exit(0)
  }

  const command = args[0]

  const result: CliArgs = {
    command,
    stdin: false,
    format: "json",
    dryRun: false,
    outputDir: "./captures",
  }

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case "--json":
        result.json = args[++i]
        break
      case "--file":
        result.file = args[++i]
        break
      case "--stdin":
        result.stdin = true
        break
      case "--format":
        result.format = args[++i] as CliArgs["format"]
        break
      case "--fields":
        result.fields = args[++i].split(",")
        break
      case "--dry-run":
        result.dryRun = true
        break
      case "--output-dir":
        result.outputDir = args[++i]
        break
      default:
        // describe コマンドの引数
        if (command === "describe" && !args[i].startsWith("-")) {
          result.describeTarget = args[i]
        }
        break
    }
  }

  return result
}

async function readTestCase(args: CliArgs): Promise<TestCase> {
  let raw: string

  if (args.json) {
    raw = args.json
  } else if (args.file) {
    raw = await readFile(args.file, "utf-8")
  } else if (args.stdin) {
    const chunks: Buffer[] = []
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer)
    }
    raw = Buffer.concat(chunks).toString("utf-8")
  } else {
    throw new Error("テストケースを指定してください: --json, --file, --stdin のいずれか")
  }

  const testCase = JSON.parse(raw) as TestCase

  // 入力バリデーション（エージェントのハルシネーション対策）
  if (!testCase.name) throw new Error("テストケースに name が必要です")
  if (!testCase.url) throw new Error("テストケースに url が必要です")
  if (!testCase.steps || testCase.steps.length === 0) {
    throw new Error("テストケースに steps が必要です（1つ以上）")
  }

  // URL バリデーション
  try {
    new URL(testCase.url)
  } catch {
    throw new Error(`無効なURL: ${testCase.url}`)
  }

  // 各ステップのバリデーション
  const validActions = ["navigate", "click", "fill", "hover", "press", "scroll", "wait", "assert", "capture"]
  for (let i = 0; i < testCase.steps.length; i++) {
    const step = testCase.steps[i]
    if (!step.description) throw new Error(`Step ${i}: description が必要です`)
    if (!validActions.includes(step.action)) {
      throw new Error(`Step ${i}: 無効なaction "${step.action}"。有効値: ${validActions.join(", ")}`)
    }
    if (!step.target) throw new Error(`Step ${i}: target が必要です`)
  }

  // 出力設定をCLI引数で上書き
  testCase.output = {
    ...testCase.output,
    format: args.format,
    dir: args.outputDir,
    fields: args.fields ?? testCase.output?.fields,
  }

  return testCase
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv)

  try {
    switch (args.command) {
      case "run": {
        const testCase = await readTestCase(args)

        // --dry-run: 実行せずステップ表示
        if (args.dryRun) {
          const plan = {
            name: testCase.name,
            url: testCase.url,
            browser: testCase.browser,
            record: testCase.record,
            steps: testCase.steps.map((s, i) => ({
              step: i + 1,
              description: s.description,
              action: s.action,
              target: s.target,
              value: s.value,
              waitFor: s.waitFor,
              capture: s.capture,
              assert: s.assert,
            })),
          }
          console.log(JSON.stringify(plan, null, 2))
          return
        }

        // テスト実行
        const result = await runTestCase(testCase)

        // 出力生成
        const format = testCase.output?.format ?? "json"
        let output: string
        switch (format) {
          case "markdown":
            output = toMarkdown(result)
            break
          case "jsonl":
            output = toJsonl(result)
            break
          default:
            output = toJson(result, testCase.output?.fields)
            break
        }

        // ファイル保存
        const dir = testCase.output?.dir ?? "./captures"
        await mkdir(dir, { recursive: true })
        const ext = format === "jsonl" ? "jsonl" : format === "markdown" ? "md" : "json"
        const path = resolve(dir, `${sanitize(testCase.name)}-${Date.now()}.${ext}`)
        await writeFile(path, output, "utf-8")

        // 結果出力（stdout）
        console.log(output)

        // 終了コード
        process.exit(result.status === "passed" ? 0 : 1)
        break
      }

      case "describe": {
        console.log(getSchema(args.describeTarget))
        break
      }

      default:
        console.error(`Unknown command: ${args.command}`)
        console.log(HELP)
        process.exit(1)
    }
  } catch (e) {
    // 機械可読エラー出力
    const error = {
      error: true,
      message: (e as Error).message,
      type: (e as Error).constructor.name,
    }
    console.error(JSON.stringify(error))
    process.exit(1)
  }
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50)
}

main()
