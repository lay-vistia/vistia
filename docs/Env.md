# Vistia 環境仕様（FIX / v1.1）

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

### 4.2 CDN
- CloudFront を必ず挟む
- 環境ごとに別ディストリビューション（dev/stg/prod）

### 4.3 アップロード経路
- presigned URL でブラウザから直接 S3 にアップロードする。

---

## 5. 画像処理パイプライン（非同期）
- S3イベント → SQS → Lambda の順で処理する（安定性のためキューを挟む）

---

## 6. モデレーション（自動検知）
- ベンダー：AWS Rekognition（DetectModerationLabels）
- 画像処理とは別Lambdaで実行する（分離）
- 画像処理完了後のイベントを受けてスキャンし、閾値超えでAdminチケットを起票する（自動ブロックはしない）

---

## 7. DB
- Amazon RDS PostgreSQL
- RDS Proxy を使用する

---

## 8. Stripe（課金）
- Webhook受け口：API Gateway + Lambda

---

## 9. 認証
- Manage：Auth.js（NextAuth）
- Admin：Amazon Cognito User Pool（招待制、2FAメールOTP必須）

---

## 10. メール送信
- 送信元：`noreply@vistia.studio`
- 基盤：Amazon SES

---

## 11. Secrets管理
- AWS Secrets Manager

---

## 12. ジョブ（遅延実行）
- EventBridge Scheduler → Lambda

---

## 13. ログ/監視
- CloudWatch Logs
- CloudWatch Alarms

---

## 14. CI/CD とブランチ戦略
- GitHub連携でAmplifyが自動ビルド/自動デプロイ
- `main` → prod / `stg` → stg / `dev` → dev / PR → preview
