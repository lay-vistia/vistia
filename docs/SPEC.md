# Vistia 仕様書（SOT / SPEC(2) 完全統合版）
Version: 2026-02-03（統合生成）
Status: FIX（本文内で未確定があれば明示する）

この文書は「何をするか（プロダクト仕様）」を定義する。
実装方法（AWS構成、DB設計、ジョブ構成、WAFルール詳細、Lambda/Queue構成など）は `DESIGN.md` に記載する。

---

# 0. 環境前提（FIX）

## 0.1 開発環境（FIX）
- GitHub Codespaces
- Amazon RDS（開発用DB）
  - 開発は直開放OK（ユーザー判断）

## 0.2 本番環境（FIX）
- AWS Amplify（Public / Manage / Admin のホスティング）
- Amazon RDS（本番DB）
- Amazon S3（画像保存：original + display + thumb）
- CloudFront（画像配信用）
- API Gateway + Lambda（API）
- SES（メール送信）
- リージョン：大阪（ap-northeast-3）

---

# 1. ドメイン（FIX）
- Public：`vistia.studio`
- Manage：`manage.vistia.studio`
- Admin：`admin.vistia.studio`
- API：`api.vistia.studio`
- 画像配信：`img.vistia.studio`

---

# 2. 時刻・タイムゾーン（FIX：JST固定）

## 2.1 基準（FIX）
- サービス全体の基準タイムゾーンは **日本時間（JST / Asia/Tokyo）**
- 期限判定・日次集計・上限カウントなど、**すべてJST基準**で行う

## 2.2 判定ルール（FIX）
- 有効/無効、期限切れ、パージ対象などの判定は **JSTの now** で行う
- “30日後パージ” は `deleted_at（JST） + 30日` を超えたら対象
- “1日上限” “1時間上限” などの時間窓は **JST** で区切る（0:00〜23:59）

## 2.3 保存と表示（FIX）
- DBに保存する時刻は **JSTとして解釈できる形で統一**する
  - 実装都合で `timestamptz` を使っても「判定基準はJST固定」
- UI表示も **JSTで表示**する（変換不要）

---

# 3. 認証（FIX）

> **統合結果（矛盾解消）**  
> Manageのログイン方式は **Email + Password / Google / X** に統一する（Magic Linkは廃止）。  
> 連携は勝手に行わず、ユーザー操作のみ。ユーザー作成は新規作成ボタンからのみ。

## 3.1 共通（FIX）
- セッション：**DBセッション（HttpOnly Cookie）**
- トークンは平文保存しない（DBには sha256 hash を保存）
- 「メールアドレスがなかったら未登録ですと返す」
- 「連携は勝手にやらない（メール一致などで自動統合しない）」
- 「ユーザーを作成するときは新規作成ボタンから（ログイン経路で作成しない）」

---

## 3.2 Manage（FIX）

### 3.2.1 ログイン方式（FIX）
- **Email + Password**
- Google
- X

### 3.2.2 セッション（FIX）
- Cookie：`manage_session`
- 属性：
  - HttpOnly
  - SameSite=Lax
  - Secure：本番ON
- セッション保存：`manage_sessions`
  - tokenはsha256で保存

### 3.2.3 画面構成（FIX：ログインと新規作成を完全分離）
- ログイン画面：
  - `メールアドレス`
  - `パスワード`
  - ボタン：`ログイン`
  - ボタン：`新規作成`
  - リンク：`パスワードを忘れた`
  - ボタン：`Googleでログイン`
  - ボタン：`Xでログイン`
- 新規作成画面：
  - `Emailで新規作成`
  - `Googleで新規作成`
  - `Xで新規作成`

### 3.2.4 Email+Password 新規作成（FIX）
- 入力：
  - email（必須）
  - password（必須）
- email正規化（FIX）
  - 前後トリム
  - case-insensitiveで比較
- emailが既に使われている場合：作成不可
  - 文言：`このメールアドレスは使用されています。`
- passwordルール（FIX）
  - 最少：**8文字**
  - 最大：**72文字**
  - 空白のみ不可
  - 強ハッシュ保存（平文禁止）
- 作成時の挙動（FIX）
  - ユーザー作成は **新規作成ボタンからのみ**
  - 作成完了後は **そのままログインしてセッション発行**

### 3.2.5 Email+Password ログイン（FIX）
- 失敗時文言（FIX）
  - email未登録：`未登録です`
  - password不一致：`メールアドレスまたはパスワードが違います。`
  - レート制限：`現在アクセスを制限しています。時間をおいてお試しください。`

### 3.2.6 パスワードリセット（FIX）
- リセット要求：
  - email未登録：`未登録です`
  - 登録済み：`送信しました`
- リセットtoken（FIX）
  - ワンタイム
  - 有効期限：**30分**
  - 同時に有効なのは **最新1つのみ**
  - DB保存：tokenは平文ではなくsha256 hash
- 新パスワードは上記パスワード規約（最少8文字）を適用

### 3.2.7 OAuth（Google / X）ログイン（FIX）
- ログインできるのは **連携済みユーザーのみ**
- 未連携の場合：
  - 文言：`未連携です`
- providerがメールを返しても、既存ユーザーとの自動統合はしない（勝手に連携しない）

