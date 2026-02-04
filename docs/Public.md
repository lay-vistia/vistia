# Vistia Public 仕様（FIX / v1.0）

## 1. URL構造
- `/@{handle}` : プロフィール
- `/@{handle}/gallery` : 作品ギャラリー（PUBLIC一覧）
- `/@{handle}/gallery/{postId}` : 作品詳細（PUBLIC）
- `/@{handle}/t/{token}` : 作品詳細（UNLISTED）
- `/@{handle}/links` : 外部リンク一覧（全件）
- `/@{handle}/page` : フリーページ
- `/@{handle}/gallery/collections` : コレクション一覧
- `/@{handle}/gallery/collections/{collectionId}` : コレクション詳細

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
- PUBLIC：Public上で一覧表示・閲覧可能
- UNLISTED：token URLでのみ閲覧可能
- PRIVATE：Publicで閲覧不可

---

## 4. プランによる分岐（Public）
- プラン：Free / Pro
- 判定単位：ページ所有者（`handle` のユーザー）のプランに従う

### 4.1 表示/機能
- ピン画像：Pro のみ表示（Free は非表示）
- コレクション：Pro のみ提供
  - Free の場合：
    - `/@{handle}/gallery/collections` は 404
    - `/@{handle}/gallery/collections/{collectionId}` は 404
- UNLISTED URL：
  - 閲覧は Free/Pro 共通で可能
  - 発行可能数の制限は Manage の制限値に従う（Publicは制限値を持たない）

---

## 5. テーマ（Public）
### 5.1 適用範囲
- Public全ページに適用

### 5.2 テーマ要素
- 背景色
- アクセント色
- フォント
- カードの質感

### 5.3 カードの質感
- フラット
- ソフトシャドウ
- グラス

### 5.4 デフォルト
- ライト

---

## 6. ページ仕様

### 6.1 プロフィール `/@{handle}`
表示：
- 表示名
- アイコン
- ひとこと
- ピン画像（Proのみ、クリック遷移なし）
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

### 6.2 作品ギャラリー `/@{handle}/gallery`
- 対象：PUBLIC のみ
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

### 6.3 作品詳細（PUBLIC） `/@{handle}/gallery/{postId}`
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
- 読み込み：即ロード（最優先）
- 背景：ユーザーのテーマに従う

ナビ：
- 次/前：あり
- 対象：PUBLIC作品のみ
- 並び：createdAt 降順
- 境界：ループ（最後→最初、最初→最後）

---

### 6.4 作品詳細（UNLISTED） `/@{handle}/t/{token}`
表示：
- 画像のみ（最適化画像）

ナビ：
- 次/前：なし

導線：
- Public上の通常導線には出さない（token URLのみ）

---

### 6.5 外部リンク一覧 `/@{handle}/links`
- 外部リンクを全件表示（無制限）
- 表示：label / icon / description（descriptionは全文表示）
- 並び順：ユーザー指定順（Manage側で設定）

---

### 6.6 フリーページ `/@{handle}/page`
- フリーページ本文を表示
- 形式：リッチテキスト（WYSIWYG）
- 文字数上限：10,000文字
- リンク：`target="_blank"` + `rel="noopener noreferrer"`
- 画像埋め込み：可（Vistiaにアップロードした画像のみ）
- 外部埋め込み：可（許可サービスのみ）
  - YouTube / X（Twitter）/ TikTok / Twitch
  - 入力形式：URL貼り付け → 自動埋め込み

---

### 6.7 コレクション一覧 `/@{handle}/gallery/collections`（Proのみ）
- コレクション一覧を表示
- 並び順：ユーザー指定順（Manage側で設定）
- カード：サムネ＋コレクション名（1行）
- カードサムネ：コレクション内の先頭作品のサムネ
- 導線：`/@{handle}/gallery/collections/{collectionId}`

---

### 6.8 コレクション詳細 `/@{handle}/gallery/collections/{collectionId}`（Proのみ）
- コレクション内の作品サムネ一覧を表示
- 表示対象：PUBLIC のみ
- 作品カード：サムネのみ
- 並び順：コレクション内ユーザー指定順（Manage側で設定）

---

## 7. 画像仕様
### 7.1 基本
- 1作品=1枚画像
- オリジナル画像は Public では配信しない
- オリジナル画像の差し替え：不可
- アップロード上限：50MB（適用はManage側）

### 7.2 サムネ
- サイズ：512x512
- 表示枠：1:1 固定
- フォーマット：JPEG
- 品質：80
- トリミング：Manage側でユーザーが決定/調整

### 7.3 作品詳細（最適化画像）
- 最大辺（長辺）：1280px
- フォーマット：JPEG
- 品質：80
- EXIF：全削除
- 画像の向き：正しい向きに変換して出力（向き情報は焼き込み）

### 7.4 キャッシュ
- サムネ/最適化画像：1年キャッシュ（immutable）
- 派生画像（サムネ等）を再生成して内容が変わる場合：URLも変更する

---

## 8. UNLISTED token 仕様
- token は推測困難なランダム文字列
- 作品と token は 1:1
- 有効期限：なし
- 再発行：可能（旧tokenは無効）

---

## 9. 外部リンク仕様
- フィールド：label / url / description / icon
- 遷移：
  - `target="_blank"`
  - `rel="noopener noreferrer"`

---

## 10. 画像保存抑止（UIレベル）
- PC：右クリック保存を抑止
- モバイル：長押し保存を抑止（可能な範囲）
- 適用範囲：Publicに表示される全画像
  - ギャラリーサムネ
  - 作品詳細画像
  - ピン画像
  - フリーページ内画像

---

## 11. 広告仕様（Public）
### 11.1 広告プロバイダ
- Google AdSense

### 11.2 表示条件
- Free：表示する
- Pro：表示しない
- PRIVATE：Publicに出ない

### 11.3 表示ページ
- Free の場合、通常ページは表示する
- UNLISTED（`/@{handle}/t/{token}`）も表示する
- エラーページ（404等）：表示しない

### 11.4 枠（配置）
- 画面下固定（sticky）に 1枠
- 高さ：90px
- safe-area-inset-bottom を考慮

### 11.5 挙動
- 閉じるボタン：なし
- スクロール中：常時表示

### 11.6 読み込み
- 初回描画完了後にロード（描画ブロックしない）

### 11.7 枠ID管理
- 環境変数で管理（dev/prodで切替）

---

## 12. エラー/非表示
- 存在しない：404
- PRIVATE：404
- token 不正/無効：404

### 12.1 404表示
- 文言：
  - 「見つかりませんでした」
  - 「トップへ」
- 導線：
  - handle が分かる場合：`/@{handle}` と ` /@{handle}/gallery` への導線を表示

---

## 13. 計測
- 実装しない（現時点）
