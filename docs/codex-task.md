# Codexタスク：Vistia 仕様 → 実装

## 目的
この docs 配下の FIX 済み仕様書に基づいて Vistia を実装する。
仕様書に書かれていない要件は勝手に追加しない。
不足がある場合は「TODO」として明記し、実装を止めないための安全なデフォルト案を添える。

---

## 必ず守るFIX（絶対）
### ドメイン
- Public：vistia.studio
- Manage：manage.vistia.studio
- Admin：admin.vistia.studio

### Public URL
- `/@{handle}`
- `/@{handle}/gallery`
- `/@{handle}/gallery/{postId}`
- `/@{handle}/t/{token}`
- `/@{handle}/links`
- `/@{handle}/page`
- `/@{handle}/gallery/collections`
- `/@{handle}/gallery/collections/{collectionId}`
- `/@{handle}/c/{token}`

### UNLISTED token（作品/コレクション）
- token：22文字 Base64URL
- 1:1（作品↔token、コレクション↔token）
- 有効期限なし
- 再発行は無制限（旧tokenは無効）
- 再発行レート制限：対象単位で「10分に1回」
- token URL：
  - 作品：`/@{handle}/t/{token}`
  - コレクション：`/@{handle}/c/{token}`

### Visibility
- 作品：PUBLIC / UNLISTED / PRIVATE
- コレクション：PUBLIC / UNLISTED / PRIVATE

### Admin非表示（HIDE）
- Visibilityとは別に HIDE を付与できる
- HIDE対象は Public で 404
- DBは hidden_targets で管理（HIDEで統一）

### 広告
- Free：AdSense表示
- Pro：広告非表示
- UNLISTEDページも Free なら広告表示
- 画面下固定（sticky）1枠

### 画像ポリシー
- アップロードされた original は絶対に表示しない
- 表示は optimized / thumb のみ
- optimized：最大辺 1280px / JPEG / q80 / EXIF削除 / 向きは焼き込み
- thumb：512x512 / JPEG / q80 / トリミングは Manage でユーザーが決定
- thumbは version付きURL、S3には最新1つだけ残す
- 1作品=1枚（post=asset 1:1）、画像の差し替え不可

### S3ライフサイクル（original）
- 保存先：`assets/original/{userId}/{assetId}.{ext}`
- 変換成功時：originalに `processed=true` タグ付与 → 1日後に Glacier Instant Retrievalへ移行
- 変換失敗時：originalに `failed=true` タグ付与 → 7日後に削除
- タグ付与タイミングは env.md に従う

### 通報API & レート制限（FIX）
- API：`POST /api/reports`
- レート制限：IP単位「5分あたり2回」
- 実装：AWS WAF rate-based rule
- DBにIPは保存しない

### DB（FIX）
- Postgres
- IDは UUID v7（アプリ側生成、DBは uuid 型）
- createdAtは不変（更新しない）
- updatedAtは更新のたびに更新
- スキーマは `docs/db-schema.md` を唯一の正とする

---

## Codexに期待する成果物（出力）
- モノレポ構成のアプリ骨格（Next.js App Router + TypeScript）
  - Public / Manage / Admin のアプリ分離
- DBマイグレーション（SQL/Prisma/Drizzle等）※ `db-schema.md` 準拠
- インフラ定義（IaC推奨）
  - S3 / CloudFront / WAF / IAM / RDS / SQS / Lambda / EventBridge / Amplify / SES
- 画像パイプライン
  - presigned PUT → 完了通知API → SQS → Lambda変換 → DB更新 → S3タグ付与
- 認証
  - Manage：Auth.js（EMAIL/Google/X/TikTok）
  - Admin：Cognito（招待制 + メールOTP 2FA必須）
- Publicの最低限ページ実装（public.mdのルート）
- Adminの最低限（admin.mdのMVP画面）
- Manageは骨格＋FIX制約が満たせる最低限（詳細はTODOで残してOK）

---

## 非目標（やらない）
- 仕様書にない新機能の追加
- 過度な分析/推薦/ランキング機能
- 仕様未確定部分の独断実装（TODOで止める）
