# Vistia Admin 仕様（FIX / v1.3）

## 1. ドメイン/URL
- Admin：`https://admin.vistia.studio/`

---

## 2. 認証/ログイン
### 2.1 ログイン方式
- メール＋パスワードのみ（ソーシャルログインなし）
- 二要素認証（2FA）必須

### 2.2 2FA方式
- メールOTP

### 2.3 Adminアカウント作成
- 招待制

### 2.4 招待フロー
- 招待リンク（token）を発行し、受け取ったユーザーが初回パスワードを設定する
- 招待リンク token 有効期限：24時間

---

## 3. Adminロール
- Owner
- Admin
- Support
- Designer

### 3.1 Owner専用権限
- Adminユーザーの招待/削除
- ロール変更（Ownerのみ）
- Stripe設定/環境変数の閲覧
- システム設定（メンテナンスモード等）

### 3.2 Support権限制限
- Support は一般ユーザー停止（BAN）権限を持たない
- Support は HIDE の付与はできない（解除のみ可能）
- Support は 対象削除（論理削除）を実行できない

### 3.3 Designer権限
- テーマのテンプレ/既定値のみ編集できる（ユーザー/投稿/チケット操作は不可）

---

## 4. 一般ユーザー停止（BAN）
### 4.1 BANの挙動
- Manage：ログイン可能
- Manage：投稿操作不可（許可操作以外は全て禁止）
- Manage：許可操作
  - 課金の解約
  - 退会（アカウント削除）
- Public：404

### 4.2 BAN解除
- 解除したら即時復帰（元の公開状態に戻る）

---

## 5. Adminによる非表示（HIDE）
### 5.1 方針
- Adminの「非表示」は HIDE（非表示フラグ）で統一する
- ユーザーが設定する Visibility（PUBLIC/UNLISTED/PRIVATE）とは別の上書きとする

### 5.2 HIDEの適用範囲
- post（作品）
- collection（コレクション）
- profile icon（アイコン）
- pin（ピン表示）
- free-page image（フリーページ画像）

### 5.3 Public側の見え方
- HIDEされた対象は Public で 404

### 5.4 HIDE付与の権限
- Owner / Admin のみ付与可能

### 5.5 HIDE解除の権限
- Owner / Admin / Support が解除可能

---

## 6. 削除（Adminアクション）
### 6.1 対象削除（post/collection/profile要素）
- チケット詳細から対象（post/collection/profile要素）を論理削除できる
- 論理削除 → 30日後に物理削除（Manageと同じ）
- Public：削除対象は 404
- 実行権限：Owner / Admin のみ

### 6.2 ユーザー退会（アカウント削除）
- Adminから退会（論理削除）を実行できる
- 退会の取り消し（復元）は30日以内なら可能（Manage仕様に準拠）

---

## 7. 監査ログ
### 7.1 方針
- 監査ログを取る（誰が・いつ・何をしたか）

### 7.2 保存期間
- 1年

### 7.3 必須ログ対象（必ず記録）
1. Adminログイン成功/失敗（2FA含む）
2. Adminユーザー招待/無効化/削除/ロール変更（Owner操作）
3. 一般ユーザーBAN/解除
4. 対象（post/collection/profile要素）のHIDE/解除
5. 対象削除（論理削除）/削除取り消し（復元）
6. チケットの作成/更新（status/priority/assignee/コメント/リンク）
7. システム設定変更（メンテモード等）
8. Stripe設定/環境変数の閲覧（Owner操作）

---

## 8. 画面（MVP）
- ダッシュボード（概要）
- 一般ユーザー一覧/検索
- 一般ユーザー詳細（BAN/解除、購読状態、投稿数など）
- 作品検索/詳細（HIDE/解除、削除、チケット参照）
- コレクション検索/詳細（HIDE/解除、削除、チケット参照）
- チケット一覧/詳細（通報＋自動検知＋手動起票の統合）
- 監査ログ
- Adminユーザー管理（招待/無効化/ロール変更）※Owner専用
- システム設定（メンテ/Stripe/環境変数閲覧）※Owner専用
- テーマテンプレ管理 ※Designer専用

---

## 9. チケット管理（通報＋自動検知の統合）
### 9.1 方式
- すべてチケットに統一（通報も自動検知も同じ一覧で管理）