### 3.2.8 OAuth（Google / X）新規作成（FIX）
- 新規作成画面から開始した場合のみユーザー作成を許可
- 既に同じ `provider + provider_user_id` が存在する場合は作成不可
  - 文言：`すでに登録されています`
- Xでメールが取れない場合：ユーザーは **メール無しでも作成可**（OAuth連携が最低1手段になる）

### 3.2.9 連携（ログイン後のアカウント連携）（FIX）
- Manageログイン後の設定画面に「連携」メニュー（例：`/settings/auth`）
- 連携は **ユーザー操作でのみ**（勝手に連携しない）

#### 連携条件（FIX）
- 連携したいproviderでOAuthを実施
- 取得した `provider + provider_user_id` が未使用なら連携成功
- 既に別ユーザーに紐付いている場合：
  - 連携不可
  - 文言：`このアカウントは別のユーザーで使用されています`

#### 解除（UNLINK）（更新FIX：追加/解除の両方あり）
- 解除は **提供する**
- ただし「ログイン手段が0になる場合」は解除禁止（最後のログイン手段ガード）
  - 文言：`ログイン方法がなくなるため解除できません。`
- 解除/連携/重大操作は再認証必須
  - Email+Password：パスワード再入力
  - OAuth：OAuth再認証

### 3.2.10 認証系レート制限（FIX）
- OAuth開始ボタン乱用対策：
  - IP単位：**1時間に60回まで**
  - 超過時：HTTP 429
  - 文言：`現在ログインを制限しています。時間をおいてお試しください。`
- ログイン試行の最低限レート制限（FIX）
  - 1IP：1分20回まで
  - 1アカウント：1分10回まで
- 重大操作（連携/解除/メール変更等）は再認証必須（上記）

---

## 3.3 Admin（FIX）

### 3.3.1 認証境界（FIX）
- Manageと完全分離（別アプリ/別認証境界）

### 3.3.2 ログイン方式（FIX）
- Email + Password + **2FA必須（TOTPのみ）**
- バックアップコード：10個（初回のみ表示、再発行で旧無効）

### 3.3.3 セッション（FIX）
- Cookie：`admin_session`
- 属性：
  - HttpOnly
  - SameSite=Strict
  - Secure：本番ON
- 有効期限：12時間
- 無操作タイムアウト：30分
- DBセッション（tokenはsha256で保存）

### 3.3.4 Adminパスワード規約（更新FIX）
- 最少：**8文字**
- 最大：72文字
- 文字種要件：要求しない
- 禁止：email同一、またはemailローカル部を含むものは禁止
- 変更時：全セッション破棄

### 3.3.5 初回2FAセットアップ（FIX）
- 初回ログイン後、必ず以下を完了するまでAdmin操作不可：
  - TOTPセットアップ（QR表示）
  - バックアップコード表示（10個、初回のみ）

### 3.3.6 バックアップコード（FIX）
- 10個
- 初回のみ表示
- 再発行で旧は即無効
- 使用されたコードは無効化

---

# 4. セキュリティ（FIX）

## 4.1 CORS（FIX）
- 許可オリジン（本番）
  - `vistia.studio`
  - `manage.vistia.studio`
  - `admin.vistia.studio`

## 4.2 CSRF（FIX）
- Cookieセッション前提でCSRF対策を必須化
- 方式：Originチェック + Double Submit（詳細はDESIGNで規定）

---

# 5. 公開範囲（Visibility）（FIX）

## 5.1 内部値（FIX）
- 作品（Work）：PUBLIC / UNLISTED / PRIVATE
- コレクション（Collection）：PUBLIC / UNLISTED / PRIVATE

## 5.2 本番UI文言（FIX）
- UI表記は以下に置換（内部値は維持）
  - PUBLIC → **公開**
  - UNLISTED → **限定**
  - PRIVATE → **非公開**

## 5.3 限定（UNLISTED）の基本（FIX）
- 作品/コレクション単位で **限定URL token 自動発行**
  - 無期限OK
- 限定 → 公開/非公開 に戻したら token無効化（revoked）
- 限定の広告：通常公開と同じ扱い
- プロフィール全体には限定URLを発行しない（作品/コレクション単位のみ）
- 限定閲覧は「閉じた閲覧」
  - 通常のギャラリー導線/一覧導線は出さない
  - ユーザー名/アイコンは表示してOK

---

# 6. 表示UI（FIX）

## 6.1 プロフィール表示順（FIX）
1. アイコン
2. 表示名
3. bio
4. ピン（Proのみ）
5. YouTube（任意・1つ）
6. ギャラリーボタン（別ページ遷移）
7. Links（6件表示＋「もっと見る」）

## 6.2 ギャラリー（FIX）
- `@handle` → 「ギャラリーを見る」→ `@handle/gallery`
- 無限スクロール
- 作品詳細：モーダル、スワイプで次/前、ルール表記なし
- コレクション導線：ギャラリー上部に「コレクション」ボタン
  - `@handle/gallery?c={collectionId(UUID)}`

## 6.3 YouTube（FIX）
- 埋め込み再生：1つだけ

## 6.4 並び順（FIX）
- Publicギャラリー：新着順のみ
- Public検索：しない（見せたいものはコレクション方針）
- Manage検索：タグ検索のみ（後述）

