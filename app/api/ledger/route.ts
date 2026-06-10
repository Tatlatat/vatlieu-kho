import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-helpers";
import { getMaterialLedger } from "@/lib/queries/balance";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requirePermission("inventory.history.view");
  const { searchParams } = new URL(req.url);
  const materialId = searchParams.get("materialId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const wh = searchParams.get("wh") || undefined;
  if (!materialId || !from || !to)
    return NextResponse.json({ error: "Thiếu tham số" }, { status: 400 });
  const ledger = await getMaterialLedger(materialId, from, to, wh);
  return NextResponse.json({ ledger }, { headers: { "Cache-Control": "no-store" } });
}
