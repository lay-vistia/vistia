# Vistia 環境仕様（FIX / v1.6）

## 0. 構成
- モノレポ
- Next.js（App Router）+ TypeScript
- API：Next.js Route Handlers（BFF）
- 非同期：AWS（SQS/Lambda/EventBridge）
- DB：RDS PostgreSQL（RDS Proxy）
- 画像：S3 + CloudFront
- ホスティング：AWS Amplify Hosting
- 認証：
  - Manage：Auth.js（NextAuth）
  - Admin：Cognito User Pool（招待制、メールOTP 2FA必須）
- メール：SES（送信元 `noreply@vistia.studio`）
- Secrets：Secrets Manager
- 監視：CloudWatch
- WAF：CloudFront前段に適用（通報のrate limit用途）

---

## 1. 環境
- dev / stg / prod（資源は環境別に分離）

補足（FIX）：
- `dev / stg / prod` の全環境で RDS への接続は RDS Proxy 経由とする
- `DATABASE_URL` は RDS Proxy のエンドポイントを指す

---

## 2. ドメイン
### prod
- Public：`vistia.app`
- Manage：`manage.vistia.studio`
- Admin：`admin.vistia.studio`

### stg
- Public：`stg.vistia.app`
- Manage：`stg.manage.vistia.studio`
- Admin：`stg.admin.vistia.studio`

### dev
- Public：`dev.vistia.app`
- Manage：`dev.manage.vistia.studio`
- Admin：`dev.admin.vistia.studio`

---

## 2.1 Manage認証の環境変数（FIX）
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `TWITTER_CLIENT_ID`
- `TWITTER_CLIENT_SECRET`
- `TIKTOK_CLIENT_ID`
- `TIKTOK_CLIENT_SECRET`

補足（FIX）：
- 上記は `dev / stg / prod` で値を分離する
- すべて Secrets Manager で管理する

---

## 3. 画像ストレージ（S3）
### 3.0 dev 環境のデフォルト名（暫定 / FIX）
- S3 バケット：`vistia-dev-assets`
- SQS キュー：`vistia-dev-assets-queue`
- 画像処理 Lambda：`vistia-dev-processor`

### 3.1 プレフィックス（FIX）
```

assets/
original/
{userId}/{assetId}.{ext}
optimized/
{userId}/{assetId}.jpg
thumb/
{userId}/{assetId}_v{n}.jpg

```

### 3.2 オリジナルの扱い
- アップロードされたオリジナル画像は絶対に表示しない
- Public/Manageで配信するのは optimized / thumb のみ

### 3.3 サムネversion運用（FIX）
- thumb URLは version付き：
  - `assets/thumb/{userId}/{assetId}_v{n}.jpg`
- トリミング更新で `thumbVersion` を +1 して新URLへ
- 旧versionは削除し、S3上は最新1つだけ残す
- CloudFront invalidation：不要

### 3.4 コールドストレージ（FIX：タグ＋Lifecycle）
「変換成功後1日で移行」を、S3 Lifecycleの**タグ条件**で実現する。

#### 3.4.1 タグ付与
- 変換成功時（optimized/thumb生成成功 + DBでPROCESSED更新成功の直後）に original に付与：
  - `processed=true`
  - `processedAt=YYYY-MM-DD`（任意）

- 変換失敗時（DBでFAILED更新成功の直後）に original に付与：
  - `failed=true`
  - `failedAt=YYYY-MM-DD`（任意）

#### 3.4.2 Lifecycleルール
- ルール①（成功originalのコールド移行）
  - 対象：prefix `assets/original/` かつ tag `processed=true`
  - アクション：**1日後 → S3 Glacier Instant Retrieval**

- ルール②（失敗originalの削除）
  - 対象：prefix `assets/original/` かつ tag `failed=true`
  - アクション：**7日後にExpiration（削除）**

### 3.5 削除（FIX）
- 論理削除〜30日後に物理削除ジョブで削除
  - `original` `optimized` `thumb`（最新のみ運用）すべて削除
- 30日猶予中はS3に残す（参照は404）

---

## 4. 配信（CloudFront）
### 4.1 配信パス（FIX）
- 許可：`/assets/optimized/*` と `/assets/thumb/*` のみ
- その他：404

### 4.2 originalの二重防御（FIX）
- S3バケットポリシーで `assets/original/*` を CloudFront(OAC) からも明示的に拒否

