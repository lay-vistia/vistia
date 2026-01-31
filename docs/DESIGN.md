# Vistia 設計書（SOT）
Version: 2026-01-31
Status: FIX + TBD 混在（TBDは明示）

この文書は「どう作るか（アーキテクチャ/データ/I/F/状態遷移/運用）」を定義する。
仕様は `SPEC.md` を参照し、設計判断は原則この文書で完結させる。

---

## 0. 目的
- 実装中に「仕様の再確認」が発生しない状態を作る
- 重要な決定（Cookieセッション/公開範囲/画像配信/チケット運用）をI/FとDBに落とし込む
- “ベストエフォート”と“セキュリティ必須”を混同しない

---

## 1. システム構成（FIX）

### 1.1 アプリ
- Public（Amplify）：`vistia.studio`
- Manage（Amplify）：`manage.vistia.studio`
- Admin（Amplify）：`admin.vistia.studio`

### 1.2 API
- API Gateway + Lambda：`api.vistia.studio`
- DB：PostgreSQL（RDS、本番はRDS Proxy経由）

### 1.3 画像
- S3 private：`vistia-media-private`（original）
- S3 public：`vistia-media-public`（display/thumb）
- CloudFront：`img.vistia.studio`（publicバケットのみ配信、OAC）
- 非同期：SQS + Lambda（Sharp）

### 1.4 メール
- SES：noreply送信、support返信先
- SNS→SQS→Lambdaでバウンス/苦情反映

---

## 2. リポジトリ構成（推奨）
monorepo
- `apps/public`
- `apps/manage`
- `apps/admin`
- `packages/ui`
- `packages/db`

---

## 3. セキュリティ設計（FIX）

### 3.1 Cookieセッション（FIX）
- Manage Cookie：`manage_session`（HttpOnly, SameSite=Lax, Secure=prod）
- Admin Cookie：`admin_session`（HttpOnly, SameSite=Strict, Secure=prod）
- セッションはDBで管理し、Cookie値のsha256のみ保存する

### 3.2 CORS（FIX）
許可オリジン（本番）
- `https://vistia.studio`
- `https://manage.vistia.studio`
- `https://admin.vistia.studio`

