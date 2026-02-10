# 環境変数一覧（使用済み）

## dev

### Amplify / Manage
- `NEXTAUTH_URL`: `https://dev.manage.vistia.studio`
- `NEXTAUTH_SECRET`: `bVyhOsD+8GOAJYdPY8EXF80K37m8n/fgLn9XtEmtZMU=`
- `GOOGLE_CLIENT_ID`: （未設定）
- `GOOGLE_CLIENT_SECRET`: （未設定）
- `TWITTER_CLIENT_ID`: （未設定）
- `TWITTER_CLIENT_SECRET`: （未設定）
- `TIKTOK_CLIENT_ID`: （未設定）
- `TIKTOK_CLIENT_SECRET`: （未設定）
- `DATABASE_URL`: `postgresql://vistia_admin:VdAQp2oCN6F2JeVroLVp@vistia-dev-db-proxy.proxy-c78qko2uox30.ap-northeast-3.rds.amazonaws.com:5432/vistia?sslmode=require`
- `SIGNUP_ENDPOINT`: `https://vh5uyvyohguybkdggnwlwiicwi0aumsj.lambda-url.ap-northeast-3.on.aws/`
- `SIGNUP_API_KEY`: `fyTguZHUbE+DgsbvXqhmwXz6zP/NeoGKz5WBZS8R0Ys=`
- `SIGNIN_ENDPOINT`: `https://m7muwiq4g63rmgcciag7wlxsdi0guwee.lambda-url.ap-northeast-3.on.aws/`
- `SIGNIN_API_KEY`: `FZa30BXB2c0D57r2+P+3asioKvSxVbX1xraWPuIctsM=`
- `ASSETS_BUCKET`: `vistia-dev-assets`
- `ASSETS_QUEUE_URL`: `https://sqs.ap-northeast-3.amazonaws.com/268431584619/vistia-dev-assets-queue`
- `APP_AWS_ACCESS_KEY_ID`: （削除）
- `APP_AWS_SECRET_ACCESS_KEY`: （削除）
- `APP_AWS_REGION`: `ap-northeast-3`

### Amplify / Public
- （未設定）

### Amplify / Admin
- （未設定）

### Lambda / Processor
- `ASSETS_BUCKET`: （未設定）
- `DATABASE_URL`: `postgresql://vistia_admin:VdAQp2oCN6F2JeVroLVp@vistia-dev-db-proxy.proxy-c78qko2uox30.ap-northeast-3.rds.amazonaws.com:5432/vistia?sslmode=require`
- `AWS_DEFAULT_REGION`: （未設定）

### Lambda / Manage Signup
- `DATABASE_URL`: `postgresql://vistia_admin:VdAQp2oCN6F2JeVroLVp@vistia-dev-db-proxy.proxy-c78qko2uox30.ap-northeast-3.rds.amazonaws.com:5432/vistia?sslmode=require`
- `SIGNUP_API_KEY`: `fyTguZHUbE+DgsbvXqhmwXz6zP/NeoGKz5WBZS8R0Ys=`

### Lambda / Manage Signin
- `DATABASE_URL`: `postgresql://vistia_admin:VdAQp2oCN6F2JeVroLVp@vistia-dev-db-proxy.proxy-c78qko2uox30.ap-northeast-3.rds.amazonaws.com:5432/vistia?sslmode=require`
- `SIGNIN_API_KEY`: `FZa30BXB2c0D57r2+P+3asioKvSxVbX1xraWPuIctsM=`

### Lambda / Inspect DB（devのみ）
- `INSPECT_API_KEY`: `LYEYpJKymw7bgjlCJjVh+8276O+0xrJZqIXpN/LKNRI=`
- `INSPECT_TABLES`: （必要に応じて設定。全許可なら "*"）
- `DATABASE_URL`: `postgresql://vistia_admin:VdAQp2oCN6F2JeVroLVp@vistia-dev-db-proxy.proxy-c78qko2uox30.ap-northeast-3.rds.amazonaws.com:5432/vistia?sslmode=require`

