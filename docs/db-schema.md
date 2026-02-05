# Vistia DB Schema（FIX / v1.2）

## 0. 方針
- DB: PostgreSQL
- 削除は原則「論理削除（deletedAt）」→ 30日後ジョブで物理削除（S3/DB）
- Publicの表示制御は `hidden_targets`（HIDE）と `deletedAt` を参照
- IDは原則 UUID v7（アプリ側で生成し、DB型は uuid）
- enumは DB ENUM でも text+CHECK でも良い（本文は「ENUM想定」で記述）

---

## 1. users
Public/Manageの主体ユーザー。

| column | type | constraints / note |
|---|---|---|
| id | uuid | PK（UUID v7） |
| handle | text | UNIQUE, `^[a-z0-9_]{3,20}$` |
| displayName | text | NOT NULL |
| bio | text | NOT NULL default '' |
| plan | enum | FREE / PRO, default FREE |
| planTrialEndsAt | timestamptz | NULL |
| bannedAt | timestamptz | NULL |
| createdAt | timestamptz | NOT NULL |
| updatedAt | timestamptz | NOT NULL |
| deletedAt | timestamptz | NULL（退会/論理削除） |

Index:
- UNIQUE(handle)
- INDEX(bannedAt)
- INDEX(deletedAt)

---

## 2. auth_accounts（Manage認証）
ソーシャル/メール。アカウント統合（リンク/マージ）はしない。

| column | type | constraints / note |
|---|---|---|
| id | uuid | PK（UUID v7） |
| userId | uuid | FK → users.id |
| provider | enum | EMAIL / GOOGLE / X / TIKTOK |
| providerUserId | text | NULL（EMAIL以外で使用） |
| email | citext | NULL（EMAIL/連絡用） |
| emailVerifiedAt | timestamptz | NULL |
| passwordHash | text | NULL（EMAILのみ） |
| createdAt | timestamptz | NOT NULL |
| updatedAt | timestamptz | NOT NULL |

Constraints:
- UNIQUE(provider, providerUserId)（EMAIL以外）
- UNIQUE(provider, email)（EMAIL）
- CHECK: provider='EMAIL' のとき email 必須

---

## 3. assets（画像資産）
画像はすべて asset として統一。Public/Manage表示は optimized/thumb のみ。

| column | type | constraints / note |
|---|---|---|
| assetId | uuid | PK（UUID v7） |
| userId | uuid | FK → users.id |
| status | enum | UPLOADED / PROCESSED / FAILED / DELETED |
| originalExt | text | NOT NULL（拡張子保持） |
| thumbVersion | int | NOT NULL default 1 |
| createdAt | timestamptz | NOT NULL |
| deletedAt | timestamptz | NULL |

Index:
- INDEX(userId, createdAt)
- INDEX(status)
- INDEX(deletedAt)

---

## 4. posts（作品）
1作品=1枚。タイトル/説明なし。差し替え不可。

| column | type | constraints / note |
|---|---|---|
| id | uuid | PK（UUID v7） |
| userId | uuid | FK → users.id |
| assetId | uuid | FK → assets.assetId, UNIQUE（1post=1asset） |
| visibility | enum | PUBLIC / UNLISTED / PRIVATE |
| createdAt | timestamptz | NOT NULL |
| updatedAt | timestamptz | NOT NULL |
| deletedAt | timestamptz | NULL |

Index:
- INDEX(userId, visibility, createdAt)
- INDEX(deletedAt)

---

## 5. collections（コレクション / Proのみ）
| column | type | constraints / note |
|---|---|---|
| id | uuid | PK（UUID v7） |
| userId | uuid | FK → users.id |
| title | text | NOT NULL |
| visibility | enum | PUBLIC / UNLISTED / PRIVATE |
| sortOrder | int | NOT NULL default 0 |
| createdAt | timestamptz | NOT NULL |
| updatedAt | timestamptz | NOT NULL |
| deletedAt | timestamptz | NULL |

Index:
- INDEX(userId, sortOrder)
- INDEX(userId, visibility)
- INDEX(deletedAt)

