# Vistia 仕様書（SOT）
Version: 2026-01-31
Status: FIX + TBD 混在（TBDは明示）

この文書は「何をするか（プロダクト仕様）」を定義する。
実装方法は `DESIGN.md` に記載する。

---

## 0. 環境前提（FIX）

### 開発環境（FIX）
- GitHub Codespaces
- Amazon RDS（開発用DB）
  - 開発は直開放OK（ユーザー判断）

### 本番環境（FIX）
- AWS Amplify（Public / Manage / Admin のホスティング）
- Amazon RDS（本番DB）
- Amazon S3（画像保存：original + display + thumb）
- CloudFront（画像配信用）
- API Gateway + Lambda（API）
- SES（メール送信）
- リージョン：大阪（ap-northeast-3）

---

## 1. ドメイン（FIX）
- Public：`vistia.studio`
- Manage：`manage.vistia.studio`
- Admin：`admin.vistia.studio`
- API：`api.vistia.studio`
- 画像配信：`img.vistia.studio`

---

## 2. 認証（FIX）

### 2.1 Manage（FIX）
- ログイン方式：Email（Magic Link） / Google / X
- セッション：DBセッション（HttpOnly Cookie）
  - Cookie名：`manage_session`
  - SameSite=Lax
  - Secure：本番ON

### 2.2 Admin（FIX）
- Manageと完全分離（別アプリ・別認証境界）
- ログイン方式：Email + Password + 2FA必須（TOTPのみ）
- バックアップコード：10個
  - 初回のみ表示
  - 再発行で旧コード無効
- セッション：DBセッション（HttpOnly Cookie）
  - Cookie名：`admin_session`
  - SameSite=Strict
  - Secure：本番ON
  - 有効期限：12時間
  - 無操作30分タイムアウト

---

## 3. 公開範囲（FIX）

### 3.1 Visibility（FIX）
- 作品（Work）：PUBLIC / UNLISTED / PRIVATE
- コレクション（Collection）：PUBLIC / UNLISTED / PRIVATE

### 3.2 UNLISTED（FIX）
- 作品/コレクション単位で限定URL tokenを自動発行
  - 無期限OK
- UNLISTED → PUBLIC/PRIVATE に戻したら token無効化（revoked）
- UNLISTEDの広告：通常公開と同じ扱い
- ページ全体（プロフィール）には限定URLを発行しない（作品/コレクション単位のみ）
- UNLISTED閲覧は「閉じた閲覧」
  - 通常のギャラリー導線/一覧導線は出さない
  - ユーザー名/アイコンは表示してOK

---

## 4. 表示UI（FIX）

### 4.1 プロフィール表示順（FIX）
1. アイコン
2. 表示名
3. bio
4. ピン（Proのみ）
5. YouTube（任意・1つ）
6. ギャラリーボタン（別ページ遷移）
7. Links（6件表示＋「もっと見る」）

### 4.2 ギャラリー（FIX）
- `@handle` → 「ギャラリーを見る」→ `@handle/gallery`
- 無限スクロール
- 作品詳細：モーダル、スワイプで次/前、ルール表記なし
- コレクション導線：ギャラリー上部に「コレクション」ボタン
  - `@handle/gallery?c={collectionId(UUID)}`

### 4.3 YouTube（FIX）
- 埋め込み再生：1つだけ

### 4.4 並び順（FIX）
- Publicギャラリーの並び順：新着順のみ
- Public検索：しない（見せたいものはコレクション方針）
- Manage検索：タグ検索のみ（後述）

---

## 5. 作品モデル（FIX）
- 1作品＝画像1枚
- タイトルなし
- タグ：最大3、各10文字
- 画像差し替え不可（削除→新規）
- 削除：論理削除 → 30日後パージ（ゴミ箱UI/復元UIなし）

---

## 6. ピン（FIX）
- Free：ピン無し
- Pro：ピン3つ
- ピン対象：作品のみ
- PUBLIC作品のみピン可
- ピンはモーダル表示なし、横スワイプで閲覧

---

## 7. コレクション（FIX）
- Proのみ
- コレクション数：無制限
- 作品の重複追加不可（collection_id, work_id unique）
- コレクション削除：作品は残る、紐づけだけ消す

### 7.1 混在ルール（FIX）
- PUBLICコレクション：PUBLIC作品のみ
- UNLISTEDコレクション：PUBLIC + UNLISTED作品
- PRIVATEコレクション：PUBLIC + UNLISTED + PRIVATE作品

### 7.2 整合ルール（FIX）
- コレクション側 visibility 変更で不整合が出る場合：ブロック
- 作品側 visibility 変更で不整合が出る場合：自動で該当コレクションから外す
  - in-app技術通知は出してOK

