# pick-con

Webページ上の要素を選択し、そのコンテキスト情報（要素情報、フレームワーク、コンポーネント階層など）をMarkdown形式で生成するChrome拡張機能です。

生成したMarkdownとスクリーンショットをクリップボードにコピーし、AIエディタ（Claude Code、Cursorなど）に貼り付けて活用できます。

## 機能

- ページ上の要素をクリックして選択
- 選択要素のHTML情報（タグ、属性、テキスト）を取得
- React / Vue のコンポーネント階層・Props・Stateを自動検出
- Next.js / Nuxt などのメタフレームワークを検出
- 選択要素がハイライトされた状態のスクリーンショットを撮影
- Markdown + スクリーンショットをまとめてクリップボードにコピー

## 導入方法

### ビルド済みを使う（推奨）

1. このリポジトリをクローン

   ```bash
   git clone https://github.com/iemong/pick-con.git
   ```

2. Chromeで `chrome://extensions` を開く

3. 右上の「デベロッパーモード」を有効にする

4. 「パッケージ化されていない拡張機能を読み込む」をクリック

5. クローンしたリポジトリ内の `build/chrome-mv3-prod` フォルダを選択

### ソースからビルドする場合

```bash
git clone https://github.com/iemong/pick-con.git
cd pick-con
pnpm install
pnpm build
```

ビルド後、上記と同様に `build/chrome-mv3-prod` を Chrome に読み込んでください。

## 使い方

1. 任意のWebページで拡張機能アイコンをクリック（カーソルが十字に変わります）
2. 調べたい要素にマウスを合わせるとハイライト表示されます
3. 要素をクリックして選択すると、スクリーンショットが撮影されパネルが表示されます
4. 必要に応じて指示テキストを入力します
5. コピーボタンをクリック
   - **Copy with Screenshot** — Markdown + スクリーンショット画像をまとめてコピー
   - **Copy Markdown Only** — Markdownテキストのみコピー
6. AIエディタに貼り付けて活用してください
7. `Esc` キーでパネルを閉じます

## 出力例

「Copy with Screenshot」ではスクリーンショット画像と以下のMarkdownが同時にクリップボードにコピーされます。AIエディタに貼り付けると、画像とテキストの両方が渡されます。

### React (Next.js) サイトの場合

```markdown
## User Instruction
この保存ボタンをクリックしたらconfirmダイアログを表示するようにしたい

## Page Context
- **URL**: https://example.com/dashboard/settings
- **Framework**: React
- **Meta Framework**: Next.js (App Router)
- **Page Title**: 設定 | Example App

## Selected Element
- **Selector**: `#settings-form > div:nth-child(2) > button.btn-primary`
- **Tag**: `<button>`
- **Text**: "保存する"
- **Attributes**:
  - class: `btn btn-primary px-4 py-2`
  - data-testid: `settings-submit-btn`
  - type: `submit`

## Component Tree (React)
- `SettingsPage` → `SettingsForm` → `SubmitButton`
- **Props**: `{ variant: "primary", disabled: false, onClick: fn }`
- **State**: `{ isSubmitting: false }`
```

### フレームワーク未検出の静的サイトの場合

フレームワークが検出されない場合、Component Tree セクションは省略されます。

```markdown
## User Instruction
このリンクの遷移先を /members/tanaka/profile に変更したい

## Page Context
- **URL**: https://corporate.example.com/about
- **Page Title**: 会社概要 | Example Corp

## Selected Element
- **Selector**: `.about-section > .team-list > li:nth-child(3) > a`
- **Tag**: `<a>`
- **Text**: "田中太郎"
- **Attributes**:
  - class: `team-member__link`
  - href: `/members/tanaka`
```

## 対応フレームワーク

| フレームワーク | 検出内容 |
|---|---|
| React | コンポーネント階層、Props、State（Hooks） |
| Vue 2 / 3 | コンポーネント階層、Props、Data |
| Next.js | App Router / Pages Router の検出 |
| Nuxt | フレームワーク検出 |

## 開発

```bash
pnpm dev        # 開発モード（ホットリロード対応）
pnpm build      # 本番ビルド
pnpm package    # ZIP パッケージ化（配布用）
```
