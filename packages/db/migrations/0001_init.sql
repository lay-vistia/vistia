-- Vistia DB Schema v1.3
-- Source of truth: docs/db-schema.md

CREATE EXTENSION IF NOT EXISTS citext;

-- Enums
CREATE TYPE user_plan AS ENUM ('FREE', 'PRO');
CREATE TYPE auth_provider AS ENUM ('EMAIL', 'GOOGLE', 'X', 'TIKTOK');
CREATE TYPE asset_status AS ENUM ('UPLOADED', 'PROCESSED', 'FAILED', 'DELETED');
CREATE TYPE visibility AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');
CREATE TYPE unlisted_target_type AS ENUM ('POST', 'COLLECTION');
CREATE TYPE hidden_target_type AS ENUM ('POST', 'COLLECTION', 'ASSET');
CREATE TYPE notification_type AS ENUM ('HIDE', 'UNHIDE', 'BAN', 'UNBAN', 'DELETED', 'TICKET_RESOLVED', 'TICKET_CLOSED');
CREATE TYPE notification_target_type AS ENUM ('POST', 'COLLECTION', 'ASSET', 'TICKET');
CREATE TYPE admin_role AS ENUM ('OWNER', 'ADMIN', 'SUPPORT', 'DESIGNER');
CREATE TYPE ticket_type AS ENUM ('REPORT', 'AUTO', 'MANUAL');
CREATE TYPE ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED');
CREATE TYPE ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE ticket_target_type AS ENUM ('POST', 'COLLECTION', 'ASSET');
CREATE TYPE ticket_event_kind AS ENUM ('COMMENT', 'STATUS_CHANGE', 'PRIORITY_CHANGE', 'ASSIGNEE_CHANGE', 'AUTO_RESULT');
CREATE TYPE audit_target_type AS ENUM ('USER', 'POST', 'COLLECTION', 'ASSET', 'TICKET', 'SYSTEM');

-- 1. users
CREATE TABLE users (
  id uuid PRIMARY KEY,
  handle text NOT NULL UNIQUE CHECK (handle ~ '^[a-z0-9_]{3,20}$'),
  displayName text NOT NULL,
  bio text NOT NULL DEFAULT '',
  plan user_plan NOT NULL DEFAULT 'FREE',
  planTrialEndsAt timestamptz NULL,
  bannedAt timestamptz NULL,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  deletedAt timestamptz NULL
);
CREATE INDEX users_bannedAt_idx ON users (bannedAt);
CREATE INDEX users_deletedAt_idx ON users (deletedAt);

-- 2. auth_accounts
CREATE TABLE auth_accounts (
  id uuid PRIMARY KEY,
  userId uuid NOT NULL REFERENCES users(id),
  provider auth_provider NOT NULL,
  providerUserId text NULL,
  email citext NULL,
  emailVerifiedAt timestamptz NULL,
  passwordHash text NULL,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (provider = 'EMAIL' AND email IS NOT NULL)
    OR (provider <> 'EMAIL' AND providerUserId IS NOT NULL)
  )
);
CREATE UNIQUE INDEX auth_accounts_provider_user_idx
  ON auth_accounts (provider, providerUserId)
  WHERE provider <> 'EMAIL';
CREATE UNIQUE INDEX auth_accounts_provider_email_idx
  ON auth_accounts (provider, email)
  WHERE provider = 'EMAIL';

-- 3. assets
CREATE TABLE assets (
  assetId uuid PRIMARY KEY,
  userId uuid NOT NULL REFERENCES users(id),
  status asset_status NOT NULL,
  originalExt text NOT NULL,
  thumbVersion int NOT NULL DEFAULT 1,
  createdAt timestamptz NOT NULL DEFAULT now(),
  deletedAt timestamptz NULL
);
CREATE INDEX assets_user_created_idx ON assets (userId, createdAt);
CREATE INDEX assets_status_idx ON assets (status);
CREATE INDEX assets_deletedAt_idx ON assets (deletedAt);

-- 4. posts
CREATE TABLE posts (
  id uuid PRIMARY KEY,
  userId uuid NOT NULL REFERENCES users(id),
  assetId uuid NOT NULL UNIQUE REFERENCES assets(assetId),
  visibility visibility NOT NULL,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  deletedAt timestamptz NULL
);
CREATE INDEX posts_user_visibility_created_idx ON posts (userId, visibility, createdAt);
CREATE INDEX posts_deletedAt_idx ON posts (deletedAt);

-- 5. collections
CREATE TABLE collections (
  id uuid PRIMARY KEY,
  userId uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  visibility visibility NOT NULL,
  sortOrder int NOT NULL DEFAULT 0,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  deletedAt timestamptz NULL
);
CREATE INDEX collections_user_sort_idx ON collections (userId, sortOrder);
CREATE INDEX collections_user_visibility_idx ON collections (userId, visibility);
CREATE INDEX collections_deletedAt_idx ON collections (deletedAt);

-- 5.1 collection_items
CREATE TABLE collection_items (
  id uuid PRIMARY KEY,
  collectionId uuid NOT NULL REFERENCES collections(id),
  postId uuid NOT NULL REFERENCES posts(id),
  sortOrder int NOT NULL DEFAULT 0,
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collectionId, postId)
);
CREATE INDEX collection_items_collection_sort_idx ON collection_items (collectionId, sortOrder);

