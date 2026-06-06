export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { getAllProjects, getAllProjectsSummary } from "@/lib/queries/projects";
import { ProjectManager } from "@/components/project-manager";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { formatVnd } from "@/lib/utils";
import { Building2 } from "lucide-react";

export default async function CongTrinhPage() {
  await requireRole("OWNER");

  const [projectsSummary, allProjects] = await Promise.all([
    getAllProjectsSummary(),
    getAllProjects(),
  ]);

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 max-w-5xl">
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trục Công trình</h1>
          <p className="text-sm text-muted-foreground">Theo dõi tổng hợp đa công trình: tồn quỹ, thu chi và chi phí.</p>
        </div>
      </div>

      {/* Bảng tổng hợp đa công trình */}
      <Card className="border border-border shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            Bảng tổng hợp đa công trình
          </CardTitle>
        </CardHeader>
        <CardContent>
          {projectsSummary.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Chưa có dữ liệu tổng hợp công trình.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">STT</TableHead>
                    <TableHead>Công trình</TableHead>
                    <TableHead>Mã</TableHead>
                    <TableHead className="text-right">Tồn quỹ</TableHead>
                    <TableHead className="text-right">Tổng thu</TableHead>
                    <TableHead className="text-right">Tổng chi</TableHead>
                    <TableHead className="text-right font-bold text-slate-900">Tổng chi phí</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectsSummary.map((p, i) => (
                    <TableRow key={p.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
                      <TableCell className="font-semibold">
                        <Link href={`/cong-trinh/${p.id}`} className="text-blue-600 hover:underline">
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.code}</TableCell>
                      <TableCell className={`text-right tabular-nums font-semibold ${p.cashBalance < 0 ? "text-red-600" : "text-emerald-700"}`}>
                        {formatVnd(p.cashBalance)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700 font-medium">{formatVnd(p.totalIn)}</TableCell>
                      <TableCell className="text-right tabular-nums text-red-600 font-medium">{formatVnd(p.totalOut)}</TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-slate-900">{formatVnd(p.totalCostVnd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quản lý danh mục Công trình */}
      <ProjectManager projects={allProjects} />
    </div>
  );
}
