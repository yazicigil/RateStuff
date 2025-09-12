alter table "Notification"
  alter column "brandId" drop not null,
  alter column "actorId" drop not null,
  alter column "itemId" drop not null;
-- commentId zaten null'able ise gerek yok