### 4.3 Cache-Control（FIX）
- optimized：
  - `Cache-Control: public, max-age=31536000, immutable`
- thumb（version付き）：
  - `Cache-Control: public, max-age=31536000, immutable`

---

## 5. アップロード（presigned PUT）
### 5.1 経路
- ブラウザ → S3（presigned PUT）
- 完了後、クライアントが `POST /api/assets/{assetId}/complete` を呼ぶ（FIX）

### 5.2 CORS（FIX / Manageのみ・localhostなし・Adminなし）
```json
[
  {
    "AllowedOrigins": [
      "https://manage.vistia.studio",
      "https://stg.manage.vistia.studio",
      "https://dev.manage.vistia.studio"
    ],
    "AllowedMethods": ["PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Content-MD5", "x-amz-*", "Authorization"],
    "ExposeHeaders": ["ETag", "x-amz-request-id"],
    "MaxAgeSeconds": 3000
  }
]
```

### 5.3 署名URL制約（FIX）

* アップロード先キー：`assets/original/{userId}/{assetId}.{ext}`
* 署名URL期限：10分
* サイズ上限：50MB

### 5.4 検証（FIX）

* サーバー側で必ず検証してから `PROCESSED` にする

  * サイズ（<=50MB）
  * 拡張子候補：jpg/jpeg/png/webp/heic/heif
  * Content-Type候補：image/* + application/octet-stream（後段で中身判定必須）
  * マジックバイトで実ファイル種別を確定
  * デコード不可/矛盾はFAILED

---

## 6. 非同期処理（画像変換）

### 6.1 キュー

* SQS

### 6.2 メッセージ（FIX）

```json
{ "assetId": "..." }
```

### 6.3 変換出力（FIX）

* optimized：`assets/optimized/{userId}/{assetId}.jpg`
* thumb：`assets/thumb/{userId}/{assetId}_v{n}.jpg`（初回v1）
* 変換成功後のみ表示可能

### 6.4 画像処理Lambda（processor）のS3権限（FIX）

processor role に付与する最小権限：

* Read original：

  * `s3:GetObject`, `s3:HeadObject`, `s3:GetObjectTagging` on `assets/original/*`
* Write derived：

  * `s3:PutObject`, `s3:HeadObject`, `s3:DeleteObject` on `assets/optimized/*`, `assets/thumb/*`
* Tag original：

  * `s3:PutObjectTagging` on `assets/original/*`

### 6.5 Lambda のネットワーク（FIX）
- Lambda は RDS Proxy に到達できる VPC / Subnet / Security Group を設定する
- RDS Proxy の SG に Lambda の SG を `5432` で許可する

### 6.6 Lambda の環境変数（FIX）
- `ASSETS_BUCKET`
- `DATABASE_URL`（RDS Proxy のエンドポイント）

---

## 7. モデレーション（自動検知）

### 7.1 ベンダー

* AWS Rekognition（DetectModerationLabels）

### 7.2 対象（FIX）

* optimized（表示用1280 JPEG）をスキャン

### 7.3 MinConfidence（FIX）

* 60

### 7.4 AUTO起票（FIX）

* 0.60以上で起票（LOWでも起票）
* 0.60–0.749：LOW
* 0.75–0.899：MEDIUM
* 0.90以上：HIGH
* CRITICALは自動付与しない

### 7.5 重複（FIX）

* assetIdにつきAUTOチケットは1件（更新で履歴を残す）

---

## 8. ジョブ（遅延実行）

* EventBridge Scheduler → Lambda
* 用途：

  * 論理削除から30日後の物理削除
  * （必要なら）失敗リトライの再投入

---

## 9. WAF（FIX）

### 9.1 用途

* 通報エンドポイントのレート制限（IP単位）

### 9.2 ルール

* Rate-based rule：IP単位「1時間10回」
* 対象パス：通報API（例：`/api/report/*`）

### 9.3 方針

* DBにIPを保存しない（レート制限はWAFで完結）

## 10. UI方針（FIX）
- Public / Manage / Admin はモバイルファーストで実装する
- PCでも操作可能（レスポンシブ）
- 画面下固定UI（広告/重要ボタン）は safe-area を考慮する
- 画像グリッドの標準：
  - モバイル：2列
  - PC：4列
