# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

pick-con は、Webページ上の要素を選択し、そのコンテキスト情報（要素情報、フレームワーク、コンポーネント階層など）をMarkdown形式で生成するChrome拡張機能。生成したMarkdownをクリップボードにコピーし、AIエディタ（Claude Code, Cursorなど）で活用することを目的とする。

## Commands

```bash
pnpm dev        # 開発モード（Plasmo dev server起動）
pnpm build      # 本番ビルド（build/chrome-mv3-prod/に出力）
pnpm package    # ZIPパッケージ化（配布用）
```

パッケージマネージャーは **pnpm** を使用。

## Architecture

Plasmoフレームワーク（Manifest V3）ベースのChrome拡張機能。3つの実行コンテキストが`postMessage`とChrome Runtime APIで連携する。

### 実行コンテキストと通信フロー

```
Background (Service Worker)
  │  chrome.tabs.sendMessage({ type: "PICK_CON_TOGGLE" })
  ▼
Content Script - Isolated World (overlay.tsx)
  │  UI描画・要素選択・ハイライト表示
  │  window.postMessage({ type: "PICK_CON_COLLECT", selector })
  ▼
Content Script - Main World (main-world.ts)
  │  フレームワーク検出・コンポーネント情報収集
  │  window.postMessage({ type: "PICK_CON_RESULT", framework, component })
  ▼
Content Script - Isolated World
    Markdown生成 → クリップボードコピー
```

- **Background** (`src/background.ts`): 拡張アイコンクリックイベントをContent Scriptに中継
- **Isolated World** (`src/contents/overlay.tsx`): React製オーバーレイUI。要素選択、ハイライト、パネル表示、Markdown生成を担当
- **Main World** (`src/contents/main-world.ts`): ページのJSコンテキストに注入され、フレームワークのグローバル変数やReact Fiber/Vue内部構造にアクセス

### 主要モジュール（src/lib/）

| モジュール | 役割 |
|-----------|------|
| `framework-detector.ts` | React, Vue, Next.js, Nuxtの検出（グローバル変数・DOM要素ベース） |
| `react-collector.ts` | React Fiberからコンポーネント階層・Props・State（Hooks経由）を収集 |
| `vue-collector.ts` | Vue 2/3の内部構造からコンポーネント情報を収集 |
| `selector.ts` | 要素からユニークなCSSセレクターを生成（ID → クラス → nth-child フォールバック） |
| `markdown-generator.ts` | 収集情報をMarkdown形式にフォーマット（深度制限・循環参照検出付き） |
| `types.ts` | メッセージ型・データ構造の型定義 |

### UIコンポーネント（src/components/）

- `Panel.tsx`: 検査結果表示パネル（Catppuccin Darkテーマ、右上固定配置）
- `HighlightBox.tsx`: マウスオーバー時の要素ハイライト表示

## Key Technical Details

- **Isolated World と Main World の分離**: Content ScriptはIsolated Worldで動作するため、ページのフレームワーク情報にアクセスするにはMain World注入（`main-world.ts`）が必須。Plasmoの`"world": "MAIN"`設定で実現。
- **安全なシリアライズ**: React Fiber/Vue内部オブジェクトは循環参照を含むため、深度制限（最大3階層）・キー数制限（最大20）・配列要素制限（最大10）を適用してシリアライズ。
- **出力仕様**: `docs/output-spec.md` にMarkdown出力形式の詳細仕様が定義されている。変更時は参照必須。
