# Vistia Admin 仕様（FIX / v1.4）

## 1. ドメイン/URL
- Admin：`https://admin.vistia.studio/`

---

## 2. 認証/ログイン
- メール＋パスワードのみ（ソーシャルログインなし）
- 二要素認証（2FA）必須（メールOTP）
- Adminアカウント作成：招待制
- 招待リンク token 有効期限：24時間

---

## 3. Adminロール
- Owner
- Admin
- Support
- Designer

### 3.1 Owner専用権限
- Adminユーザーの招待/削除
- ロール変更（Ownerだけ）
- Stripe設定/環境変数の閲覧
- システム設定

### 3.2 Support権限制限
- BAN：不可
- HIDE付与：不可（解除のみ可）
- 対象削除（論理削除）：不可

### 3.3 Designer権限
- テーマのテンプレ/既定値のみ編集できる（ユーザー/投稿/チケット操作不可）

---

## 4. 一般ユーザー停止（BAN）
- Manage：ログイン可能
- Manage：投稿操作不可
- Manage：許可操作
  - 課金の解約
  - 退会（アカウント削除）
- Public：404
- BAN解除：即時復帰

---

## 5. Adminによる非表示（HIDE）
### 5.1 方針
- Adminの「非表示」は HIDE（非表示フラグ）で統一
- ユーザーのVisibility（PUBLIC/UNLISTED/PRIVATE）とは別の上書き

### 5.2 対象
- post（作品）
- collection（コレクション）
- profile icon（アイコン）
- pin（ピン表示）
- free-page image（フリーページ画像）

### 5.3 Public側
- HIDEされた対象は Public で 404

### 5.4 権限
- HIDE付与：Owner / Admin
- HIDE解除：Owner / Admin / Support

---

## 6. 削除（Adminアクション）
### 6.1 対象削除（post/collection/profile要素）
- チケット詳細から対象を論理削除できる
- 論理削除 → 30日後に物理削除
- Public：削除対象は 404
- 実行権限：Owner / Admin

### 6.2 ユーザー退会（アカウント削除）
- Adminから退会（論理削除）を実行できる
- 退会の取り消し（復元）は30日以内なら可能（Manage仕様に準拠）

---

## 7. 監査ログ
- 保存期間：1年
- 必須ログ対象：
  1. Adminログイン成功/失敗（2FA含む）
  2. Adminユーザー招待/無効化/削除/ロール変更（Owner操作）
  3. 一般ユーザーBAN/解除
  4. 対象（post/collection/profile要素）のHIDE/解除
  5. 対象削除（論理削除）/削除取り消し（復元）
  6. チケットの作成/更新（status/priority/assignee/コメント/リンク）
  7. システム設定変更（メンテ等）
  8. Stripe設定/環境変数の閲覧（Owner操作）

---

## 8. 画面（MVP）
- ダッシュボード
- 一般ユーザー一覧/検索、詳細（BAN/解除、購読状態など）
- 作品検索/詳細（HIDE/解除、削除、チケット参照）
- コレクション検索/詳細（HIDE/解除、削除、チケット参照）
- チケット一覧/詳細（通報＋自動検知＋手動起票の統合）
- 監査ログ
- Adminユーザー管理（Owner）
- システム設定（Owner）
- テーマテンプレ管理（Designer）

---

## 9. チケット管理（統合）
- すべてチケットに統一
- 種別：
  - `REPORT`（ユーザー通報）
  - `AUTO`（自動検知）
  - `MANUAL`（Admin手動）
- 異議申し立て：新規チケットは作らず、元チケット内で処理

### 9.1 対象
- post
- collection
- profile要素（icon / pin / free-page image）

### 9.2 ステータス
- `OPEN / IN_PROGRESS / ESCALATED / RESOLVED / CLOSED`

### 9.3 優先度
- `LOW / MEDIUM / HIGH / CRITICAL`
- CRITICALは自動では付与しない（人が上げる）

### 9.4 操作（MVP）
- 対象HIDE / 解除
- ユーザーBAN / 解除
- コメント（内部メモ）
- status変更、priority変更
- 証跡：URLのみ
- ユーザー通知（Manage内通知）
- 対象削除（論理削除）

---

## 10. モデレーション（自動検知）
### 10.1 ベンダー
- AWS Rekognition（DetectModerationLabels）

### 10.2 対象画像
- optimized（表示用1280 JPEG）をスキャンする

### 10.3 パラメータ
- MinConfidence：60

### 10.4 起票条件
- いずれかのラベルが 0.60以上なら起票（LOWでも起票）
- 優先度：
  - 0.60–0.749 → LOW
  - 0.75–0.899 → MEDIUM
  - 0.90以上 → HIGH

### 10.5 重複ポリシー
- `assetId` ごとに `AUTO` チケットは1件のみ
- 再スキャン時は既存AUTOチケットに結果を追記/更新（履歴として残す）

---

## 11. カテゴリ設計（2本立て）
### 11.1 AUTOカテゴリ（Rekognition向け：9個）
1. Sexual Content / Nudity
2. Suggestive
3. Violence / Graphic Violence
4. Visually Disturbing
5. Self-Harm
6. Hate Symbols
7. Drugs
8. Weapons
9. Unknown / Other

### 11.2 通報カテゴリ（人間向け：13個）
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

### 11.3 AUTO → 通報カテゴリ 自動マッピング（v1）
- Sexual Content / Nudity → 性的（成人）
- Suggestive → 性的（成人）
- Violence / Graphic Violence → 暴力/残虐
- Visually Disturbing → 暴力/残虐
- Self-Harm → 自傷/自殺
- Hate Symbols → ヘイト/差別
- Drugs → 違法/規制薬物
- Weapons → 武器/危険物
- Unknown / Other → その他

---

## 12. 通報（Report）
- 入力：
  - 理由カテゴリ（13分類、必須）
  - 自由記述（任意）
  - 連絡用メールアドレス（任意）
- レート制限：IP単位で1時間10回
