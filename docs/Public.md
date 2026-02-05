# Vistia Public 仕様（FIX / v1.5）

## 1. URL構造
- `/@{handle}` : プロフィール
- `/@{handle}/gallery` : 作品ギャラリー（PUBLIC一覧）
- `/@{handle}/gallery/{postId}` : 作品詳細（PUBLIC）
- `/@{handle}/t/{token}` : 作品詳細（UNLISTED）
- `/@{handle}/links` : 外部リンク一覧（全件）
- `/@{handle}/page` : フリーページ
- `/@{handle}/gallery/collections` : コレクション一覧（PUBLIC）
- `/@{handle}/gallery/collections/{collectionId}` : コレクション詳細（PUBLIC）
- `/@{handle}/c/{token}` : コレクション詳細（UNLISTED）

---

## 2. handle 仕様
- ユニーク（重複不可）
- 許容文字：`a-z0-9_`
- 長さ：3〜20
- 小文字のみ
- 変更：可能
- 旧URLへのリダイレクト：なし
- handle変更後の旧URL：404

---

## 3. 公開範囲（Visibility）
### 3.1 作品（post）
- PUBLIC：Public上で一覧表示・閲覧可能
- UNLISTED：token URLでのみ閲覧可能
- PRIVATE：Publicで閲覧不可

### 3.2 コレクション（collection）
- PUBLIC：Public上で一覧表示・閲覧可能
- UNLISTED：token URLでのみ閲覧可能
- PRIVATE：Publicで閲覧不可

---

## 4. Adminによる非表示（HIDE）
- Adminは対象にHIDE（非表示）を付与できる
- HIDEされた対象は Public で 404
- HIDEはユーザーのVisibilityより優先される（上書き）

対象：
- post（作品）
- collection（コレクション）
- profile icon（アイコン）
- pin（ピン表示）
- free-page image（フリーページ画像）

---

## 5. プランによる分岐（Public）
- プラン：Free / Pro
- 判定単位：ページ所有者（`handle` のユーザー）のプランに従う

### 5.1 表示/機能
- ピン画像：Pro のみ表示（Free は非表示）
- コレクション：Pro のみ提供
  - Free の場合：
    - `/@{handle}/gallery/collections` は 404
    - `/@{handle}/gallery/collections/{collectionId}` は 404
    - `/@{handle}/c/{token}` は 404
- UNLISTED URL（作品/コレクション）：
  - 閲覧は Free/Pro 共通で可能
  - 発行可能数の制限は Manage の制限値に従う（Publicは制限値を持たない）

---

## 6. テーマ（Public）
- 背景色 / アクセント色 / フォント / カードの質感
- デフォルト：ライト

---

## 7. ページ仕様

### 7.1 プロフィール `/@{handle}`
表示：
- 表示名
- アイコン（HIDEされていない場合）
- ひとこと
- ピン画像（Proのみ、クリック遷移なし、最大3枚。HIDEされていない場合）
- YouTube埋め込み（1枠）
- 外部リンク（最大6件表示：label / icon / description）
- 導線：
  - `/@{handle}/links`
  - `/@{handle}/page`
  - `/@{handle}/gallery`

外部リンク：
- 全件は `/@{handle}/links` に表示
- 並び順：ユーザー指定順（Manage側で設定）

---

### 7.2 作品ギャラリー `/@{handle}/gallery`
- 対象：PUBLIC のみ（かつHIDEされていないもの）
- 表示：サムネグリッド（スマホ2列 / PC4列）
- 並び順：createdAt 降順（固定）
- カード：サムネのみ（表示枠 1:1 固定）
- 無限スクロール：あり
  - 1回の読み込み件数：12件
  - プリフェッチ：次の12件
- 導線：
  - `/@{handle}/gallery/{postId}`
  - `/@{handle}/gallery/collections`（Proのみ）

---

### 7.3 作品詳細（PUBLIC） `/@{handle}/gallery/{postId}`
表示：
- 画像のみ（最適化画像）

非表示：
- タイトル
- 説明
- 作者プロフィール導線
- 関連作品

画像表示：
- 画面内に全体フィット（縦横フィット）
- ズーム：不可

ナビ：
- 次/前：あり
- 対象：PUBLIC作品のみ（かつHIDEされていないもの）
- 並び：createdAt 降順
- 境界：ループ（最後→最初、最初→最後）

---

### 7.4 作品詳細（UNLISTED） `/@{handle}/t/{token}`
表示：
- 画像のみ（最適化画像）
ナビ：
- 次/前：なし
導線：
- token URLのみ（Public通常導線には出さない）

---

