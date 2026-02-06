# オープンな質問（未確定）

1. Manage の API で `userId` を取得する具体的な方法は？
   - Auth.js のセッションに `userId` を入れる想定ですか？
   - それとも `auth_accounts` から `providerUserId` / `email` で引く設計ですか？
   - セッション取得ヘルパ（例：`getServerSession`）の配置場所・使い方の指定があれば教えてください。
回答：
   - userIdはセッションに入れる：はい
   - セッション取得ヘルパ：getServerSession
   - 取得場所：apps/manage の Route Handler 内


2. Auth.js で `userId` をどのタイミングで発行・保存しますか？
   - `auth_accounts` と `users` の作成/紐付けのフローを指定してください。
   - OAuth の `token.sub` をそのまま `userId` とする設計ではない前提で進めてよいですか？
回答：
流れ（推奨）

サーバー側で uuidv7() で userId を生成
users に id=userId で作成
auth_accounts に userId を紐付けて作成
Auth.js の jwt/session で userId を載せる

3. EMAIL プロバイダの方式はどれですか？
   - パスワード認証（自前）
   - Magic Link（EmailProvider）
   - それ以外
回答：パスワード認証
4. Auth.js の設定値（例：`NEXTAUTH_URL` / `NEXTAUTH_SECRET` / SMTP/SES設定）で採用する環境変数名の規約はありますか？
回答：特にないから決めて
5. OAuth（Google / X / TikTok）で初回ログインしたユーザーの作成フローをどうしますか？
   - handle / displayName の入力タイミングを指定してください。
   - 既存ユーザーがいない場合に自動作成してよいですか？
回答：6を見てから再度質問して

6. 新規作成ページで必須にする入力項目は？
   - 例：handle / displayName / email / password など
回答：
新規作成ページでログイン方法を選択
メールアドレスとパスワードの入力欄があって「Emailで作成」ボタンを作る
OAuthについてはそれぞれのユーザー作成ボタンを作る
ユーザーができたらhandle displayNameを入力する画面へ遷移
7. OAuth 初回ログイン時のユーザー作成について、以下を確定してください。
   - OAuth 直後に仮ユーザーを作成してよいですか？（はい/いいえ）
   - handle/displayName の入力画面に遷移する前にセッションを確立してよいですか？（はい/いいえ）
   - handle/displayName 入力完了後に `users` を作成する場合、未作成の間はどのページへ誘導しますか？
回答：
- はい
- はい
- LPに誘導して、再度ログインさせる

8. 新規作成フローの「ユーザーができたら handle/displayName 入力」について、DBスキーマ上の必須項目と矛盾します。
   - `users.handle` と `users.displayName` は NOT NULL のため、作成時に必須です。
   - 2段階にする場合、仮ユーザー用テーブルを追加してよいですか？（はい/いいえ）
   - 追加しない場合、初回作成時に handle/displayName も必須にしてよいですか？（はい/いいえ）
回答：
   - いいえ
   - はい

9. OAuth 初回ログイン時の仮ユーザー作成について、DBスキーマの制約を満たす具体策を指定してください。
   - 例：仮ユーザー用テーブル追加 / handle/displayName をその場で入力 / OAuth 直後に生成する規則 など
回答：handle/displayName をその場で入力