## 6.5 bio（更新FIX：改行あり）
- bioは改行あり（表示も改行を反映）
- 制限（FIX）
  - 最大文字数：160
  - 最大行数：3
  - 連続空行は禁止（空行は作れない）
  - 正規化：前後トリム、連続空白は1つ（改行は保持）

---

# 7. handle / display_name（FIX：完全定義）

## 7.1 handle ルール（文字種/長さ/変更/予約語）（FIX）
目的：URLの核なので厳密に固定する。

### 7.1.1 形式（FIX）
- handle は `@` なしで保存（表示時だけ `@handle`）
- 許可文字：**英小文字・数字・アンダースコア `_`・ドット `.`**
  - 正規表現：`^[a-z0-9_\.]+$`

### 7.1.2 先頭/末尾（FIX）
- 先頭：英小文字または数字（`_`/`.` 시작は禁止）
- 末尾：英小文字または数字（`_`/`.` 終端は禁止）

### 7.1.3 連続禁止（FIX）
- `..` 禁止
- `__` 禁止
- `._` / `_.` 禁止

### 7.1.4 文字数（FIX）
- 最小：3
- 最大：20

### 7.1.5 予約語（FIX）
- 予約語は禁止
  - 例：`admin, manage, api, img, support, help, terms, privacy, about, pricing`
- 予約語リストは追加可能（実体はDESIGNで管理）

### 7.1.6 大文字の扱い（FIX）
- 大文字入力は小文字に正規化して保存
- 重複判定も小文字

### 7.1.7 変更制限（FIX）
- handle変更：30日に1回まで、年2回まで

## 7.2 旧handleの扱い（更新FIX：90日で再利用可）
- handle変更後、旧handleは **即404**（リダイレクトしない）
- 旧handleは **90日間再利用不可**
- 90日経過後は **再利用可能**
  - 再利用は誰でも可能（元所有者の優先権は付けない：初期FIX）

## 7.3 display_name ルール（FIX）
目的：見た目の名前。荒らしと表示崩れを防ぎつつ自由度は高め。

- 最小：1文字
- 最大：30文字
- Unicode可（絵文字OK）
- 改行禁止、制御文字禁止
- 正規化：前後トリム、連続空白は1つ
- 変更：回数制限なし（ただしレート制限）
  - 1分に3回まで（超過429）

---

# 8. Links（FIX：無制限・ラベル自由・説明文あり）

## 8.1 Linksデータ仕様（FIX）
- Linksは無制限
- 各Linkは以下を持つ：
  - `url`（必須）
  - `label`（必須・自由入力）
  - `description`（任意・自由入力）
  - `order_index`（並び順、ユーザーが並び替え可能）

## 8.2 入力制約（FIX）
- `url`
  - httpsのみ許可（`http://` は拒否）
  - 前後トリム
  - URLとしてパースできないものは拒否
- `label`
  - 1〜30文字（Unicode可、絵文字OK）
  - 前後トリム、連続空白は1つ
- `description`
  - 0〜80文字（Unicode可）
  - 前後トリム、連続空白は1つ
- 重複
  - 同一URLの重複登録は禁止（ユーザー単位）

## 8.3 表示・セキュリティ（FIX）
- 新規タブで開く（`noopener,noreferrer`）
- `label` / `description` はHTMLとして解釈しない（常にテキスト表示）
- 悪用防止（FIX）
  - ローカル/プライベートIP、IP直指定、userinfo含むURL等は禁止（詳細はDESIGN）

## 8.4 Publicプロフィール表示（FIX）
- Linksブロックは **先頭6件のみ表示**
- 7件以上ある場合だけ「もっと見る」を表示

## 8.5 Links専用ページ（FIX：無制限対応）
- 「もっと見る」押下で Links専用ページへ遷移
  - URL：`/@handle/links`
- 表示内容：全Links（無制限）
- 並び順：`order_index` 昇順（同値は `created_at` 昇順）
- 表示項目：
  - `label`
  - `description`（ある場合のみ）
- ページング：無限スクロール
  - 1回の取得：50件
  - カーソルページング（cursor仕様はDESIGN）
- 検索：なし（初期FIX）
- 省略表示（FIX）
  - labelは30文字超で末尾…省略（全文ツールチップ無し）
  - descriptionは80文字超で末尾…省略

---

# 9. 作品（Work）（FIX）
- **1作品＝画像1枚**
- タイトルなし
- タグ：最大3、各10文字
- 画像差し替え不可（削除→新規）
- 削除：論理削除 → **30日後パージ**（ゴミ箱UI/復元UIなし）

---

# 10. ピン（FIX）
- Free：ピン無し
- Pro：ピン3つ
- ピン対象：作品のみ
- **PUBLIC作品のみピン可**
- ピンはモーダル表示なし、横スワイプで閲覧

---

# 11. コレクション（FIX）
- **Proのみ**
- コレクション数：無制限
- 作品の重複追加不可（collection_id, work_id unique）
- コレクション削除：作品は残る、紐づけだけ消す