### 5.1 collection_items
| column | type | constraints / note |
|---|---|---|
| id | uuid | PK（UUID v7） |
| collectionId | uuid | FK → collections.id |
| postId | uuid | FK → posts.id |
| sortOrder | int | NOT NULL default 0 |
| createdAt | timestamptz | NOT NULL |

Constraints/Index:
- UNIQUE(collectionId, postId)
- INDEX(collectionId, sortOrder)

---

## 6. unlisted_tokens（UNLISTED token）
tokenは22文字Base64URL。再発行で旧token無効。常に最新1つがアクティブ。

| column | type | constraints / note |
|---|---|---|
| id | uuid | PK（UUID v7） |
| userId | uuid | FK → users.id |
| targetType | enum | POST / COLLECTION |
| targetId | uuid | posts.id / collections.id |
| token | text | UNIQUE（22文字 Base64URL） |
| isActive | bool | default true |
| createdAt | timestamptz | NOT NULL |

Constraints:
- UNIQUE(targetType, targetId) WHERE isActive=true

---

## 7. pins（ピン / Proのみ）
最大3（0..2）。対象はPUBLIC作品のみ（検証はアプリ側）。

| column | type | constraints / note |
|---|---|---|
| id | uuid | PK（UUID v7） |
| userId | uuid | FK → users.id |
| postId | uuid | FK → posts.id |
| sortOrder | int | CHECK sortOrder in (0,1,2) |
| createdAt | timestamptz | NOT NULL |

Constraints:
- UNIQUE(userId, sortOrder)
- UNIQUE(userId, postId)

---

## 8. profiles（プロフィール設定）
| column | type | constraints / note |
|---|---|---|
| userId | uuid | PK, FK → users.id |
| iconAssetId | uuid | FK → assets.assetId, NULL |
| youtubeUrl | text | NULL |
| freePageHtml | text | NOT NULL default ''（サニタイズ済みHTML） |
| theme | jsonb | NOT NULL default '{}'（bg/accent/font/cardStyle） |
| updatedAt | timestamptz | NOT NULL |

---

## 9. external_links（外部リンク）
label/url/description/icon。無制限、並び替えあり。

| column | type | constraints / note |
|---|---|---|
| id | uuid | PK（UUID v7） |
| userId | uuid | FK → users.id |
| label | text | NOT NULL |
| url | text | NOT NULL |
| description | text | NOT NULL default '' |
| iconAssetId | uuid | FK → assets.assetId, NULL |
| sortOrder | int | NOT NULL default 0 |
| createdAt | timestamptz | NOT NULL |
| updatedAt | timestamptz | NOT NULL |

Index:
- INDEX(userId, sortOrder)

---

## 10. free_page_assets（フリーページ画像）
本文内の埋め込みは `{assetId}` を参照してレンダ時にURL化する想定。

| column | type | constraints / note |
|---|---|---|
| id | uuid | PK（UUID v7） |
| userId | uuid | FK → users.id |
| assetId | uuid | FK → assets.assetId |
| createdAt | timestamptz | NOT NULL |

Constraints:
- UNIQUE(userId, assetId)

---

## 11. hidden_targets（Admin HIDE）
Adminの非表示はHIDEで統一。

| column | type | constraints / note |
|---|---|---|
| id | uuid | PK（UUID v7） |
| targetType | enum | POST / COLLECTION / ASSET |
| targetId | uuid | posts.id / collections.id / assets.assetId |
| hiddenAt | timestamptz | NOT NULL |
| hiddenByAdminUserId | uuid | FK → admin_users.id |
| reason | text | NULL |

Constraints:
- UNIQUE(targetType, targetId)

Index:
- INDEX(targetType, hiddenAt)

---

## 12. notifications（Manage通知）
保持：90日。上限：1000件/ユーザー。既読は通知ごとに readAt。

