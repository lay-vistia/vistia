# Vistia Manage 仕様（Scaffold / FIXのみ）

このファイルは「FIX済みの制約」と「実装の枠」だけを定義する。
詳細仕様（UI細部・画面設計・文言・バリデーションの細かい例外）は Codex 側で TODO として補完してよい。
ただし、下記の FIX は絶対に守ること。

---

## 0. ドメイン
- Manage：`https://manage.vistia.studio/`

## 0.1 レスポンシブ（FIX）
- モバイルファースト
- PCでも破綻しないレスポンシブ
- 最小タップ領域：44px以上
- 主要操作は片手前提
- ブレークポイント：`<=767` / `768-1023` / `>=1024`

---

## 1. 認証（FIX）
- 認証基盤：Auth.js（NextAuth）
- Provider：
  - EMAIL
  - Google
  - X
  - TikTok
- アカウント統合（リンク/マージ）はしない（別アカウント扱い）
  - 「両方にアカウントがあるならリンク不可」
  - 「どちらかを削除してからリンク」

---

## 2. プラン（FIX）
- プラン種別：Free / Pro
- プランによって次が変わる：
  - ピン画像の有無
  - コレクションの有無
  - UNLISTED URL（token）の発行可能数

※具体的な発行可能数/制限値は TODO（後で決める）。ただし Public は「閲覧」は Free/Pro 共通。

---

## 3. Manageで扱う主要データ（FIX）
### 3.1 作品（post）
- 1作品=1枚
- タイトルなし
- 説明なし
- 作者プロフィールへの導線無し（Public側の仕様）
- 差し替え不可（画像の入れ替えはできない）
- visibility：PUBLIC / UNLISTED / PRIVATE
- 表示は optimized / thumb のみ（originalは絶対に表示しない）

### 3.2 画像（asset）
- アップロードは Manage のみ（Adminからアップロードしない）
- 最大 50MB
- 同時アップロード：1回に最大5枚
- 変換成功後のみ表示可能
- 変換成功した original は 1日後にコールドストレージへ（env.md参照）
- 変換失敗した original は 7日後に削除（env.md参照）

### 3.3 コレクション（collection）
- Proのみ利用可能
- visibility：PUBLIC / UNLISTED / PRIVATE
- コレクション内の作品の制約（FIX）：
  - 公開コレクション：公開作品のみ追加できる
  - 限定公開コレクション：公開作品 + 限定公開作品を追加できる
  - 非公開コレクション：非公開作品のみ追加できる
- 並び替え：ユーザー指定順（sortOrder）

### 3.4 ピン（pins）
- Proのみ利用可能
- 最大3枠
- 対象は PUBLIC作品のみ（ピンにできるのは公開作品だけ）

### 3.5 外部リンク（external_links）
- 無制限
- 項目：ラベル / URL / 説明 / アイコン
- 並び替え：ユーザー指定順（sortOrder）
- Publicプロフィールには最大6件まで表示（Public仕様）

### 3.6 フリーページ（free page）
- 文字数：10,000文字
- 埋め込み：YouTube / X / TikTok / Twitch（許可ドメインのみ）
- 画像埋め込み：Vistiaにアップロードした画像のみ（asset参照）

---

## 4. UNLISTED token（FIX）
### 4.1 URL
- 作品：`/@{handle}/t/{token}`
- コレクション：`/@{handle}/c/{token}`

### 4.2 token仕様
- token：22文字 Base64URL
- 有効期限：なし
- 再発行：無制限（旧token無効）
- 再発行レート制限：対象単位で「10分に1回」
- UNLISTED → PUBLIC：token無効（404）

---

## 5. サムネトリミング（FIX）
- トリミングは Manage 側でユーザーが自由に決められる
- トリミング更新により thumb を再生成する
- thumb URLは version付き（`_v{n}`）
- 更新時に `thumbVersion` を +1
- S3上は最新versionのみ保持（旧versionは削除）
- CloudFront invalidationは不要（env.md参照）

---

## 6. 通知（FIX）
- ユーザーへの通知はメールではなく Manage 内通知で行う（メールアドレスが無い場合がある）
- 通知テーブルは `notifications`（db-schema.md参照）
- 既読：通知ごとに `readAt`

通知例（最低限）：
- HIDEされた
- HIDE解除された
- BANされた / BAN解除
- チケットが解決/クローズ（必要なら）

---

## 7. 退会/削除（FIX）
- ユーザー削除は論理削除 → 30日後に物理削除（env.md参照）
- 退会取り消し（復元）は 30日以内なら可能（運用として用意）

---

## 8. TODO（Codex側で補完してよい）
- 画面一覧（ルーティング/メニュー構成）
- 投稿作成/編集UIの詳細
- コレクションUI（作成/編集/並び替え/追加削除）
- ピン管理UI
- 外部リンク管理UI
- フリーページエディタUI（サニタイズ/許可タグ）
- 課金（Stripe）のフロー・Webhook・プラン判定ロジック
- UNLISTED発行可能数の具体値（Free/Pro）
- 入力バリデーションの詳細（URL正規化、禁止ドメインなど）
