# Lambda ハンドラー一覧

## 1. 画像処理（SQS）
- パス: `apps/lambdas/processor/handler.ts`
- ビルド出力: `dist/processor/index.js`
- Lambda Handler: `index.handler`
- 目的: 画像変換（optimized / thumb）とタグ付与
- 受信: SQS メッセージ `{ "assetId": "..." }`
- 依存環境変数: `ASSETS_BUCKET`, `DATABASE_URL`

## 2. Manage 新規作成（Function URL）
- パス: `apps/lambdas/manage-signup/handler.ts`
- ビルド出力: `dist/manage-signup/index.js`（予定）
- Lambda Handler: `index.handler`
- 目的: Email 新規作成（users + auth_accounts の作成）
- 受信: `POST` JSON
  - `handle`
  - `displayName`
  - `email`
  - `password`
- 依存環境変数:
  - `DATABASE_URL`
  - `SIGNUP_API_KEY`（任意 / `x-api-key` で検証）
