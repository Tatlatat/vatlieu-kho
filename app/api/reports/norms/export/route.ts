import { requirePermission } from "@/lib/auth-helpers";
import { buildNormReportWorkbook } from "@/lib/excel/workbook";
import { getProjectNormReport } from "@/lib/queries/projects";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requirePermission("inventory.report.view");
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") || undefined;
  const rows = await getProjectNormReport(projectId);
  const buffer = buildNormReportWorkbook({ rows });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bao-cao-dinh-muc.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