### 9.2 チケット種別
- `REPORT`：ユーザー通報
- `AUTO`：自動検知（モデレーションAPI）
- `MANUAL`：Admin手動起票
※異議申し立ては新チケットを作らず、元チケット内で処理する。

### 9.3 チケット対象
- 作品（post）
- コレクション（collection）
- プロフィール要素（アイコン / ピン画像 / フリーページ内画像）

### 9.4 ステータス
- `OPEN / IN_PROGRESS / ESCALATED / RESOLVED / CLOSED`

### 9.5 優先度
- `LOW / MEDIUM / HIGH / CRITICAL`

### 9.6 担当者
- 担当者フィールドあり（Adminユーザーにアサイン可能）

### 9.7 期限（SLA）
- 期限フィールドなし

---

## 10. モデレーション（自動検知）
### 10.1 ベンダー
- AWS Rekognition（DetectModerationLabels）

### 10.2 タイミング
- アップロード直後に即スキャン
- 閾値超えで `AUTO` チケットを起票

### 10.3 自動ブロック
- 自動ではブロックしない（チケット起票のみ、対応はAdmin判断）

### 10.4 結果の保持
- Rekognitionレスポンス全文をチケットに保存する

### 10.5 起票条件（閾値）
- スコア閾値（3段階）：
  - LOW：0.60 以上
  - MEDIUM：0.75 以上
  - HIGH：0.90 以上
- CRITICALは自動では付与しない（人が上げる）

---

## 11. カテゴリ設計（2本立て）
### 11.1 方針
- 通報（人間向け）とAUTO（Rekognition向け）を分ける
- チケットには以下を保存する
  - AUTOカテゴリ（1つ）
  - Rekognitionラベル全文（スコア含む）
  - 通報カテゴリ（ユーザー通報、または自動マッピング結果）

### 11.2 AUTOカテゴリ（Rekognition向け：9個）
1. Sexual Content / Nudity
2. Suggestive
3. Violence / Graphic Violence
4. Visually Disturbing
5. Self-Harm
6. Hate Symbols
7. Drugs
8. Weapons
9. Unknown / Other

### 11.3 通報カテゴリ（人間向け：13個）
1. 性的（成人）
2. 児童の性的/搾取の疑い（CSAM疑い）
3. 暴力/残虐
4. 自傷/自殺
5. ヘイト/差別
6. 嫌がらせ/いじめ（Harassment）
7. 違法/規制薬物
8. 武器/危険物
9. 個人情報（晒し）
10. 著作権/商標
11. なりすまし
12. スパム/詐欺
13. その他

### 11.4 AUTO → 通報カテゴリの自動マッピング（v1）
- Sexual Content / Nudity → 性的（成人）
- Suggestive → 性的（成人）
- Violence / Graphic Violence → 暴力/残虐
- Visually Disturbing → 暴力/残虐
- Self-Harm → 自傷/自殺
- Hate Symbols → ヘイト/差別
- Drugs → 違法/規制薬物
- Weapons → 武器/危険物
- Unknown / Other → その他

※個人情報（晒し）/ 著作権/商標 / なりすまし / スパム/詐欺 / 嫌がらせ は Rekognition単体では確度が出ない想定のため、
AUTOでは原則起票しない（REPORT/MANUALで扱うか、人がカテゴリ付けする）。

---

## 12. 通報（Report）
### 12.1 通報フォーム入力
- 理由カテゴリ（選択）
- 自由記述（任意）
- 連絡用メールアドレス（任意）

### 12.2 レート制限
- IP単位：1時間に10回まで

---

## 13. チケット一覧（検索/フィルタ）
フィルタ（全て実装）：
- status
- priority
- type（REPORT/AUTO/MANUAL）
- 対象種別（post/collection/profile）
- handle / userId
- 作成日レンジ
- 通報カテゴリ（13分類）
- AUTOカテゴリ（9分類）

---

## 14. チケット詳細でできる操作（MVP）
- 対象のHIDE（非表示）
- HIDEの解除
- ユーザーBAN/解除
- チケットにコメント（内部メモ）
- ステータス変更
- 優先度変更
- 証跡（スクショ/ログ）登録：URLのみ（添付ファイルは持たない）
- ユーザー通知（Manage内通知）
- 対象の削除（論理削除）

---

## 15. ユーザー通知（Manage内通知）
- ユーザーへの通知はメールではなく、Manage内通知で行う
- UI：通知センター（ベル）/ 未読数 / 通知一覧
