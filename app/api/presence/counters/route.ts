import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Son 45 sn içinde ping atanlar online
  const rows = await prisma.$queryRawUnsafe<{
    total: number; authed: number;
  }[]>(
    `with online as (
       select user_id
       from presence_sessions
       where last_seen >= now() - interval '45 seconds'
     )
     select
       (select count(*) from online) as total,
       (select count(*) from online where user_id is not null) as authed`
  );
  const r = rows[0] || { total: 0, authed: 0 };
  return NextResponse.json({ ok: true, total: Number(r.total), authed: Number(r.authed) });
}