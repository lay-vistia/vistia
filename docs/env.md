# Vistia 環境仕様（FIX / v1.0）

## 0. 前提（プロダクト構成）
- リポジトリ：モノレポ
- Web：Next.js（App Router）+ TypeScript
- アプリAPI：Next.js Route Handlers（BFF）
- 非同期処理はAWS（Lambda等）へ分離（画像処理/モデレーション/Stripe webhook/削除ジョブ）

---

## 1. 環境一覧
- dev / stg / prod の3環境を用意し、DB・S3・CloudFront等は環境ごとに分離する。

---

## 2. ドメイン（環境別）
### 2.1 prod
- Public：`vistia.app`
- Manage：`manage.vistia.studio`
- Admin：`admin.vistia.studio`

### 2.2 stg
- Public：`stg.vistia.app`
- Manage：`stg.manage.vistia.studio`
- Admin：`stg.admin.vistia.studio`

### 2.3 dev
- Public：`dev.vistia.app`
- Manage：`dev.manage.vistia.studio`
- Admin：`dev.admin.vistia.studio`

---

## 3. ホスティング（Web/API）
- AWS Amplify Hosting を使用し、Next.js（SSR含む）をホストする。
- Public / Manage / Admin は同一モノレポ内アプリとして運用し、Amplifyでそれぞれデプロイする。

---

## 4. 画像ストレージ・配信
### 4.1 保存先
- Amazon S3
- 環境ごとに別バケット（dev/stg/prod）

例（命名は実装で決める）：
- `vistia-dev-assets`
- `vistia-stg-assets`
- `vistia-prod-assets`

### 4.2 CDN
- CloudFront を必ず挟む
- 環境ごとに別ディストリビューション（dev/stg/prod）

### 4.3 アップロード経路
- presigned URL でブラウザから直接 S3 にアップロードする。

---

## 5. 画像処理パイプライン（非同期）
### 5.1 実行方式
- S3イベント → SQS → Lambda の順で処理する（安定性のためキューを挟む）

### 5.2 処理内容（仕様はPublic/Manageに準拠）
- HEIC/HEIF を含む入力画像を受け付け、サーバー側で変換
- サムネ生成（512x512 JPEG quality 80）
- 最適化画像生成（長辺1280 JPEG quality 80）
- EXIF削除
- 向き補正（向き情報は焼き込み）

---

## 6. モデレーション（自動検知）
- 外部モデレーションAPIを使用する
- 画像処理とは別Lambdaで実行する（分離）
  - 画像処理完了後のイベントを受けてスキャン
  - 閾値超えで Admin チケットを起票（自動ブロックはしない）

---

## 7. DB
### 7.1 種類
- Amazon RDS PostgreSQL

### 7.2 接続
- RDS Proxy を使用する（接続枯渇対策）

### 7.3 環境
- dev/stg/prod で分離（DBインスタンス/クラスタは環境ごと）

---

## 8. Stripe（課金）
### 8.1 Webhook受け口
- API Gateway + Lambda で受ける（Webアプリから分離）

### 8.2 Webhookイベント
- Stripe推奨イベントを網羅（Manage仕様に準拠）

---

## 9. 認証
### 9.1 Manage
- Auth.js（NextAuth）
- メール+パスワード + ソーシャル（Google / X / TikTok）

### 9.2 Admin
- Amazon Cognito User Pool
- 招待制（招待リンクtoken→初回パス設定）
- 2FA（MFA）：メールOTP必須

---

## 10. メール送信
### 10.1 送信元
- `noreply@vistia.studio`

### 10.2 送信基盤
- Amazon SES
- AdminのメールOTP送信にも利用する

---

## 11. Secrets管理
- AWS Secrets Manager を使用する
  - DB接続情報
  - Stripe秘密鍵
  - モデレーションAPI鍵
  - その他機密設定

---

## 12. ジョブ（遅延実行）
- EventBridge Scheduler → Lambda
- 用途：
  - 論理削除から30日後の物理削除（作品/コレクション/ユーザー等）

---

## 13. ログ/監視
- CloudWatch Logs
- CloudWatch Alarms

---

## 14. CI/CD とブランチ戦略
### 14.1 デプロイ方式
- GitHub連携でAmplifyが自動ビルド/自動デプロイ

### 14.2 ブランチ→環境
- `main` → prod
- `stg` → stg
- `dev` → dev
- PR → preview（PRごとにプレビュー環境を作成）

---

## 15. 開発時のDB運用
- ローカルDBは立てず、AWSの dev用RDS に直接接続する
