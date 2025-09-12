-- 1) Enum'a yeni tipler
alter type "NotificationType" add value if not exists 'MENTION_IN_COMMENT';
alter type "NotificationType" add value if not exists 'MENTION_IN_POST';

-- 2) Notification'a mention için gerekli sütunlar
alter table "Notification"
  add column if not exists "brandId"  text,
  add column if not exists "actorId"  text,
  add column if not exists "itemId"   text,
  add column if not exists "commentId" text;

create index if not exists "Notification_item_idx"    on "Notification"("itemId");
create index if not exists "Notification_comment_idx" on "Notification"("commentId");

-- (İstersen FK'ler — opsiyonel; istersen ekle)
-- alter table "Notification" add constraint "Notification_brand_fkey"
--   foreign key ("brandId") references "User"("id") on delete cascade;
-- alter table "Notification" add constraint "Notification_actor_fkey"
--   foreign key ("actorId") references "User"("id") on delete cascade;
-- alter table "Notification" add constraint "Notification_item_fkey"
--   foreign key ("itemId") references "Item"("id") on delete cascade;
-- alter table "Notification" add constraint "Notification_comment_fkey"
--   foreign key ("commentId") references "Comment"("id") on delete cascade;

-- 3) Mention tablosu
create table if not exists "Mention" (
  id          text primary key default gen_random_uuid()::text,
  "brandId"   text not null,
  "actorId"   text not null,
  "itemId"    text not null,
  "commentId" text null,
  snippet     text null,
  "createdAt" timestamptz not null default now()
);

create index if not exists "Mention_brand_idx"   on "Mention"("brandId");
create index if not exists "Mention_item_idx"    on "Mention"("itemId");
create index if not exists "Mention_comment_idx" on "Mention"("commentId");
create index if not exists "Mention_created_idx" on "Mention"("createdAt" desc);

-- Duplicate önleme: yorum vs post ayrımı için iki partial unique index
create unique index if not exists "Mention_uq_comment"
  on "Mention"("brandId","itemId","commentId")
  where "commentId" is not null;

create unique index if not exists "Mention_uq_post"
  on "Mention"("brandId","itemId")
  where "commentId" is null;

-- (İstersen FK'ler — opsiyonel; istersen ekle)
-- alter table "Mention" add constraint "Mention_brand_fkey"
--   foreign key ("brandId") references "User"("id") on delete cascade;
-- alter table "Mention" add constraint "Mention_actor_fkey"
--   foreign key ("actorId") references "User"("id") on delete cascade;
-- alter table "Mention" add constraint "Mention_item_fkey"
--   foreign key ("itemId") references "Item"("id") on delete cascade;
-- alter table "Mention" add constraint "Mention_comment_fkey"
--   foreign key ("commentId") references "Comment"("id") on delete cascade;