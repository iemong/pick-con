# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tegakari は、Webページ上の要素を選択し、そのコンテキスト情報（要素情報、フレームワーク、コンポーネント階層など）をMarkdownまたはJSONL形式で生成するChrome拡張機能。生成したテキストとスクリーンショットをクリップボードにコピーし、AIエディタ（Claude Code, Cursorなど）で活用することを目的とする。

## Commands

```bash
pnpm dev        # 開発モード（Plasmo dev server起動、ホットリロード対応）
pnpm build      # 本番ビルド（build/chrome-mv3-prod/に出力）
pnpm package    # ZIPパッケージ化（配布用）
```

パッケージマネージャーは **pnpm** を使用。テストフレームワーク・リンターは未導入。

## Architecture

Plasmoフレームワーク（Manifest V3）ベースのChrome拡張機能。3つの実行コンテキストが`window.postMessage`とChrome Runtime APIで連携する。

### 実行コンテキストと通信フロー

```
Background (Service Worker)
  │  chrome.tabs.sendMessage({ type: "TEGAKARI_TOGGLE" })
  │  chrome.tabs.captureVisibleTab() ← スクリーンショット撮影
  ▼
Content Script - Isolated World (overlay.tsx)
  │  UI描画・要素選択・ハイライト・アノテーション管理
  │  window.postMessage({ type: "TEGAKARI_COLLECT", selector })
  ▼
Content Script - Main World (main-world.ts)
  │  フレームワーク検出・コンポーネント情報収集
  │  window.postMessage({ type: "TEGAKARI_RESULT", framework, component })
  ▼
Content Script - Isolated World
    JSONL/Markdown生成 → クリップボードコピー
```

- **Background** (`src/background.ts`): 拡張アイコンクリック→TEGAKARI_TOGGLEを中継。TEGAKARI_CAPTUREリクエストでスクリーンショット撮影（`chrome.tabs.captureVisibleTab`）
- **Isolated World** (`src/contents/overlay.tsx`): React製オーバーレイUI。要素選択、ハイライト、アノテーション管理、出力生成を担当。状態管理はuseStateで完結
- **Main World** (`src/contents/main-world.ts`): ページのJSコンテキストに注入され、フレームワークのグローバル変数やReact Fiber/Vue内部構造にアクセス。Plasmoの`"world": "MAIN"`設定で実現

### メッセージ型

| メッセージ | 経路 | 用途 |
|-----------|------|------|
| `TEGAKARI_TOGGLE` | Background → Isolated World (chrome.runtime) | 拡張ON/OFF切替 |
| `TEGAKARI_CAPTURE` | Isolated World → Background (chrome.runtime) | スクリーンショット要求 |
| `TEGAKARI_COLLECT` | Isolated World → Main World (postMessage) | 要素のフレームワーク情報収集要求 |
| `TEGAKARI_RESULT` | Main World → Isolated World (postMessage) | フレームワーク・コンポーネント情報の返却 |

### 主要モジュール（src/lib/）

| モジュール | 役割 |
|-----------|------|
| `framework-detector.ts` | React, Vue, Next.js, Nuxtの検出（グローバル変数・DOM要素ベース） |
| `react-collector.ts` | React Fiberからコンポーネント階層・Props・State（Hooks経由）を収集 |
| `vue-collector.ts` | Vue 2/3の内部構造からコンポーネント情報を収集 |
| `selector.ts` | 要素からユニークなCSSセレクターを生成（ID → クラス → nth-child フォールバック） |
| `markdown-generator.ts` | 収集情報をMarkdown形式にフォーマット（単体・バッチ両対応） |
| `jsonl-generator.ts` | 収集情報をJSONL形式にフォーマット（単体・バッチ両対応） |
| `theme.ts` | ダーク/ライトテーマ定義、ThemeContext、`chrome.storage.local`で永続化 |
| `types.ts` | メッセージ型・Annotation・BatchInput等の型定義 |

### UIコンポーネント（src/components/）

- `AnnotationPanel.tsx`: マルチ要素アノテーション一覧パネル（右上固定）。指示テキスト編集、フォーマット切替（JSONL/Markdown）、一括コピー、テーマ切替
- `AnnotationPin.tsx`: 各アノテーションの番号付きピン（クリック位置に配置）。ポップオーバーで指示テキスト編集
- `HighlightBox.tsx`: マウスオーバー時の要素ハイライト表示
- `Panel.tsx`: レガシー。単体要素の検査結果パネル（現在はAnnotationPanelに置き換え）

### マルチ要素アノテーション

メインのワークフロー。複数要素を順次クリックしてアノテーション（ID付き）を収集し、一括でエクスポートする。

- **Annotation型**: ID、ElementInfo、FrameworkInfo、ComponentInfo、instruction（ユーザー指示）、クリック座標を保持
- **非同期フレームワーク収集**: 要素クリック→Annotation即時作成→Main Worldへフレームワーク情報を非同期リクエスト（`pendingIdRef`で対応するAnnotationを追跡）→結果受信でAnnotation更新
- **出力形式**: JSONL（デフォルト）またはMarkdown。バッチ出力ではPage Contextを共有し、各Annotationを個別セクションとして出力

### テーマシステム

- ダーク（デフォルト）/ ライトモード。クールブルー（`#2563eb`）をアクセントカラーとして使用
- `ThemeContext`経由で全コンポーネントに配布、`useTheme()`フックでアクセス
- `chrome.storage.local`（キー: `tegakariTheme`）で永続化

## Key Technical Details

- **Isolated World と Main World の分離**: Content ScriptはIsolated Worldで動作するため、ページのフレームワーク情報にアクセスするにはMain World注入が必須
- **安全なシリアライズ**: React Fiber/Vue内部オブジェクトは循環参照を含むため、深度制限（最大3階層）・キー数制限（最大20）・配列要素制限（最大10）を適用してシリアライズ
- **出力仕様**: `docs/output-spec.md` にMarkdown/JSONL出力形式の詳細仕様が定義されている。変更時は参照必須
- **UIイベント分離**: オーバーレイUI上のクリックがページ要素のアノテーション作成を誤発火しないよう、`e.stopPropagation()`とdata属性チェックで制御