---

## 8. タグ・検索（FIX）
- Public検索：なし
- Manage検索：タグ完全一致のみ（AND）
  - サジェストなし
  - 正規化：前後トリム、連続空白1つ、case-insensitive重複統合

---

## 9. 広告（FIX）
- Free：広告あり / Pro：広告なし
- 追従固定バナー（ページ下部）
- UIにかぶってOK、モーダル中も表示

---

## 10. 保存抑止（FIX）
- 右クリック/長押し/ドラッグ等：サムネ含め全面抑止方針（ベストエフォート）
- 透かし：無し
- originalは絶対に表示しない（display/thumbのみ配信）

---

## 11. 画像仕様（FIX）

### 11.1 制約（FIX）
- 最大：50MB
- 同時アップロード：5枚まで（＝最大5作品作成）

### 11.2 許可形式（FIX：静止画のみ）
- 許可MIME/拡張子
  - image/jpeg（.jpg/.jpeg）
  - image/png（.png）
  - image/webp（.webp）
  - image/heic, image/heif（.heic/.heif）
- 不許可
  - image/gif：全面拒否（静止GIF含む）
  - その他（AVIF等）拒否
- 最大解像度：長辺12000pxまで（超過は拒否）

### 11.3 生成物（FIX）
- display：長辺1280px、WebP、メタデータ除去、Orientation正規化
- thumb：正方形、JPEG、メタデータ除去、Orientation正規化
- 透過PNGのthumb合成：白（#FFFFFF）

### 11.4 非同期処理（FIX）
- SQS + Lambda
- リトライ：5回
- 失敗時：再生成ボタン
- thumb再生成：thumbだけ再生成（入力はdisplay）

### 11.5 thumbトリミング（FIX）
- 中央固定ではなくフォーカス点指定
  - Manageで画像をタップしてフォーカス点設定（ドラッグ不要）
  - 未指定は中央

---

## 12. ストレージ（FIX）

### 12.1 バケット（FIX）
- `vistia-media-public`：display/thumb（配信用。CloudFront Origin）
- `vistia-media-private`：original（非配信用）

### 12.2 キー（FIX）
- original（private）
  - `original/work/{userId}/{workId}/{assetId}.{ext}`
  - `original/avatar/{userId}/{assetId}.{ext}`
- display（public）
  - `display/work/{userId}/{workId}/{assetId}.webp`
  - `display/avatar/{userId}/{assetId}.webp`
- thumb（public）
  - `thumb/work/{userId}/{workId}/{assetId}.jpg`
  - `thumb/avatar/{userId}/{assetId}.jpg`

### 12.3 originalライフサイクル（FIX）
- originalは1日後にコールドへ移行
- 自動削除はしない
- 作品パージ/ユーザーパージ時に関連オブジェクトを削除

---

## 13. 画像配信（FIX）
- 画像URL：`img.vistia.studio`（CloudFront）
- CloudFront → S3：OAC（S3公開OFF）
- Cache：不変URL前提で長期キャッシュ（immutable）
- 署名付きURL/Cookieは採用しない

---

## 14. チケット運用（FIX）
- 通報・自動検知：すべてチケット化
- 自動削除/自動BANなし（人が判断）
- 公開側は理由非表示（404等）
- 復旧/異議申立：同一チケットに `ticket_events` で積む
- 優先度：全部High

### 14.1 ticket_type（FIX）
- report
- nsfw_alert
- violence_gore_alert
- selfharm_alert
- abuse_storage_alert
- substance_alert（薬物のみ。タバコ/アルコールは対象外）
- manual

---

## 15. 自動検知の明記（AIという単語は禁止 / FIX）
規約・PP・ガイドラインにのみ記載（UIには出さない）：

> サービスの安全性維持のため、投稿されたコンテンツは自動的に検知・評価される場合があります。  
> ただし、これらの検知結果のみをもとに、コンテンツの削除やアカウントの停止が行われることはありません。  
> 最終的な判断は、運営が行います。

---

## 16. Rekognition → チケット起票（FIX）
- サブタイプはVistia側で持たない（L2/L3はpayload保存のみ）
- 実行タイミング：display生成成功後に1回だけ（thumb再生成では実行しない）
- 自動検知失敗時：画像はREADYでOK、manualチケット起票
- 起票マッピング：nsfw/violence/selfharm/substance（薬物のみ、タバコ/アルコール除外）
- 閾値は運用パラメータとして調整可能

---

## 17. ユーザー通知（FIX）
- in-app通知：必須（OFF不可）
- メール通知：任意メールのみOFF可
- アカウント系・運営重大操作・支払い失敗：強制メール

---