## 11.1 混在ルール（FIX）
- PUBLICコレクション：PUBLIC作品のみ
- UNLISTEDコレクション：PUBLIC + UNLISTED作品
- PRIVATEコレクション：PUBLIC + UNLISTED + PRIVATE作品

## 11.2 整合ルール（FIX）
- コレクション側 visibility 変更で不整合が出る場合：**ブロック**
- 作品側 visibility 変更で不整合が出る場合：**自動で該当コレクションから外す**
  - in-app技術通知は出してOK

---

# 12. タグ・検索（FIX）

## 12.1 タグ仕様（FIX）
- 1タグ：1〜10文字
- 1作品：最大3タグ
- Unicode可（日本語OK）
- 絵文字OK
- 記号OK（制御文字は不可）
- 先頭が `#` の入力は許可するが、保存時に `#` は除去（正規化で処理）

## 12.2 タグ正規化（FIX）
保存前に必ず適用：
- 前後トリム
- 連続空白は1つに圧縮
- 先頭の `#` は除去（`###tag` → `tag` まで除去）
- case-insensitive比較
  - 保存時の見た目は入力維持でもOKだが比較はcase-insensitive
- 同一作品内での重複タグは禁止
  - 正規化後に重複していたら重複分は削除して3つ以内に収める

## 12.3 禁止語（FIX：初期はやらない）
- タグの禁止語リスト判定は初期は実施しない（運用コストと誤検知を避ける）

## 12.4 Manage検索（FIX）
- **タグ完全一致のみ（AND）**
- サジェストなし
- 検索入力にも正規化を適用
- 検索タグ数：1〜3（空は不可）

## 12.5 Public側（FIX）
- Public検索：なし
- Public表示でタグを見せるか：初期は表示しない（導線はコレクション方針）

---

# 13. 広告（FIX）
- Free：広告あり / Pro：広告なし
- 追従固定バナー（ページ下部）
- UIにかぶってOK、モーダル中も表示

---

# 14. 保存抑止（FIX）
- 右クリック/長押し/ドラッグ等：サムネ含め全面抑止方針
- 透かし：無し
- **originalは絶対に表示しない（display/thumbのみ配信）**
- 署名付きURL/Cookieは採用しない（保存抑止はベストエフォート）

---

# 15. 画像仕様（FIX）

## 15.1 制約（FIX）
- 最大：50MB
- 同時アップロード：5枚まで（＝最大5作品作成）

## 15.2 許可形式（FIX）
- 静止画のみ
- 許可：JPG / PNG / WebP / HEIF/HEIC
- 不許可：GIF（アニメ含む）、動画

## 15.3 HEIC/HEIF（FIX）
- 変換に失敗した場合はアップロード失敗（エラー返却）

## 15.4 透過PNG（FIX）
- display生成時に背景合成（**白に合成**）

## 15.5 生成物（FIX）
- display：長辺1280px、WebP、メタデータ除去、Orientation正規化
- thumb：正方形、JPEG、メタデータ除去、Orientation正規化

## 15.6 非同期処理（FIX）
- SQS + Lambda
- リトライ：5回
- 失敗時：再生成ボタン

## 15.7 thumbトリミング（FIX）
- 中央固定ではなく **フォーカス点指定**
  - Manageで画像をタップしてフォーカス点設定（ドラッグ不要）
  - 未指定は中央

---

# 16. 画像処理ステータス（FIX）
- Workごとに画像処理状態を持つ：
  - `UPLOADED`：originalアップロード完了（未処理）
  - `PROCESSING`：生成中
  - `READY`：display/thumb生成完了（表示可能）
  - `FAILED`：生成失敗（再生成待ち）
- インフラ通知・チケット化はしない（アプリ仕様では扱わない）
  - アプリ責務は状態表示と再生成導線まで

---

# 17. ストレージ（FIX）

## 17.1 バケット（FIX）
- `vistia-media-public`：display/thumb（配信用。CloudFront Origin）
- `vistia-media-private`：original（非配信用）

## 17.2 キー（FIX）
- original（private）
  - `original/work/{userId}/{workId}/{assetId}.{ext}`
  - `original/avatar/{userId}/{assetId}.{ext}`
- display（public）
  - `display/work/{userId}/{workId}/{assetId}.webp`
  - `display/avatar/{userId}/{assetId}.webp`
- thumb（public）
  - `thumb/work/{userId}/{workId}/{assetId}.jpg`
  - `thumb/avatar/{userId}/{assetId}.jpg`

## 17.3 originalのライフサイクル（FIX）
- original は **1日後にコールドへ移行**
- 自動削除はしない
- **作品パージ/ユーザーパージ時に関連オブジェクトを削除**

---

# 18. 画像配信（FIX）
- 画像URLは `img.vistia.studio`（CloudFront）
- CloudFront → S3 は OAC（S3公開OFF）
- Cache：不変URL前提で長期キャッシュ（immutable）

---

# 19. 公開側レスポンス統一（FIX）
- Public側は「見えない＝404」で統一
- 理由は出さない（404固定文言）

404固定文言（FIX）：`見つかりません。`

---

# 20. hide / delete の定義（FIX）

## 20.1 Work（作品）
- hide：Publicから非表示（404）、**Manageでは本人が見られる**（後述の制限付き）
- delete：論理削除→パージ（30日後）

