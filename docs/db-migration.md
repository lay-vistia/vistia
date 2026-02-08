# DB マイグレーション実行手順

## 目的
`docs/db-schema.md` に基づく SQL マイグレーションを適用する。

## 前提
- PostgreSQL が起動済み
- `DATABASE_URL` が設定済み
- ルートディレクトリで実行

## 実行コマンド
```bash
npm run db:migrate
```

## 動作
- `packages/db/migrations/*.sql` をファイル名昇順で適用
- `schema_migrations` テーブルで適用済みを管理
- 適用済みファイルは `skip` される
- 各 migration はトランザクションで実行される

## 失敗時
- 該当 migration はロールバックされる
- エラーを修正後、再実行する

## 注意
- `createdAt`/`updatedAt` の運用は `docs/db-schema.md` を唯一の正とする
- 不明点は `docs/open-questions.md` に追記してから実装する

## 補足（運用）
- RDS Proxy 経由での接続が前提
- どうしても VPC 外から実行する場合は、一時的に RDS を Public にして実行し、完了後に必ず戻す