### Lambda / Manage Check User（devのみ）
- `DATABASE_URL`: `postgresql://vistia_admin:VdAQp2oCN6F2JeVroLVp@vistia-dev-db-proxy.proxy-c78qko2uox30.ap-northeast-3.rds.amazonaws.com:5432/vistia?sslmode=require`
- `SIGNUP_API_KEY`: `fyTguZHUbE+DgsbvXqhmwXz6zP/NeoGKz5WBZS8R0Ys=`

### Lambda / Manage Delete User（devのみ）
- `DATABASE_URL`: `postgresql://vistia_admin:VdAQp2oCN6F2JeVroLVp@vistia-dev-db-proxy.proxy-c78qko2uox30.ap-northeast-3.rds.amazonaws.com:5432/vistia?sslmode=require`
- `INSPECT_API_KEY`: `LYEYpJKymw7bgjlCJjVh+8276O+0xrJZqIXpN/LKNRI=`

## stg

### Amplify / Manage
- `NEXTAUTH_URL`: （未設定）
- `NEXTAUTH_SECRET`: （未設定）
- `GOOGLE_CLIENT_ID`: （未設定）
- `GOOGLE_CLIENT_SECRET`: （未設定）
- `TWITTER_CLIENT_ID`: （未設定）
- `TWITTER_CLIENT_SECRET`: （未設定）
- `TIKTOK_CLIENT_ID`: （未設定）
- `TIKTOK_CLIENT_SECRET`: （未設定）
- `DATABASE_URL`: （未設定）
- `SIGNUP_ENDPOINT`: （未設定）
- `SIGNUP_API_KEY`: （未設定）
- `SIGNIN_ENDPOINT`: （未設定）
- `SIGNIN_API_KEY`: （未設定）
- `ASSETS_BUCKET`: （未設定）
- `ASSETS_QUEUE_URL`: （未設定）
- `AWS_REGION`: （未設定）

### Amplify / Public
- （未設定）

### Amplify / Admin
- （未設定）

### Lambda / Processor
- `ASSETS_BUCKET`: （未設定）
- `DATABASE_URL`: （未設定）
- `AWS_DEFAULT_REGION`: （未設定）

### Lambda / Manage Signup
- `DATABASE_URL`: （未設定）
- `SIGNUP_API_KEY`: （未設定）

### Lambda / Manage Signin
- `DATABASE_URL`: （未設定）
- `SIGNIN_API_KEY`: （未設定）

### Lambda / Inspect DB
- （devのみ）

### Lambda / Manage Check User
- （devのみ）

### Lambda / Manage Delete User
- （devのみ）

## prod

### Amplify / Manage
- `NEXTAUTH_URL`: （未設定）
- `NEXTAUTH_SECRET`: （未設定）
- `GOOGLE_CLIENT_ID`: （未設定）
- `GOOGLE_CLIENT_SECRET`: （未設定）
- `TWITTER_CLIENT_ID`: （未設定）
- `TWITTER_CLIENT_SECRET`: （未設定）
- `TIKTOK_CLIENT_ID`: （未設定）
- `TIKTOK_CLIENT_SECRET`: （未設定）
- `DATABASE_URL`: （未設定）
- `SIGNUP_ENDPOINT`: （未設定）
- `SIGNUP_API_KEY`: （未設定）
- `SIGNIN_ENDPOINT`: （未設定）
- `SIGNIN_API_KEY`: （未設定）
- `ASSETS_BUCKET`: （未設定）
- `ASSETS_QUEUE_URL`: （未設定）
- `AWS_REGION`: （未設定）

### Amplify / Public
- （未設定）

### Amplify / Admin
- （未設定）

### Lambda / Processor
- `ASSETS_BUCKET`: （未設定）
- `DATABASE_URL`: （未設定）
- `AWS_DEFAULT_REGION`: （未設定）

### Lambda / Manage Signup
- `DATABASE_URL`: （未設定）
- `SIGNUP_API_KEY`: （未設定）

### Lambda / Manage Signin
- `DATABASE_URL`: （未設定）
- `SIGNIN_API_KEY`: （未設定）

### Lambda / Inspect DB
- （devのみ）

### Lambda / Manage Check User
- （devのみ）

### Lambda / Manage Delete User
- （devのみ）