## 20.2 Collection（コレクション）
- hide：Publicから非表示（404）、**Manageでは本人が見られる**
- delete：論理削除→パージ

## 20.3 User（ユーザー）
- suspended / deleted：Publicは404（理由なし）

---

# 21. Pro失効時の挙動（FIX）
- Pro判定：`pro_until`（Stripe/手動のmax）
- 失効時（FIX）
  - コレクション：編集/新規作成不可
  - ピン：新規固定不可、既存は解除扱い
  - 広告：Free扱い（広告あり）

---

# 22. 限定URL（UNLISTED token）（FIX + 更新FIX）

## 22.1 限定URLのURL（FIX）
- `https://vistia.studio/u/{token}`
- tokenはDBに平文保存しない（token_hash）

## 22.2 Free上限（FIX）
- Free：有効な限定tokenは **合計3つまで**（作品+コレクション合算）
- 4つ目を限定にしようとしたら **visibility変更をブロック**
- 文言：`限定URLの上限（3件）に達しています。解除してから追加してください。`
- Pro：無制限

## 22.3 限定URL管理UI（Manage）（FIX）
- `設定 > 限定URL`（例：`/settings/unlisted`）
- 一覧（有効tokenのみ）：
  - 種別（作品/コレクション）
  - サムネ
  - 作成日時（JST）
  - `コピー`
  - `非公開にして解除`
  - `対象へ移動`（Manageの詳細へ）

## 22.4 限定URL解除（更新FIX）
- 解除＝token revoked **＋対象を非公開（PRIVATE）へ変更**して解除
- すでに非公開なら tokenだけrevoked
- 通知：なし（ユーザー操作）

## 22.5 解除・再発行・visibility変更の確認（FIX）
- 限定リンク解除（revoke）は確認必須（誤操作防止）
- 限定 → 公開/非公開 への変更は確認必須
- 限定リンク再発行（リンク変更）も確認必須

## 22.6 限定リンクページの表示範囲（FIX：閉じた閲覧の具体）
- 通常ギャラリー導線/一覧導線は出さない
- ユーザー名/アイコン表示はOK
- 作品/コレクションの「作者プロフィール」へ戻る導線は出さない

## 22.7 限定リンクの広告（FIX）
- 限定リンクも通常公開と同じ扱い（Free=広告あり / Pro=広告なし）

## 22.8 限定リンクのOGP（FIX + 更新FIX）
- 限定リンクのOGPは **アイコンのみ**
  - 作品/コレクション画像はOGPに使わない

---

# 23. 共有リンク（Share token）（更新FIX：限定と別機能）

## 23.1 概念（FIX）
- **共有** と **限定（visibility/UNLISTED）** は別機能
  - 限定：一覧に出さない（公開範囲の制御）
  - 共有：URLを発行して配布する機能

## 23.2 URL（FIX）
- 共有リンク：`https://vistia.studio/s/{token}`
- 限定リンク：`https://vistia.studio/u/{token}`

## 23.3 上限（FIX）
- 共有リンクは **Freeでも無制限**
- 同一targetに複数share_token作成：許可（無制限）

## 23.4 閉じた閲覧（FIX）
- `/s/{token}` は閉じた閲覧
  - プロフィール/ギャラリー/コレクション一覧への導線を出さない
  - ユーザー名/アイコンは表示してOK

## 23.5 広告（FIX）
- `/s/{token}` も通常公開と同じ広告ルール

## 23.6 OGP（FIX）
- `og:image`：アイコンのみ
- `og:title`：`{display_name} (@{handle})`
- `og:description`：`Vistiaで作品を閲覧できます。`

## 23.7 失効条件（FIX）
- 対象が削除/運営delete/hide/ユーザー停止・退会 → 404（理由非表示）
- visibilityが **非公開** になった場合：
  - share_token は全revoked（事故防止）

---

# 24. チケット運用（FIX：Ticket-Centric）
- 通報・自動検知：すべてチケット化
- 自動削除/自動BANなし（人が判断）
- 公開側は理由非表示（404等）

## 24.1 ticket_type（FIX）
- `report`
- `nsfw_alert`
- `violence_gore_alert`
- `selfharm_alert`
- `abuse_storage_alert`
- `substance_alert`（薬物のみ。タバコ/アルコールは対象外）
- `manual`

## 24.2 優先度（FIX）
- 全部High

## 24.3 復旧/異議申立（FIX）
- 別チケットにせず同一チケットに `ticket_events` で積む

## 24.4 チケット再OPEN（FIX）
- CLOSEDは原則再オープンしない
- 例外：同一対象・同一論点・CLOSEDから30日以内なら `CLOSED → IN_PROGRESS` に戻す

---

# 25. 自動検知の明記（AIという単語は禁止 / FIX）
規約・PP・ガイドラインにのみ記載（UIには出さない）：

> サービスの安全性維持のため、投稿されたコンテンツは自動的に検知・評価される場合があります。  
> ただし、これらの検知結果のみをもとに、コンテンツの削除やアカウントの停止が行われることはありません。  
> 最終的な判断は、運営が行います。

---

