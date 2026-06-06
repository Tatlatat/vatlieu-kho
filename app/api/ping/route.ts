import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Luôn chạy động (không prerender) để mỗi lần ping đều đánh thức function + DB.
export const dynamic = "force-dynamic";

/**
 * Endpoint giữ ấm (keep-warm).
 *
 * Mục đích: một dịch vụ uptime miễn phí bên ngoài (UptimeRobot, cron-job.org…)
 * gọi vào đây mỗi vài phút để Serverless Function không "ngủ" — nhờ đó người
 * dùng tránh được cold-start (TTFB 2–10s lần đầu sau khi web rảnh một lúc).
 *
 * Truy vấn cực nhẹ `SELECT 1` để đánh thức luôn cả kết nối Prisma ↔ Supabase
 * (DB cũng có thể ngủ/đóng kết nối sau một lúc không hoạt động).
 */
export async function GET() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { ok: true, dbMs: Date.now() - start },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