## 18. 通知テンプレ（FIX：DB管理＋Admin編集）
- reason_codeごとにテンプレをDB管理、Admin画面で編集可能
- テンプレの「無効化」＝メール送信OFF（in-appは常に出る）

### 18.1 権限（FIX）
- 編集：Ownerのみ
- 閲覧：Owner/Moderator/Support
- 送信：Support/Moderator（テンプレ＋追記）

### 18.2 プレースホルダ（FIX：最小）
- `{{display_name}}`, `{{handle}}`, `{{action}}`, `{{effective_at}}`

### 18.3 強制メール（テンプレのメールOFF不可 reason_code）（FIX）
- ACCOUNT_SUSPENDED
- ACCOUNT_RESTORED
- WORK_HIDDEN_BY_ADMIN
- WORK_DELETED_BY_ADMIN
- COLLECTION_HIDDEN_BY_ADMIN
- COLLECTION_DELETED_BY_ADMIN
- TOKEN_REVOKED
- PRO_GRANTED_MANUAL
- PRO_REVOKED_MANUAL
- SUBSCRIPTION_PAYMENT_FAILED

### 18.4 ユーザー側メール設定（FIX）
- `users.email_optional_enabled`（任意メールのみ）
- 判定
  - 強制メール：必ず送る（テンプレOFF不可、ユーザーOFF無視、バウンス抑止も無視）
  - 任意メール：テンプレON AND ユーザーON AND バウンスしてない

---

## 19. Admin RBAC（FIX）
- Owner：全権、Adminユーザー作成/権限変更はOwnerのみ
- Moderator：チケット対応、非公開/削除/token無効、ユーザー停止権限あり
- Designer：デザインマスタ管理のみ（デザインマスタは後回し）
- Support：閲覧中心＋通知送信（テンプレ＋追記）
- 重大操作（停止/解除、削除、Pro剥奪、token無効）：入力確認必須（スマホ前提）

---

## 20. Stripe（FIX）
- 課金手段：Stripeのみ
- Checkout/Portal/Webhook
- Admin：Stripe無しでPro付与/剥奪可能
- Webhook：署名検証、event_id冪等
- 手動Pro優先（実効 pro_until = max(stripe, manual)）

---

## 21. 削除/パージ（FIX）
- 作品：論理削除→token即revoked→collection_items即削除→30日後S3/DB削除
- コレクション：論理削除→token即revoked→30日後DB削除
- ユーザー退会：取り消し可
  - 退会：deleted_at, is_suspended, 全セッション破棄, Publicは404
  - 取り消し：30日以内OK（reactivateリンク、token 24h、最新のみ有効、発行上限1時間3回）
  - パージ時：Stripe購読が残ってたら必ず解約→S3全削除→DB物理削除
  - audit/ticketsは保持

---

## 22. SES運用（FIX）
- From：`noreply@vistia.studio`
- Reply-To：`support@vistia.studio`（認証系はnoreply）
- バウンス/苦情：SNS→SQS→Lambda→DB反映
- 任意メール：バウンス時停止
- 強制メール：送る（deliveryに結果記録）

---

## 23. 監査ログ（FIX）
- audit_logs：Admin重大操作、画像処理、パージ、Stripe webhook、退会/取消 等
- meta最低限：request_id、before/after（ロール/テンプレ変更）、reason_code（通知系）
- 保持：DB90日、S3 1年、以降コールド

---

## 24. 追加FIX（このチャットで確定したもの）
### 24.1 CORS/CSRF（FIX）
- CORS許可オリジン：`vistia.studio`, `manage.vistia.studio`, `admin.vistia.studio`
- Cookieセッション前提でCSRF対策を必須化（Originチェック + Double Submit）

### 24.2 handle / display_name ルール（FIX）
- handle
  - 文字：`a-z 0-9 _` のみ（小文字のみ）
  - 長さ：3〜20
  - 先頭：英字必須（数字開始不可）
  - 予約語禁止：`admin, manage, api, img, support, help, terms, privacy, about, pricing`
  - handle変更：30日に1回まで、年2回まで、旧handleは90日予約
- display_name
  - Unicode可（絵文字OK）
  - 長さ：1〜30文字
  - 正規化：前後トリム、連続空白は1つ

---

## 25. TBD（未決定）
この仕様書にTBDが残る項目は、以後「候補→推奨→FIX」で順次確定する。
- CORS/CSRFのpreview環境オリジン許可ポリシー（本番はFIX済み）
- Links仕様の詳細（httpsのみ等は未FIX）
- Webhook失敗運用（Stripe/SES）
- アップロード悪用対策（日次上限など）
- ログ保持（監査以外）
- RDSバックアップ・復旧
- Admin操作ガード追加（追加ガードの詳細）