# 26. Rekognition → チケット起票（FIX）
- サブタイプはVistia側で持たない（L2/L3はpayload保存のみ）
- 実行タイミング：**display生成成功後に1回だけ**（thumb再生成では実行しない）
- 自動検知失敗時：画像はREADYでOK、`manual` チケット起票
- 起票マッピング：nsfw/violence/selfharm/substance（薬物のみ、タバコ/アルコール除外）
- 閾値は運用パラメータとして調整可能

---

# 27. 「対象を見る」URL（更新FIX：チケット内参照リンク）

## 27.1 方針（FIX）
- チケットは対象参照（work_id / collection_id / user_id）を必ず持つ
- UIに「対象を見る」ボタンを出す
- Public URLではなく、Manage/Adminの認証付きビューへリンクする

## 27.2 Adminリンク（FIX）
- 作品：`admin.vistia.studio/works/{workId}`
- コレクション：`admin.vistia.studio/collections/{collectionId}`
- ユーザー：`admin.vistia.studio/users/{userId}`
- Adminは hide/delete/限定 でも閲覧可（ただし originalは出さない）

## 27.3 Manageリンク（FIX）
- 本人の対象のみ表示（owner_user_id == session_user_id）
- 作品：`manage.vistia.studio/works/{workId}`
- コレクション：`manage.vistia.studio/collections/{collectionId}`

---

# 28. 運営非公開（hide）中の表示（更新FIX）

## 28.1 表示範囲（FIX）
- Public：hide中は従来通り **404**
- Admin：フル閲覧可（display/thumbのみ）
- Manage（本人）：hide中でも **閲覧可（制限付き）**

## 28.2 hide中の制限（FIX）
- 共有ボタンを出さない
- 限定リンク関連（発行/再発行/解除/一覧導線）をすべて無効
- visibility変更UIを無効
- 上部に固定バナー（必須）：
  - `このコンテンツは運営により非公開になっています（公開範囲を変更しても公開されません）`

## 28.3 一覧で分かる表示（FIX）
- 作品カード/コレクションにステータスバッジ：`運営非公開`
- フィルタ：`運営非公開のみ`（任意だが入れてOK）

## 28.4 API制御（FIX）
- hide中に禁止する操作はUIだけでなくAPIでも403
  - 文言：`権限がありません。`

---

# 29. ユーザー通知（FIX）
- in-app通知：必須（OFF不可）
- メール通知：任意メールのみOFF可
- アカウント系・運営重大操作・支払い失敗：強制メール

---

# 30. in-app通知（FIX：既読 / 保持 / 最大件数 / 表示）

## 30.1 状態（FIX）
- `UNREAD` / `READ`
- 既読にできる
- 削除できない（初期FIX：運用・証跡優先）

## 30.2 保持（FIX）
- 180日保持
- 180日超は自動削除（物理削除OK）

## 30.3 最大件数（FIX）
- 1ユーザー最大1万件
- 超過時は古い順に削除（FIFO）

## 30.4 表示（Manage）（FIX）
- 新着順（created_at desc）
- カーソルページング：1ページ50件
- 未読バッジ：未読1件以上で表示、数字は最大`99+`

## 30.5 生成・配信（FIX）
- in-app通知は必ず生成
- メールはテンプレ設定とユーザー設定に従う（強制メールは例外）

---

# 31. 通知テンプレ（FIX：DB管理＋Admin編集）

## 31.1 基本（FIX）
- reason_codeごとにテンプレをDB管理、Admin画面で編集可能
- テンプレの「無効化」＝**メール送信OFF**（in-appは常に出る）

## 31.2 権限（FIX）
- 編集：Ownerのみ
- 閲覧：Owner/Moderator/Support
- 送信：Support/Moderator（テンプレ＋追記）

## 31.3 テーブル（FIX）
- `notification_templates`：reason_code unique / subject / body / email_enabled / updated_by / updated_at
- `notification_template_versions`：履歴・ロールバック

## 31.4 プレースホルダ（FIX：最小）
- `{{display_name}}`, `{{handle}}`, `{{action}}`, `{{effective_at}}`

## 31.5 `{{action}}` は固定辞書のみ（FIX）
- `{{action}}` に入る値は固定辞書から選ぶ（自由文で書き換えない）
- 自由文は「追記メモ」（後述）に入れる

### action辞書（FIX）
- `ACCOUNT_SUSPENDED` → `アカウントを停止しました`
- `ACCOUNT_RESTORED` → `アカウントの停止を解除しました`
- `WORK_HIDDEN_BY_ADMIN` → `作品を非公開にしました`
- `WORK_DELETED_BY_ADMIN` → `作品を削除しました`
- `COLLECTION_HIDDEN_BY_ADMIN` → `コレクションを非公開にしました`
- `COLLECTION_DELETED_BY_ADMIN` → `コレクションを削除しました`
- `TOKEN_REVOKED` → `限定リンクを解除しました`
- `PRO_GRANTED_MANUAL` → `Proを付与しました`
- `PRO_REVOKED_MANUAL` → `Proを解除しました`
- `SUBSCRIPTION_PAYMENT_FAILED` → `お支払いに失敗しました`

### `{{effective_at}}`（FIX）
- JST表示
- フォーマット固定：`YYYY/MM/DD HH:mm`

