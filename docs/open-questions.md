# オープンな質問（クローズ済み）

## 1. Manage API の `userId` 取得方法
状態：クローズ
結論：Auth.js セッションに `userId` を入れ、`apps/manage` の Route Handler 内で `getServerSession` を使って取得する。

## 2. Auth.js での `userId` 発行・保存タイミング
状態：クローズ
結論：サーバー側で `uuidv7()` により `userId` を生成し、`users` 作成後に `auth_accounts` を `userId` で紐付ける。Auth.js の `jwt/session` に `userId` を載せる。

## 3. EMAIL プロバイダ方式
状態：クローズ
結論：パスワード認証（自前）を採用する。

## 4. Auth.js 環境変数名
状態：クローズ
結論：以下を採用する。
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `TWITTER_CLIENT_ID`
- `TWITTER_CLIENT_SECRET`
- `TIKTOK_CLIENT_ID`
- `TIKTOK_CLIENT_SECRET`

## 5. OAuth 初回ログイン時のユーザー作成フロー
状態：クローズ
結論：初回は onboarding に進み、`handle/displayName` 入力後にユーザーを作成する。既存ユーザー未登録の場合の初回作成を許可する。

## 6. 新規作成ページの必須入力
状態：クローズ
結論：ログイン方法選択画面を設け、Email は `email/password` 入力で作成、OAuth は各作成ボタンから開始する。ユーザー作成時に `handle/displayName` 入力画面へ遷移する。

## 7. OAuth 初回時のセッションと遷移
状態：クローズ
結論：OAuth 直後の仮作成は許可、オンボーディング前にセッション確立は許可、完了後は LP に誘導して再ログインさせる。

## 8. DB スキーマ制約との整合
状態：クローズ
結論：仮ユーザー用テーブルは追加しない。初回作成時に `handle/displayName` を必須にする。

## 9. OAuth 初回時の具体策
状態：クローズ
結論：`handle/displayName` をその場で入力してから `users` を作成する。

---

# 追加TODO

## 10. Manageの新規作成（Email）の実行基盤
状態：クローズ
質問：`/api/auth/signup` の実行先を Lambda Function URL にする場合、エンドポイントURLと認証方式をどうするか。
デフォルト案：`SIGNUP_ENDPOINT` に Function URL を設定し、必要なら `SIGNUP_API_KEY` を `x-api-key` で渡す。
回答：それでいい

## 11. 本番の Signup エンドポイント（API Gateway への移行）
状態：クローズ
質問：本番では Function URL のままにするか、API Gateway + WAF に移行するか。
デフォルト案：dev は Function URL、prod は API Gateway + WAF + レート制限。
回答：それでいい