-- 6. unlisted_tokens
CREATE TABLE unlisted_tokens (
  id uuid PRIMARY KEY,
  userId uuid NOT NULL REFERENCES users(id),
  targetType unlisted_target_type NOT NULL,
  targetId uuid NOT NULL,
  token text NOT NULL UNIQUE,
  isActive bool NOT NULL DEFAULT true,
  createdAt timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX unlisted_tokens_active_target_idx
  ON unlisted_tokens (targetType, targetId)
  WHERE isActive = true;

-- 7. pins
CREATE TABLE pins (
  id uuid PRIMARY KEY,
  userId uuid NOT NULL REFERENCES users(id),
  postId uuid NOT NULL REFERENCES posts(id),
  sortOrder int NOT NULL CHECK (sortOrder IN (0, 1, 2)),
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (userId, sortOrder),
  UNIQUE (userId, postId)
);

-- 8. profiles
CREATE TABLE profiles (
  userId uuid PRIMARY KEY REFERENCES users(id),
  iconAssetId uuid NULL REFERENCES assets(assetId),
  youtubeUrl text NULL,
  freePageHtml text NOT NULL DEFAULT '',
  theme jsonb NOT NULL DEFAULT '{}',
  updatedAt timestamptz NOT NULL DEFAULT now()
);

-- 9. external_links
CREATE TABLE external_links (
  id uuid PRIMARY KEY,
  userId uuid NOT NULL REFERENCES users(id),
  label text NOT NULL,
  url text NOT NULL,
  description text NOT NULL DEFAULT '',
  iconAssetId uuid NULL REFERENCES assets(assetId),
  sortOrder int NOT NULL DEFAULT 0,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX external_links_user_sort_idx ON external_links (userId, sortOrder);

-- 10. free_page_assets
CREATE TABLE free_page_assets (
  id uuid PRIMARY KEY,
  userId uuid NOT NULL REFERENCES users(id),
  assetId uuid NOT NULL REFERENCES assets(assetId),
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (userId, assetId)
);

-- 11. admin_users
CREATE TABLE admin_users (
  id uuid PRIMARY KEY,
  cognitoSub text UNIQUE,
  email citext NOT NULL,
  role admin_role NOT NULL,
  isActive bool NOT NULL DEFAULT true,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

-- 12. hidden_targets
CREATE TABLE hidden_targets (
  id uuid PRIMARY KEY,
  targetType hidden_target_type NOT NULL,
  targetId uuid NOT NULL,
  hiddenAt timestamptz NOT NULL,
  hiddenByAdminUserId uuid NOT NULL REFERENCES admin_users(id),
  reason text NULL,
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (targetType, targetId)
);
CREATE INDEX hidden_targets_type_hidden_idx ON hidden_targets (targetType, hiddenAt);

-- 13. notifications
CREATE TABLE notifications (
  id uuid PRIMARY KEY,
  userId uuid NOT NULL REFERENCES users(id),
  type notification_type NOT NULL,
  targetType notification_target_type NOT NULL,
  targetId uuid NOT NULL,
  targetUrl text NOT NULL,
  createdAt timestamptz NOT NULL DEFAULT now(),
  readAt timestamptz NULL
);
CREATE INDEX notifications_user_created_idx ON notifications (userId, createdAt);
CREATE INDEX notifications_user_read_idx ON notifications (userId, readAt);

-- 14. tickets
CREATE TABLE tickets (
  id uuid PRIMARY KEY,
  type ticket_type NOT NULL,
  status ticket_status NOT NULL,
  priority ticket_priority NOT NULL,
  targetType ticket_target_type NOT NULL,
  targetId uuid NOT NULL,
  userId uuid NULL REFERENCES users(id),
  assigneeAdminUserId uuid NULL REFERENCES admin_users(id),
  reportCategory text NULL,
  autoCategory text NULL,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  closedAt timestamptz NULL
);
CREATE UNIQUE INDEX tickets_auto_unique_idx
  ON tickets (type, targetType, targetId)
  WHERE type = 'AUTO';
CREATE INDEX tickets_status_priority_created_idx ON tickets (status, priority, createdAt);
CREATE INDEX tickets_target_idx ON tickets (targetType, targetId);
CREATE INDEX tickets_user_idx ON tickets (userId);

-- 14.1 ticket_events
CREATE TABLE ticket_events (
  id uuid PRIMARY KEY,
  ticketId uuid NOT NULL REFERENCES tickets(id),
  kind ticket_event_kind NOT NULL,
  payload jsonb NOT NULL,
  createdByAdminUserId uuid NULL REFERENCES admin_users(id),
  createdAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ticket_events_ticket_created_idx ON ticket_events (ticketId, createdAt);

-- 14.2 reports
CREATE TABLE reports (
  id uuid PRIMARY KEY,
  ticketId uuid NOT NULL UNIQUE REFERENCES tickets(id),
  category text NOT NULL,
  message text NULL,
  contactEmail citext NULL,
  createdAt timestamptz NOT NULL DEFAULT now()
);

-- 15. audit_logs
CREATE TABLE audit_logs (
  auditId uuid PRIMARY KEY,
  actorAdminUserId uuid NOT NULL REFERENCES admin_users(id),
  actorRole admin_role NOT NULL,
  action text NOT NULL,
  targetType audit_target_type NOT NULL,
  targetId uuid NOT NULL,
  before jsonb NULL,
  after jsonb NULL,
  reason text NULL,
  createdAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_target_idx ON audit_logs (targetType, targetId, createdAt);
CREATE INDEX audit_logs_actor_idx ON audit_logs (actorAdminUserId, createdAt);
