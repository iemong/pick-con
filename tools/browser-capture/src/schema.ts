import type { CommandSchema } from "./types.js"

/** --describe で出力されるスキーマ（エージェントが実行時に参照） */
export const SCHEMAS: Record<string, CommandSchema> = {
  run: {
    name: "run",
    description: "テストケースJSON を受け取り、agent-browser で実行。各ステップでスクリーンショット・要素情報・フレームワーク情報をキャプチャーし、結果を出力する。",
    input: {
      type: "json",
      schema: {
        type: "object",
        required: ["name", "url", "steps"],
        properties: {
          name: { type: "string", description: "テスト名" },
          description: { type: "string", description: "テスト説明（自然言語）" },
          url: { type: "string", description: "開始URL" },
          browser: {
            type: "object",
            properties: {
              device: { type: "string", description: "デバイス名 (例: 'iPhone 14')" },
              viewport: {
                type: "object",
                properties: {
                  width: { type: "number" },
                  height: { type: "number" },
                },
              },
              headed: { type: "boolean", description: "ブラウザ表示" },
              colorScheme: { enum: ["light", "dark"] },
            },
          },
          steps: {
            type: "array",
            items: {
              type: "object",
              required: ["description", "action", "target"],
              properties: {
                description: { type: "string", description: "ステップ説明" },
                action: {
                  enum: ["navigate", "click", "fill", "hover", "press", "scroll", "wait", "assert", "capture"],
                },
                target: { type: "string", description: "CSSセレクタ, @ref, URL" },
                value: { type: "string", description: "入力値" },
                waitFor: {
                  type: "object",
                  properties: {
                    selector: { type: "string" },
                    text: { type: "string" },
                    url: { type: "string" },
                    networkIdle: { type: "boolean" },
                    timeout: { type: "number" },
                  },
                },
                capture: {
                  type: "object",
                  properties: {
                    screenshot: { type: "boolean", default: true },
                    fullPage: { type: "boolean" },
                    selector: { type: "string" },
                  },
                },
                assert: {
                  type: "object",
                  properties: {
                    type: { enum: ["visible", "hidden", "text", "url", "title", "count"] },
                    expected: { description: "期待値" },
                  },
                },
              },
            },
          },
          record: { type: "boolean", description: "動画録画" },
          output: {
            type: "object",
            properties: {
              format: { enum: ["markdown", "jsonl", "json"], default: "json" },
              dir: { type: "string", default: "./captures" },
              fields: { type: "array", items: { type: "string" }, description: "出力フィールド制限" },
            },
          },
        },
      },
    },
    output: {
      formats: ["json", "markdown", "jsonl"],
    },
    examples: [
      {
        description: "ログインフォームのテスト",
        command: 'browser-capture run --json \'{"name":"login test","url":"http://localhost:3000/login","steps":[{"description":"メールアドレスを入力","action":"fill","target":"input[name=email]","value":"test@example.com"},{"description":"パスワードを入力","action":"fill","target":"input[name=password]","value":"password123"},{"description":"ログインボタンをクリック","action":"click","target":"button[type=submit]","capture":{"screenshot":true}},{"description":"ダッシュボードに遷移したことを確認","action":"assert","target":"h1","assert":{"type":"text","expected":"Dashboard"}}]}\'',
      },
      {
        description: "ファイルからテストケースを読み込み",
        command: "browser-capture run --file test-login.json --format markdown",
      },
      {
        description: "dry-run でステップを確認",
        command: "browser-capture run --file test-login.json --dry-run",
      },
    ],
  },
  describe: {
    name: "describe",
    description: "コマンドのスキーマ情報を出力する。エージェントがランタイムで参照用。",
    input: { type: "flags" },
    output: { formats: ["json"] },
    examples: [
      {
        description: "runコマンドのスキーマを表示",
        command: "browser-capture describe run",
      },
      {
        description: "全コマンドのスキーマを表示",
        command: "browser-capture describe",
      },
    ],
  },
}

export function getSchema(command?: string): string {
  if (command && SCHEMAS[command]) {
    return JSON.stringify(SCHEMAS[command], null, 2)
  }
  return JSON.stringify(SCHEMAS, null, 2)
}
