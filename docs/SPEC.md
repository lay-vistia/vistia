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


## ✅FIX：Links仕様（無制限・ラベル自由・説明文あり）

* Linksは **無制限**
* Publicプロフィール上は **6件表示＋「もっと見る」**（既FIXのUIを維持）
* 各Linkは以下の項目を持つ

  * `url`（必須）
  * `label`（必須・自由入力）
  * `description`（任意・自由入力）
  * `order_index`（並び順。ユーザーが並び替え可能）

### 入力制約（荒れ防止の最小ガード）

* `url`

  * **httpsのみ許可**（`http://` は拒否）
  * 前後トリム
  * URLとしてパースできないものは拒否
* `label`

  * **1〜30文字**
  * Unicode可（絵文字OK）
  * 前後トリム、連続空白は1つ
* `description`

  * **0〜80文字**
  * Unicode可
  * 前後トリム、連続空白は1つ
* 重複

  * **同一URLの重複登録は禁止**（ユーザー単位）

### 表示・セキュリティ

* リンクは新規タブで開く（`noopener,noreferrer`）
* `label` / `description` は **HTMLとして解釈しない（常にテキスト表示）**

## 次：✅FIX（Webhook失敗運用：Stripe / SES）

### 共通方針

* 失敗は握りつぶさない
* 自動復旧できない/一定回数超えたら **`manual` チケット化**（運営が判断）
* 再試行は **指数バックオフ**、重複実行は **冪等**で吸収

---

## Stripe Webhook 失敗運用（FIX）

### 1) 受信・冪等（必須）

* Webhookは **署名検証必須**
* `event_id` で冪等（同一eventは二重処理しない）
* `stripe_events` に

  * `event_id`, `type`, `received_at`, `processed_at`, `error`
    を保存

### 2) 再試行

* 処理失敗時は **最大10回**まで再試行
* バックオフ（目安）
  `1m → 5m → 15m → 1h → 3h → 6h → 12h → 24h`（合計最大24h程度）
* 24hを超えて成功しない場合：次へ

### 3) manualチケット化

* **24h経過 or 最大10回失敗**で `ticket_type=manual` を起票
* チケットpayloadに最低限保存

  * `event_id`, `type`, 失敗理由（error）、最終試行時刻

### 4) ユーザー影響が出るイベントの扱い

* Pro反映や支払い失敗など “ユーザー状態が変わる” 系は

  * **処理が成功するまで状態を確定しない**（中途半端を作らない）
  * ただし二重反映は `event_id` で防止

---

## SES（バウンス/苦情）Webhook 失敗運用（FIX）

### 1) 受信

* SNS → SQS → Lambda で取り込み
* 取り込み失敗時もログを残す（監査とは別でOK）

### 2) 再試行

* 失敗時 **最大5回**再試行
* バックオフ（目安）
  `1m → 5m → 15m → 1h → 3h`

### 3) manualチケット化

* **最大5回失敗**で `ticket_type=manual` を起票
* payloadに保存

  * 受信したSNSイベント（必要最小のJSON）
  * エラー内容、最終試行時刻

### 4) 抑止反映の遅延許容

* 任意メールの抑止（bounce/complaint反映）が多少遅れても致命ではないが、

  * 失敗が継続するなら必ずチケット化して運営が直す

---

## 次：✅FIX（RDSバックアップ・復旧）

### 対象

* 本番DB：Amazon RDS（PostgreSQL） + RDS Proxy
* リージョン：ap-northeast-3（大阪）

---

## バックアップ方針（FIX）

### 1) 自動バックアップ（PITR）

* RDS **自動バックアップON**
* **保持期間：35日**
* **PITR（Point-in-Time Restore）有効**（35日範囲で任意時刻に復旧可能）

### 2) スナップショット（長期保持）

* 手動スナップショットを運用で追加

  * **月次：12世代保持**
  * **リリース前：1世代保持（直近3回分を保持）**
* 重要：手動スナップショットは自動削除しない（保持は運用で管理）

### 3) クロスリージョン

* **なし（初期FIX）**
  ※理由：まずはPITR + 月次スナップショットで運用確立を優先
  （将来、要件が出たら ap-northeast-1 等にコピーを追加できる）

---

## 復旧手順（FIX）

### 4) 復旧の基本方針

* 復旧は **新しいRDSインスタンスにリストア**して行う（既存を上書きしない）
* 復旧後の切替は **RDS Proxy の向き先**を切り替える（アプリ側変更を最小化）