## 31.6 追記メモ（Support/Moderator追記）（FIX）
- Support/Moderatorが送信時に任意追加できる
- テンプレ本文の末尾に追加（上書きしない）
- メール・in-appの両方に同じ内容を付与

### 入力ルール（FIX）
- 0〜300文字
- 改行：可（最大5行）
- URL：可（httpsのみ、httpは弾く）
- HTMLタグは無効化（テキスト扱い）
- 正規化：前後トリム、連続空白1つ（改行は保持）
- 空の追記は付けない（完全省略）

### 表示（FIX）
- in-app：区切り線（例：`---`）の下に追記
- メール：本文末尾に区切りを入れて追記（件名は変えない）

### 監査・履歴（FIX）
- 送信した通知本文は送信時点の全文を保存
  - テンプレ本文（version）
  - 追記メモ
  - 合成後の最終本文
- audit_logsに actor / reason_code / template_version を記録

## 31.7 強制メール（テンプレOFF不可 reason_code）（FIX）
- `ACCOUNT_SUSPENDED`
- `ACCOUNT_RESTORED`
- `WORK_HIDDEN_BY_ADMIN`
- `WORK_DELETED_BY_ADMIN`
- `COLLECTION_HIDDEN_BY_ADMIN`
- `COLLECTION_DELETED_BY_ADMIN`
- `TOKEN_REVOKED`
- `PRO_GRANTED_MANUAL`
- `PRO_REVOKED_MANUAL`
- `SUBSCRIPTION_PAYMENT_FAILED`

## 31.8 ユーザー側メール設定（FIX）
- `users.email_optional_enabled`（任意メールのみ）
- 判定：
  - 強制メール：必ず送る（テンプレOFF不可、ユーザーOFF無視、バウンス抑止も無視）
  - 任意メール：テンプレON AND ユーザーON AND バウンスしてない

## 31.9 reason_codeの日本語ラベル紐づけ（FIX）
- reason_codeは内部キー
- UIには日本語ラベルを併記できる
- 初期はアプリ側の静的辞書で対応（DB多言語管理は後回し）

---

# 32. メール送信判定（FIX補強）

## 32.1 バウンス（FIX）
- 任意メール：バウンスしたら停止
- 強制メール：送る（ただし complaintは例外、後述）

## 32.2 SES complaint（苦情）と強制メールの扱い（FIX）
- `users.email_complained`（true/false）を持つ
- SES complaint受信で `true` にする
- `true` は自動で戻さない（解除は運営操作のみ）

### 送信判定（FIX）
- 任意メール：`email_complained = true` なら必ず送らない
- 強制メール：`email_complained = true` なら **送らない**（唯一の例外条件）
- 代替：in-app通知は必ず送る

> 強制メールが送れない条件は以下のどちらか：
> - `users.email` が無い
> - `email_complained = true`

### 記録（FIX）
- complaintで強制メール送信をスキップした場合もdeliveryログを残す
  - status：`SKIPPED`
  - reason：`COMPLAINT_SUPPRESSION`

### 運営操作（FIX）
- `email_complained` 解除はOwnerのみ
- audit_logsに記録（重大操作）

---

# 33. Admin RBAC（FIX）
- Owner：全権、Adminユーザー作成/権限変更はOwnerのみ
- Moderator：チケット対応、非公開/削除/token無効、ユーザー停止権限あり
- Designer：デザインマスタ管理のみ（デザインマスタは後回し）
- Support：閲覧中心＋通知送信（テンプレ＋追記）
- 重大操作（停止/解除、削除、Pro剥奪、token無効）：入力確認必須（スマホ前提）

---

# 34. Stripe（FIX）
- 課金手段：Stripeのみ
- Checkout/Portal/Webhook
- Admin：Stripe無しでPro付与/剥奪可能
- Webhook：署名検証、event_id冪等
- 手動Pro優先（実効 `pro_until = max(stripe, manual)`）

---

# 35. 削除/パージ（FIX）

## 35.1 作品（FIX）
- 論理削除 → token即revoked → collection_items即削除 → 30日後S3/DB削除

## 35.2 コレクション（FIX）
- 論理削除 → token即revoked → 30日後DB削除

## 35.3 ユーザー退会（FIX）
- 退会：取り消し可
  - 退会：`deleted_at`, `is_suspended`, 全セッション破棄, Publicは404
  - 取り消し：30日以内OK（reactivateリンク、token 24h、最新のみ有効、発行上限1時間3回）
  - パージ時：
    - Stripe購読が残ってたら必ず解約
    - S3全削除
    - DB物理削除
  - audit/ticketsは保持

## 35.4 退会の「取り消しリンク」運用（FIX：UI/文言/発行制限/有効性）
- 退会中ユーザー：
  - Public：404
  - Manage：ログイン不可
- 取り消しリンク発行入口（FIX）
  - Manageログイン画面に「退会を取り消す」リンク
  - クリック → メール入力フォーム（ログイン機能とは別）
- 発行リクエストの返答（FIX）
  - emailが退会ユーザーとして存在しない：`未登録です`
  - 対象が退会ユーザー：`送信しました`
- token（FIX）
  - 有効期限：24時間
  - 最新のみ有効
  - 発行上限：1時間3回