APIレスポンス
- `Access-Control-Allow-Origin`: リクエストOriginが許可リストに一致した場合のみそのOriginを返す（`*`禁止）
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, X-CSRF-Token, X-Request-Id`
- OPTIONSはAPI Gateway側で即200返却してよい（CORSヘッダ必須）

### 3.3 CSRF（FIX：Origin + Double Submit）
対象：POST/PUT/PATCH/DELETE
- Origin必須：許可オリジン以外は403
- Double Submit
  - Cookie：`csrf_token`（HttpOnly=false, SameSite=Lax）
  - Header：`X-CSRF-Token`
  - 一致しない場合403
- GET/HEADは不要、OPTIONSは無条件200（CORSヘッダ付与）

---

## 4. データ設計（DB）

### 4.1 共通ポリシー
- UUID主キー
- `created_at`, `updated_at`（timestamptz）
- 論理削除は `deleted_at`
- パージ対象は `purge_after` を持つ

### 4.2 テーブル一覧（最小で実装が止まらないセット）
- users, user_identities, user_handle_history
- manage_sessions, admin_users, admin_sessions, admin_backup_codes
- works, collections, collection_items, pins
- access_tokens（UNLISTED, reactivate）
- tickets, ticket_events
- notifications, notification_templates, notification_template_versions
- email_deliveries, email_suppressions
- stripe_customers, stripe_subscriptions, stripe_events
- audit_logs

> 型は実装都合で調整OKだが、意味と制約は固定する。

### 4.3 users
- handleは小文字固定で保存（受け取り時に正規化）
- `email_optional_enabled` は任意メールのみのON/OFF

### 4.4 handle履歴（旧handle予約）
- 旧handleは90日予約し、第三者が取得できないようにする
- 予約期間が切れたら解放

### 4.5 セッション
- Cookie値はDBに平文保存しない（sha256）
- 失効は `revoked_at` をセット

### 4.6 works（作品）
重要：
- 1作品=1画像
- originalは配信しない
- statusを持つ（状態遷移で実装の例外を吸収する）

推奨status（実装用）
- `UPLOADING`：presign発行済み
- `UPLOADED`：commit済み（originalがある前提）
- `PROCESSING`：SQS投入済み
- `READY`：display/thumb生成完了
- `FAILED`：生成失敗（再生成対象）
- `PURGED`：削除済み

### 4.7 access_tokens
- tokenは平文保存しない（sha256）
- work/collection tokenは無期限（expires_at=NULL）
- reactivate tokenは24h（expires_atあり）

---

## 5. API設計（I/F）

### 5.1 共通
- すべてJSON
- リクエストに `X-Request-Id` を任意で受け付け、audit_logs/metaに保存可能
- 認証はCookie（Manage/Adminで別）

### 5.2 エラー形式（推奨：実装統一）
```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "human readable",
    "details": { "any": "json" }
  }
}
```

推奨HTTPステータス

* 400: バリデーション
* 401: 未認証
* 403: 権限/CSRF/Origin
* 404: 非公開・削除（理由は返さない）
* 409: 整合性違反（visibility混在など）
* 413: サイズ超過
* 415: MIME不正
* 429: レート制限（TBD）
* 500: 予期せぬエラー

### 5.3 Public API（閲覧）

* GET `/public/profile/{handle}`

  * 返す：icon/display_name/bio/pins(プロなら)/youtube/links(6件) + gallery導線
* GET `/public/gallery/{handle}?cursor=...`

  * PUBLIC作品のみ、新着順、無限スクロール
* GET `/public/gallery/{handle}?c={collectionId}&cursor=...`

  * コレクションがPUBLICならコレクション内の作品を返す
* GET `/public/unlisted/work/{token}`

  * tokenが有効ならUNLISTED作品を返す（閉じた閲覧、他導線情報は返さない）
* GET `/public/unlisted/collection/{token}`

  * tokenが有効ならUNLISTEDコレクションを返す（閉じた閲覧、他導線情報は返さない）

### 5.4 Manage API（管理）

認証：`manage_session` 必須

* POST `/manage/auth/magic-link/request`
* POST `/manage/auth/magic-link/consume`
* OAuth callback（Google/X）

#### 画像アップロード（FIX前提）

* POST `/manage/works/presign`

  * 入力：filesのメタ（name,size,mime,width,height等）
  * 出力：original PUT用presigned URL（最大5件）
* POST `/manage/works/commit`

  * 入力：presignの結果（uploaded_key等）+ tags + visibility
  * 処理：works作成（status=PROCESSING等）→SQS投入
  * 出力：workId一覧

#### 作品更新

* PATCH `/manage/works/{workId}`

  * 更新可能：visibility / tags / focus点
  * 画像差し替えは不可
  * visibility整合によりcollectionから外す場合あり（in-app通知OK）

#### 作品削除

* DELETE `/manage/works/{workId}`

  * 論理削除 → purge_after=now+30d
  * token即revoked
  * collection_items即削除

#### コレクション

* POST `/manage/collections`（Proのみ）
* PATCH `/manage/collections/{id}`（visibility変更時は混在整合をチェック、ダメなら409）
* DELETE `/manage/collections/{id}`（論理削除）
* POST `/manage/collections/{id}/items`（重複不可）
* DELETE `/manage/collections/{id}/items/{workId}`

#### ピン（Proのみ）

* PUT `/manage/pins`（3枠固定、order_indexで管理）
* DELETE `/manage/pins/{pinId}`

### 5.5 Admin API（運営）

認証：`admin_session` 必須、RBAC判定

* POST `/admin/login`（password + TOTP）
* POST `/admin/logout`
* GET `/admin/tickets?...`
* POST `/admin/tickets/{id}/events`（同一チケットに履歴を積む）

運営アクション（例）

* POST `/admin/actions/work/hide`（非公開）
* POST `/admin/actions/work/delete`（削除）
* POST `/admin/actions/user/suspend`（停止）
* POST `/admin/actions/user/restore`（解除）
* POST `/admin/actions/token/revoke`
* POST `/admin/actions/pro/grant`（手動付与）
* POST `/admin/actions/pro/revoke`（手動剥奪）

通知テンプレ

* CRUD `/admin/notification-templates`

  * 編集権限：Ownerのみ
  * 送信：Support/Moderator

---

## 6. 画像パイプライン設計（FIX）

### 6.1 バケット・キー（FIX）

* private original

  * `original/work/{userId}/{workId}/{assetId}.{ext}`
* public display

  * `display/work/{userId}/{workId}/{assetId}.webp`
* public thumb

  * `thumb/work/{userId}/{workId}/{assetId}.jpg`

### 6.2 ジョブ設計（推奨）

SQSメッセージ例

```json
{
  "job_type": "GENERATE_WORK_MEDIA",
  "user_id": "uuid",
  "work_id": "uuid",
  "asset_id": "uuid",
  "original_bucket": "vistia-media-private",
  "original_key": "original/work/.../asset.heic",
  "attempt": 1,
  "request_id": "req_xxx"
}
```

### 6.3 Lambda処理

1. original取得
2. マジックナンバーで実体判定（偽装拒否）
3. decode（HEIC含む）→ Orientation正規化 → メタデータ除去
4. display生成（長辺1280, webp）→ publicへPUT
5. thumb生成（正方形, jpeg）

   * フォーカス点があればそれを中心にcrop
   * 透過は白（#FFF）合成
   * publicへPUT
6. DB更新：work.status=READY
7. display成功後にRekognitionを1回実行
8. 失敗時：最大5回リトライ、尽きたらFAILED

### 6.4 Rekognition（FIX）

* display成功後に1回だけ
* thumb再生成では実行しない
* 失敗時：READYのまま + manual ticket起票（payloadに失敗情報）

---

## 7. UNLISTED閲覧（閉じた閲覧）設計（FIX）

* tokenアクセス時、APIレスポンスは「閉じた閲覧」に必要な情報だけ返す
* 返さない情報（例）

  * 他作品一覧のcursor
  * 通常ギャラリーへの導線
  * コレクション一覧導線
* 表示してよい

  * user display_name, icon（SPECの通り）

---

## 8. 削除/パージ設計（FIX）

### 8.1 Work削除

* 論理削除（deleted_at）
* token即revoked
* collection_items即削除
* purge_after=deleted_at+30d
* purgeジョブがDB物理削除 + S3削除（display/thumb/originalすべて）

### 8.2 Collection削除

* 論理削除 → token即revoked → purge_after=+30d → 物理削除
* 作品は残す（紐付けだけ削除済み）

### 8.3 退会

* deleted_atセット、is_suspended=true、全セッション破棄
* Publicは404
* 取り消し：reactivate token（24h、最新のみ有効、1時間3回）
* パージ時：Stripe解約→S3全削除→DB物理削除（audit/ticketsは保持）

---

## 9. 通知設計（FIX）

### 9.1 in-app通知

* 常に有効（OFF不可）
* notificationsテーブルに積む

### 9.2 メール通知

* optionalはユーザー設定 `users.email_optional_enabled` でOFF可
* forcedは常に送信（テンプレOFF不可、ユーザーOFF無視、バウンス抑止無視）

### 9.3 SESバウンス/苦情

* SNS→SQS→Lambda→DB（email_suppressions）反映
* optionalメールは抑止
* forcedは抑止しない（ただしdelivery記録は残す）

---

## 10. Ticket-Centric運用設計（FIX）

* report/検知/手動はticketsに集約
* 復旧/異議申立は同ticketのticket_eventsに積む（別ticketにしない）
* 公開側には理由を出さない（404）

---

## 11. Admin RBAC（FIX）

* Owner：全権（Adminユーザー作成/権限変更はOwnerのみ）
* Moderator：チケット対応、非公開/削除/token無効、ユーザー停止権限
* Designer：デザインマスタ管理のみ（中身後回し）
* Support：閲覧中心＋通知送信（テンプレ＋追記）
* 重大操作は入力確認必須（スマホ前提）

> 重大操作の追加ガード（クールダウン、TOTP再要求等）はTBDとしてここに追記する。

---

## 12. Stripe設計（FIX）

* Checkout/Portal/Webhook
* Webhook署名検証 + event_id冪等（stripe_events）
* pro_untilは `max(stripe, manual)` の実効値
* AdminはStripe無しで手動Pro付与/剥奪可

---

## 13. 監査ログ設計（FIX）

* audit_logsに最低限の記録を残す

  * Admin重大操作
  * 画像処理
  * パージ
  * Stripe webhook
  * 退会/取消
* metaに request_id, before/after, reason_code を保持
* 保持：DB90日、S3 1年、以降コールド

---

## 14. TBD（未決定で設計に空欄の箇所）

* RDSバックアップ・復旧設計
* WAF/CloudFront/APIアクセスログ保持設計（IP生/ハッシュ等）
* Webhook失敗運用設計（Stripe/SESの再試行、manual ticket化条件）
* Links仕様詳細とDB/API（httpsのみ等）
* Admin操作ガード追加詳細
* アップロード悪用対策（日次上限/ソフト停止条件）