### 5) 事故別の復旧選択

* **誤DELETE/誤UPDATE/データ破損**：PITRで事故直前に復旧（新規RDSへ）
* **DB設定変更ミス/アップグレード失敗**：直前スナップショットから復旧
* **重大障害（復旧時間優先）**：最新スナップショットから復旧 → 差分は運用判断

### 6) 復旧の検証（DRY RUN）

* **四半期に1回**、PITR復旧の手順をドライラン実施
* ドライランでは

  * リストア
  * アプリ疎通（Read中心）
  * 主要テーブル整合性チェック
  * 破棄
    までを通す

---

## 責任と権限（FIX）

### 7) 実行責任

* **Ownerが最終責任者**
* 実作業は Owner または Ownerが委任した運用担当が実施
* 復旧の実行ログは **audit_logs** に残す（復旧操作の開始/終了/対象/結果）

---

## 開発環境（FIX）

* 開発RDSは本番ほど厳格にしない（コスト優先）
* ただし最低限

  * 自動バックアップON
  * **保持期間：7日**
    を推奨運用とする（開発停止・手戻り対策）

---

## 次：✅FIX（ログ保持：監査ログ以外）

対象：WAF / CloudFront（img）/ API Gateway / Lambda（API）/ RDS（DB）などの“アクセス系・運用系”ログ
※監査ログ（audit_logs）は別FIX（DB90日＋S3 1年＋コールド）なのでここでは除外

---

## 1) 基本方針（FIX）

* 目的別に分ける

  * **短期運用（障害調査・不正検知）**：30〜90日
  * **中期（コスト/分析）**：90〜180日
* 収集先は **CloudWatch Logs と S3** を基本にする
* PII（IP等）は原則 **生で残さない**（ただしセキュリティ運用で必要な範囲は例外を明記）
* 削除はライフサイクルで自動化し、手動運用を減らす

---

## 2) IPの扱い（FIX）

* **WAF / CloudFront / APIアクセスログのIPは保存するが、S3保存時はハッシュ化**する

  * ハッシュ：`HMAC-SHA256(ip, secret_salt)`
  * secret_saltはSecrets Manager等で管理・ローテ可能
* CloudWatch側の短期ログ（30日）については、生IPが含まれる場合があるため

  * **保持期間を短く固定（30日）**し、以後はS3（ハッシュ化済み）に集約する

---

## 3) 保持期間（FIX）

### 3.1 WAFログ（Public/Manage/Admin/img）

* CloudWatch Logs：**30日**
* S3（圧縮・日次パーティション）：**180日**
* 180日超：削除

### 3.2 CloudFront（img）アクセスログ

* S3：**180日**
* 180日超：削除
  （CloudFrontはS3保管を正とし、CloudWatchは必須にしない）

### 3.3 API Gateway アクセスログ

* CloudWatch Logs：**30日**
* S3（エクスポート/配送）：**180日**
* 180日超：削除

### 3.4 Lambda（API）アプリログ

* CloudWatch Logs：**30日**
* 重要障害時のみ、該当期間をS3に退避して**180日**保持（通常は自動ではやらない）

### 3.5 RDS（PostgreSQL）ログ

* エラーログ/スロークエリログ相当は有効化（必要最小）
* CloudWatch Logs：**30日**
* S3退避：**しない（初期FIX）**
  ※必要が出たら「性能分析ログ」を別枠で追加

---

## 4) ログの形式と削減（FIX）

* S3へ保存するログは

  * **gzip圧縮**
  * 日付パーティション（例：`service=api/date=YYYY-MM-DD/...`）
* 重大な情報（tokenやCookie値などの機密）はログに出さない

  * リクエストID（`X-Request-Id`）をログキーにする

---

## 5) アクセス制御（FIX）

* ログ用S3バケットは原則 **運用ロールのみ**アクセス
* 開発者が見る必要がある場合は

  * 期間・範囲を限定した一時権限で付与（恒久権限は付けない）

---

## 次：✅FIX（Admin操作ガード追加）

対象：Adminでの重大操作（停止/解除、削除、Pro剥奪、token無効 など）
目的：誤操作・連打・スマホ誤タップを防ぐ

---

## 1) 重大操作の定義（FIX）

以下は **重大操作** とする（既FIXの「入力確認必須」に加えてガード適用）

