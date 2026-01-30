# pick-con 出力仕様書

## 概要

Chrome拡張機能「pick-con」は、Webページ上の要素を選択し、そのコンテキスト情報をMarkdown形式で生成する。
生成されたMarkdownはクリップボードにコピーされ、Claude CodeやCursorなどのAIエディタに貼り付けて使用する。

## 対象フレームワーク

- React (Next.js含む)
- Vue (Nuxt含む)
- フレームワーク未検出の場合も動作する（一部セクション省略）

## 出力形式

Markdown形式。クリップボードにコピーして使用する。

## セクション構成

### 1. User Instruction

ユーザーが自由入力したテキスト。選択した要素に対してどのような変更・確認を行いたいかの指示。
出力の先頭に配置し、AIエディタに貼り付けたとき「何をしたいか → その対象のコンテキスト」の順で読めるようにする。

- UIにはテキストエリアを設ける
- クリップボードコピー時に他のセクションと一緒にコピーされる

### 2. Page Context

| 項目 | 内容 | 取得方法 |
|---|---|---|
| URL | ページのURL | `location.href` |
| Framework | 検出されたフレームワーク名とバージョン（検出時のみ） | グローバル変数チェック |
| Page Title | ページタイトル | `document.title` |

**フレームワーク検出方法:**

- **React**: `__REACT_DEVTOOLS_GLOBAL_HOOK__` の存在
- **Next.js**: `__NEXT_DATA__` の存在（App Router / Pages Router判定含む）
- **Vue**: `__vue__` または `__VUE__` の存在
- **Nuxt**: `__NUXT__` の存在

### 3. Selected Element

| 項目 | 内容 | 取得方法 |
|---|---|---|
| Selector | 一意なCSSセレクターパス | 要素から上方向トラバース |
| Tag | HTMLタグ名 | `element.tagName` |
| Text | テキストコンテンツ | `element.innerText` |
| Attributes | 主要な属性一覧（class, id, data-*, role, aria-*, name, type, href等） | `element.attributes` |

### 4. Component Tree

**表示条件**: React または Vue が検出された場合のみ。未検出時はセクション自体を省略する。

#### React の場合

- コンポーネントの階層パス（`Parent` → `Child` → `GrandChild`）
- Props
- State

**取得方法**: React Fiber（`__reactFiber$*`, `__reactProps$*`）経由。Main World injection が必要。

#### Vue の場合

- コンポーネントの階層パス
- Props
- Data

**取得方法**: `__vue__` または `__vueParentComponent` 経由。Main World injection が必要。

### 5. DOM Hierarchy

選択要素を中心としたDOM構造をHTMLで表示する。

- **範囲**: 親2階層上 + 選択要素の子要素を全て含む
- **選択マーカー**: `← selected` で選択中の要素を示す
- **兄弟要素**: 同階層の兄弟要素も含める

## 出力例

### React (Next.js) サイト

```markdown
## User Instruction
この保存ボタンをクリックしたらconfirmダイアログを表示するようにしたい

## Page Context
- **URL**: https://example.com/dashboard/settings
- **Framework**: Next.js 14 (App Router)
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

## DOM Hierarchy
```html
<form id="settings-form">
  <div class="form-actions">
    <button class="btn btn-primary px-4 py-2"> ← selected
      保存する
    </button>
  </div>
</form>
```
```

### フレームワーク未検出の静的サイト（Component Tree省略）

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

## DOM Hierarchy
```html
<ul class="team-list">
  <li class="team-member">
    <a class="team-member__link" href="/members/tanaka"> ← selected
      田中太郎
    </a>
    <span class="team-member__role">エンジニア</span>
  </li>
</ul>
```
```

### Vue (Nuxt) サイト

```markdown
## User Instruction
割引価格の表示フォーマットをカンマ区切りに変更したい

## Page Context
- **URL**: https://shop.example.com/products/123
- **Framework**: Nuxt 3 (Vue 3)
- **Page Title**: 商品詳細 | Example Shop

## Selected Element
- **Selector**: `.product-card > .price-section > span.price`
- **Tag**: `<span>`
- **Text**: "¥1,980"
- **Attributes**:
  - class: `price price--discount`
  - data-original-price: `2,480`

## Component Tree (Vue)
- `ProductDetail` → `PriceSection` → `PriceDisplay`
- **Props**: `{ price: 1980, originalPrice: 2480, currency: "JPY" }`
- **Data**: `{ showDiscount: true }`

## DOM Hierarchy
```html
<div class="product-card">
  <div class="price-section">
    <span class="price price--discount"> ← selected
      ¥1,980
    </span>
    <span class="price--original">¥2,480</span>
  </div>
</div>
```
```

## 技術的制約

- Content ScriptはIsolated Worldで動作するため、ページのJSコンテキストに直接アクセスできない
- React Fiber や Vue インスタンスなどフレームワーク固有情報の取得には **Main World injection**（`world: "MAIN"`）が必要
- Main Worldスクリプトとの通信は `window.postMessage` または Plasmo の Relay Flow を使用する
- Styling情報（Tailwind, CSS Modules等の検出）は出力に含めない