- 取り消し実行（FIX）
  - 成功で `deleted_at` を戻す（復帰）
  - 復帰時のセッション発行はDESIGN側（仕様上は「復帰できる」ことが要件）

## 35.5 退会の実行確認（FIX：誤操作防止）
- 退会は確認必須（スマホ前提）
  - 確認文言/入力確認の詳細はDESIGN

---

# 36. パージ監視（更新FIX：インフラ通知なし・チケット化しない）
- パージジョブの成否は audit_logs に記録するだけ
- manualチケットは起票しない
- ユーザー通知もしない
- 失敗検知はAWS側監視（CloudWatch等）で行う（アプリ仕様では扱わない）

---

# 37. SES運用（FIX）
- From：`noreply@vistia.studio`
- Reply-To：`support@vistia.studio`（認証系はnoreply）
- バウンス/苦情：SNS→SQS→Lambda→DB反映
- 任意メール：バウンス時停止
- 強制メール：送る（deliveryに結果記録、ただし complaint例外は§32）

---

# 38. 監査ログ（FIX）
- audit_logs 最低セット（Admin重大操作、画像処理、パージ、Stripe webhook、退会/取消 等）
- meta最低限：request_id、before/after（ロール/テンプレ変更）、reason_code（通知系）
- 保持：DB90日、S3 1年、以降コールド

---

# 39. 一般APIレート制限（FIX：全体方針）
目的：乱用・スパム・DoSの足回りを抑える（アップロード悪用対策とは別枠）

## 39.1 方針（FIX）
- Public/Manage/Admin すべてのAPIにレート制限を適用
- 単位はIPを基本にし、可能な範囲でユーザーIDでも追加制限
- 超過時はHTTP429、文言固定：
  - `現在アクセスを制限しています。時間をおいてお試しください。`
- 画像配信（`img.vistia.studio`）は対象外（CDNに任せる）

## 39.2 初期値（FIX）
- Public API（閲覧系）
  - IP：1分120
  - IP：1時間5,000
- Manage API（ログイン以外）
  - user_id：1分60
  - IP：1分120
- Admin API
  - admin_user_id：1分60
  - IP：1分120

## 39.3 認証系例外（FIX）
- 認証系は専用制限（§3.2.10等）を優先
- AdminのTOTP失敗ロック等は別FIXを優先（詳細はDESIGN）

---

# 40. APIバージョニング（/v1）と互換ポリシー（FIX）

## 40.1 URL構造（FIX）
- APIはURLにバージョンを含める
  - `https://api.vistia.studio/v1/...`
- Public/Manage/AdminすべてのAPIで `/v1` を付与（内部の呼び分けはDESIGN）

## 40.2 互換ポリシー（FIX）
- breaking change（互換破壊）は `/v1` では行わない（必要なら `/v2`）
- `/v1` で許可する変更
  - レスポンスにフィールド追加（既存の意味を変えない）
  - 新しいエンドポイント追加
  - バリデーション強化（既存正当入力を壊さない範囲）

## 40.3 廃止ポリシー（FIX）
- `/v2` を出した場合 `/v1` は最低12か月維持
- 廃止90日前までに告知（Manage内通知でOK）
- 廃止後は `/v1` は404でよい（理由表示なし）

## 40.4 クライアント識別（FIX）
- `X-Request-Id` を付与（無ければサーバー生成）
- 可能なら `X-Client`（`public|manage|admin`）を初期から付けてOK

---

# 41. エラー応答・メッセージ方針（FIX：理由を出さない / 固定文言）
目的：悪用者に情報を渡さず、UIとAPIの挙動を統一する。

## 41.1 基本方針（FIX）
- Public側は「見えない＝404」で統一
- Manage/Admin/APIのエラーは原因詳細を出しすぎない
- UI文言は原則固定（ケースで出し分けしない）
- 仕様で明示的に許可したもの（例：`未登録です`）は例外として出す

## 41.2 HTTPステータス（FIX）
- 400：入力不正
- 401：未認証
- 403：権限不足
- 404：対象なし/非公開/削除/停止（Publicは原則これ）
- 409：競合（重複等）
- 429：レート制限
- 500：内部エラー

## 41.3 固定文言（FIX）
- 400：`入力が正しくありません。`
- 401：`ログインが必要です。`
- 403：`権限がありません。`
- 404：`見つかりません。`
- 409：`すでに存在します。`
- 429：`現在アクセスを制限しています。時間をおいてお試しください。`
- 500：`エラーが発生しました。時間をおいてお試しください。`

## 41.4 エラー詳細（FIX）
- クライアントには詳細理由を出さない
- サーバー側ログには request_id / error_code / stacktrace（必要なら）/ actor / resource_id を残す

## 41.5 国際化（FIX）
- 本番UI文言は日本語固定（初期FIX）
- 将来多言語化する場合のみ設計側で対応

---

# 42. 後回し（FIX）
- デザインマスタ中身（枠はFIX済み）
- 規約/PP/ガイドライン章立て・本文

---

# 43. 明示TBD（この文書内で未確定が残る場合のみ）
- Manageの「メールアドレス変更」仕様（許可するか、どう確認するか）
- Email verification（確認必須化）を将来的に導入するか
  - 現状はEmail+Passwordで運用し、必要なら後でFIXする

---