| column | type | constraints / note |
|---|---|---|
| id | uuid | PK（UUID v7） |
| userId | uuid | FK → users.id |
| type | enum | HIDE / UNHIDE / BAN / UNBAN / DELETED / TICKET_RESOLVED / TICKET_CLOSED |
| targetType | enum | POST / COLLECTION / ASSET / TICKET |
| targetId | uuid | NOT NULL |
| targetUrl | text | NOT NULL（Manage内リンク） |
| createdAt | timestamptz | NOT NULL |
| readAt | timestamptz | NULL |

Index:
- INDEX(userId, createdAt)
- INDEX(userId, readAt)

※保持/上限の削除運用はジョブ（DB制約にはしない）。

---

## 13. admin_users（Adminユーザー）
Cognito連携。

| column | type | constraints / note |
|---|---|---|
| id | uuid | PK（UUID v7） |
| cognitoSub | text | UNIQUE |
| email | citext | NOT NULL |
| role | enum | OWNER / ADMIN / SUPPORT / DESIGNER |
| isActive | bool | default true |
| createdAt | timestamptz | NOT NULL |
| updatedAt | timestamptz | NOT NULL |

---

## 14. tickets（通報/自動検知/手動）
targetTypeは POST / COLLECTION / ASSET の3種。targetUrlは保存しない（都度生成）。

| column | type | constraints / note |
|---|---|---|
| id | uuid | PK（UUID v7） |
| type | enum | REPORT / AUTO / MANUAL |
| status | enum | OPEN / IN_PROGRESS / ESCALATED / RESOLVED / CLOSED |
| priority | enum | LOW / MEDIUM / HIGH / CRITICAL |
| targetType | enum | POST / COLLECTION / ASSET |
| targetId | uuid | NOT NULL |
| userId | uuid | FK → users.id, NULL（所有者が分かるなら） |
| assigneeAdminUserId | uuid | FK → admin_users.id, NULL |
| reportCategory | text | NULL（13カテゴリ） |
| autoCategory | text | NULL（9カテゴリ） |
| createdAt | timestamptz | NOT NULL |
| updatedAt | timestamptz | NOT NULL |
| closedAt | timestamptz | NULL |

Constraints:
- UNIQUE(type, targetType, targetId) WHERE type='AUTO'（AUTOは1件/対象）

Index:
- INDEX(status, priority, createdAt)
- INDEX(targetType, targetId)
- INDEX(userId)

### 14.1 ticket_events（履歴）
| column | type | constraints / note |
|---|---|---|
| id | uuid | PK（UUID v7） |
| ticketId | uuid | FK → tickets.id |
| kind | enum | COMMENT / STATUS_CHANGE / PRIORITY_CHANGE / ASSIGNEE_CHANGE / AUTO_RESULT |
| payload | jsonb | NOT NULL |
| createdByAdminUserId | uuid | FK → admin_users.id, NULL |
| createdAt | timestamptz | NOT NULL |

Index:
- INDEX(ticketId, createdAt)

### 14.2 reports（ユーザー通報の入力）
| column | type | constraints / note |
|---|---|---|
| id | uuid | PK（UUID v7） |
| ticketId | uuid | FK → tickets.id, UNIQUE |
| category | text | NOT NULL（13カテゴリ） |
| message | text | NULL |
| contactEmail | citext | NULL |
| reporterIp | inet | NULL（保存する場合） |
| createdAt | timestamptz | NOT NULL |

---

## 15. audit_logs（監査ログ）
標準（旧値/新値 + 理由任意）。保持1年。

| column | type | constraints / note |
|---|---|---|
| auditId | uuid | PK（UUID v7） |
| actorAdminUserId | uuid | FK → admin_users.id |
| actorRole | enum | OWNER / ADMIN / SUPPORT / DESIGNER |
| action | text | NOT NULL |
| targetType | enum | USER / POST / COLLECTION / ASSET / TICKET / SYSTEM |
| targetId | uuid | NOT NULL |
| before | jsonb | NULL |
| after | jsonb | NULL |
| reason | text | NULL |
| createdAt | timestamptz | NOT NULL |

Index:
- INDEX(targetType, targetId, createdAt)
- INDEX(actorAdminUserId, createdAt)
