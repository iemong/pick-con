# tegakari

Webページ上の要素を選択し、そのコンテキスト情報（要素情報、フレームワーク、コンポーネント階層など）をMarkdownまたはJSONL形式で生成するChrome拡張機能です。

生成したテキストをクリップボードにコピーし、AIエディタ（Claude Code、Cursorなど）に貼り付けて活用できます。

## 機能

- ページ上の複数要素をクリックして選択・アノテーション
- 選択要素にピンマーカーを表示し、各要素に指示テキストを入力可能
- 選択要素のHTML情報（タグ、属性、テキスト）を取得
- React / Vue のコンポーネント階層・Props・Stateを自動検出
- Next.js / Nuxt などのメタフレームワークを検出
- JSONL / Markdown 形式を切り替えてクリップボードにコピー
- Dark / Light テーマ切り替え対応

## 導入方法

### ビルド済みを使う（推奨）

1. このリポジトリをクローン

   ```bash
   git clone https://github.com/iemong/tegakari.git
   ```

2. Chromeで `chrome://extensions` を開く

3. 右上の「デベロッパーモード」を有効にする

4. 「パッケージ化されていない拡張機能を読み込む」をクリック

5. クローンしたリポジトリ内の `build/chrome-mv3-prod` フォルダを選択

### ソースからビルドする場合

```bash
git clone https://github.com/iemong/tegakari.git
cd tegakari
pnpm install
pnpm build
```

ビルド後、上記と同様に `build/chrome-mv3-prod` を Chrome に読み込んでください。

## 使い方

1. 任意のWebページで拡張機能アイコンをクリック（カーソルが十字に変わります）
2. 調べたい要素にマウスを合わせるとハイライト表示されます
3. 要素をクリックして選択すると、ピンマーカーが配置されパネルが表示されます
4. 複数の要素を続けてクリックすることで、複数要素を同時にアノテーションできます
5. 各アノテーションの指示テキスト欄に、変更・確認したい内容を入力します
6. パネル下部で出力形式（JSONL / Markdown）を選択します
7. **Copy All** ボタンをクリックしてクリップボードにコピーします
8. AIエディタに貼り付けて活用してください
9. `Esc` キーでパネルを閉じます

## 出力例

### Markdown形式

#### React (Next.js) サイトの場合

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

#### フレームワーク未検出の静的サイトの場合

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

### JSONL形式（デフォルト）

JSONL（JSON Lines）形式では、各セクションが独立したJSON行として出力されます。AIエディタが構造化データとしてパースしやすい形式です。

```jsonl
{"type":"instruction","content":"この保存ボタンをクリックしたらconfirmダイアログを表示するようにしたい"}
{"type":"pageContext","url":"https://example.com/dashboard/settings","pageTitle":"設定 | Example App","framework":"React","metaFramework":"Next.js (App Router)"}
{"type":"selectedElement","selector":"#settings-form > div:nth-child(2) > button.btn-primary","tag":"button","text":"保存する","attributes":{"class":"btn btn-primary px-4 py-2","data-testid":"settings-submit-btn","type":"submit"}}
{"type":"componentTree","framework":"react","hierarchy":["SettingsPage","SettingsForm","SubmitButton"],"props":{"variant":"primary","disabled":false,"onClick":"fn"},"state":{"isSubmitting":false}}
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