* ユーザー停止 / 停止解除
* 作品の非公開（hide）/ 削除（delete）
* コレクションの非公開（hide）/ 削除（delete）
* UNLISTED token の無効化（revoke）
* Pro 付与 / Pro 剥奪（手動）
* 通知テンプレ編集（Ownerのみだが重大扱い）

---

## 2) 入力確認（FIX：二段階）

重大操作は **必ず二段階**

1. 確認モーダル（概要、影響、対象ID）
2. **確認入力**（スマホ前提で誤タップ防止）

   * 入力文字列：`CONFIRM`
   * もしくは対象の末尾短縮ID（例：`workId` の末尾6桁）
     ※どちらでも良いが、実装は後者推奨（対象取り違え防止が強い）

---

## 3) 連続操作クールダウン（FIX）

* 同一Adminユーザーが同じ重大操作を **連続実行**する場合

  * **5秒クールダウン**（UIでカウント表示）
* 同一リソース（同じuserId/workId/collectionId）への重大操作は

  * **30秒クールダウン**
  * 例：同じユーザーに停止→解除→停止の連打を防ぐ

---

## 4) 再認証（FIX）

以下のいずれかに該当する場合、重大操作前に **TOTP再入力**を要求

* Adminログインから **15分経過**
* 直近でブラウザ再起動/タブ復元等でセッションが継続した場合（last_seenが空白等）
* IP/UAハッシュがログイン時から変化した場合

※再入力後の猶予：**5分**

---

## 5) ロール別の追加制限（FIX）

* Support：重大操作不可（既FIXの通り閲覧中心＋通知送信）
* Designer：デザインマスタ以外の重大操作不可
* Moderator：重大操作可（ただしPro剥奪/付与は **Owner or Moderator** で可とする）
* Owner：全て可

---

## 6) ログ（FIX）

重大操作は必ず `audit_logs` に残す

* actor（admin_user_id）
* action（例：`USER_SUSPEND`, `WORK_DELETE`）
* resource_type/resource_id
* before/after（可能な範囲）
* request_id
* 確認入力の方式（CONFIRM or 末尾ID）は meta に残してOK（入力値そのものは不要）

---

## 次：✅FIX（アップロード悪用対策：Silent Guardとは別）

目的：大量アップロード・コスト爆発・Rekognition/変換キュー詰まりを防ぐ
前提：自動BAN/自動削除はしない（Ticket-Centric / 人が判断）

---

## 1) 制限方針（FIX）

* 基本は **ソフト制御**（遅延・一時停止）で守る
* ただし明確な乱用（短時間連打）は **即時ブロック**も使う（短時間のみ）
* すべての制御は **ユーザーに理由を詳細表示しない**（悪用者に手口を与えない）

  * 表示文言は固定：例「現在アップロードを制限しています。しばらくしてからお試しください。」

---

## 2) 作品数の上限（FIX）

* 1ユーザーあたりのアップロード上限（作品作成数）

  * **1日：200作品まで**
  * **1時間：60作品まで**
  * **5分：15作品まで**
* 上限を超えたら

  * その時間窓が明けるまで **アップロード不可（HTTP 429）**

---

## 3) バイト上限（FIX）

* 1ユーザーあたりのアップロード容量上限（originalの合計）

  * **1日：5GBまで**
* 超えたらその日中はアップロード不可（429）

---

## 4) キュー保護（FIX）

* 画像変換SQSが混雑（バックログ）している場合の制御

  * バックログが **一定閾値を超えたら** 新規アップロードを遅延させる
  * 超過時の挙動

    * presign発行はOK（※ただしcommit時に制御）
    * commit時に 429 を返して **作成を止める**（無駄な処理投入を防ぐ）

閾値（運用パラメータ / FIX）

* WARN：バックログ 10,000
* HARD：バックログ 30,000（HARD中はcommit一律429）

---

## 5) チケット化（FIX）

以下の条件で **abuse_storage_alert** を自動起票

* 日次上限（作品数 or バイト）に **3日連続**で到達
* 5分上限に **1日に5回以上**到達
* キューHARD期間中に **繰り返しcommit**してくる

チケットpayloadに保存（最小）

* user_id
* 到達した上限種別（day/hour/5min/bytes/queue）
* 回数/期間
* 直近のrequest_id

※自動停止はしない（人が判断）

---

## 6) 例外（FIX）

* Adminによる手動Pro付与/剥奪とは独立
* Proでも上限は同じ（初期FIX）
  ※将来「Proは上限緩和」をやりたければ追加仕様で対応

---