### 7.5 外部リンク一覧 `/@{handle}/links`
- 外部リンクを全件表示（無制限）
- 表示：label / icon / description（descriptionは全文表示）
- 並び順：ユーザー指定順

---

### 7.6 フリーページ `/@{handle}/page`
- フリーページ本文を表示（WYSIWYG）
- 文字数上限：10,000文字
- リンク：
  - `http/https` のみ
  - `target="_blank"` + `rel="noopener noreferrer"`
- 画像埋め込み：可（Vistiaにアップロードした画像のみ。HIDEされた画像は表示されない）
- 外部埋め込み：可（YouTube / X / TikTok / Twitch、許可ドメインのみ、short/旧ドメイン含む）

---

### 7.7 コレクション一覧（PUBLIC） `/@{handle}/gallery/collections`（Proのみ）
- 表示対象：PUBLICコレクションのみ（かつHIDEされていないもの）
- 並び順：ユーザー指定順
- カード：サムネ＋コレクション名（1行）
- カードサムネ：コレクション内の先頭作品のサムネ
- 導線：`/@{handle}/gallery/collections/{collectionId}`

---

### 7.8 コレクション詳細（PUBLIC） `/@{handle}/gallery/collections/{collectionId}`（Proのみ）
- コレクション内の作品サムネ一覧を表示
- 表示される作品：PUBLICのみ
- HIDE対象は表示されない

---

### 7.9 コレクション詳細（UNLISTED） `/@{handle}/c/{token}`（Proのみ）
- コレクション内の作品サムネ一覧を表示
- 表示される作品：PUBLIC + UNLISTED
- HIDE対象は表示されない

---

## 8. 画像仕様
### 8.1 前提
- 1作品=1枚画像
- アップロードされたオリジナル画像は **絶対に表示しない**
- 表示はサーバー側で生成した **最適化画像/サムネのみ**
- オリジナルの差し替え：不可

### 8.2 サムネ（thumb）
- サイズ：512x512
- 表示枠：1:1 固定
- フォーマット：JPEG
- 品質：80
- トリミング：Manage側でユーザーが決定/調整
- URL：`/assets/thumb/{userId}/{assetId}_v{n}.jpg`（version付き、最新のみ保持）

### 8.3 作品詳細（最適化画像 optimized）
- 最大辺（長辺）：1280px
- フォーマット：JPEG
- 品質：80
- EXIF：全削除
- 向き：正しい向きに変換して出力（向き情報は焼き込み）
- URL：`/assets/optimized/{userId}/{assetId}.jpg`

---

## 9. UNLISTED token 仕様
### 9.1 作品
- token：22文字 Base64URL
- 作品と token は 1:1
- 有効期限：なし
- 再発行：無制限（旧tokenは無効）
- 再発行レート制限：10分に1回（作品単位）
- UNLISTED → PUBLIC：token無効（404）

### 9.2 コレクション
- token：22文字 Base64URL
- コレクションと token は 1:1
- 有効期限：なし
- 再発行：無制限（旧tokenは無効）
- 再発行レート制限：10分に1回（コレクション単位）
- UNLISTED → PUBLIC：token無効（404）

---

## 10. 画像保存抑止（UIレベル）
- PC：右クリック保存を抑止
- モバイル：長押し保存を抑止（可能な範囲）
- 適用範囲：Publicに表示される全画像

---

## 11. 広告仕様（Public）
- 広告：Google AdSense
- Free：表示する
- Pro：表示しない
- 表示ページ：
  - Freeの通常ページは表示
  - 作品UNLISTED（`/@{handle}/t/{token}`）も表示
  - コレクションUNLISTED（`/@{handle}/c/{token}`）も表示
  - エラーページ（404等）は表示しない
- 枠（配置）：
  - 画面下固定（sticky）に1枠
  - 高さ：90px
  - safe-area-inset-bottom を考慮

---

## 12. 通報フォーム（Public）
- 通報導線：Publicの対象詳細から開ける（post/collection/profile要素）
- 入力項目：
  - 理由カテゴリ（必須）
  - 自由記述（任意）
  - 連絡用メールアドレス（任意）
- 通報カテゴリ（13個）：
  1. 性的（成人）
  2. 児童の性的/搾取の疑い（CSAM疑い）
  3. 暴力/残虐
  4. 自傷/自殺
  5. ヘイト/差別
  6. 嫌がらせ/いじめ（Harassment）
  7. 違法/規制薬物
  8. 武器/危険物
  9. 個人情報（晒し）
  10. 著作権/商標
  11. なりすまし
  12. スパム/詐欺
  13. その他

### 12.1 通報レート制限（FIX）
- IP単位で「1時間10回」
- 実装：AWS WAF Rate-based rule（CloudFront/ALB前段）
- DBにIPは保存しない
