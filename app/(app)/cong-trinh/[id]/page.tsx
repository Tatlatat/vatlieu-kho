export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";
import { getProjectSummary } from "@/lib/queries/projects";
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
import { ChevronLeft, Building2, Landmark, Package, CircleDollarSign } from "lucide-react";

export default async function CongTrinhDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("OWNER");

  const { id } = await params;
  const summary = await getProjectSummary(id);

  if (!summary) {
    notFound();
  }

  const { project, stock, cash, totalCostVnd } = summary;

  return (
    <div className="container mx-auto py-8 px-4 space-y-6 max-w-5xl">
      <div>
        <Link
          href="/cong-trinh"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-blue-600 mb-4 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Quay lại danh sách công trình
        </Link>
      </div>

      <div className="flex items-start gap-3 justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600 mt-1" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-sm text-muted-foreground">
              Mã công trình: <strong className="font-mono">{project.code}</strong>
              {project.note && <span className="ml-2">· {project.note}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Khối Tổng chi phí */}
      <Card className="border-l-4 border-l-blue-600 border border-border shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <CircleDollarSign className="h-4 w-4 text-blue-600" />
            Tổng chi phí (VND)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-700">{formatVnd(totalCostVnd)}</div>
          <p className="text-xs text-muted-foreground mt-2 italic">
            * Hiện tính theo chi quỹ; vật tư/xe quy tiền bổ sung sau.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Khối Quỹ */}
        <Card className="md:col-span-1 border border-border shadow-md h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Landmark className="h-5 w-5 text-blue-600" />
              Dòng tiền quỹ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
              <div className="text-xs text-muted-foreground">Tồn quỹ hiện tại</div>
              <div className={`text-2xl font-bold mt-1 tabular-nums ${cash.balance < 0 ? "text-red-600" : "text-emerald-700"}`}>
                {formatVnd(cash.balance)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-xs text-muted-foreground">Tổng thu</div>
                <div className="text-sm font-bold text-emerald-700 mt-0.5 tabular-nums">
                  {formatVnd(cash.totalIn)}
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-xs text-muted-foreground">Tổng chi</div>
                <div className="text-sm font-bold text-red-600 mt-0.5 tabular-nums">
                  {formatVnd(cash.totalOut)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Khối Vật tư */}
        <Card className="md:col-span-2 border border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Tồn kho vật tư
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stock.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Chưa có vật tư nào được chuyển qua kho của công trình.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">STT</TableHead>
                      <TableHead>Vật liệu</TableHead>
                      <TableHead className="w-[80px]">Đơn vị</TableHead>
                      <TableHead className="text-right">Tổng nhập</TableHead>
                      <TableHead className="text-right">Tổng xuất</TableHead>
                      <TableHead className="text-right font-bold text-slate-900">Tồn kho</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stock.map((s, i) => (
                      <TableRow key={s.materialName} className="hover:bg-slate-50/50">
                        <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
                        <TableCell className="font-semibold">{s.materialName}</TableCell>
                        <TableCell className="text-muted-foreground">{s.unit}</TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-700 font-medium">
                          {s.totalIn.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-red-600 font-medium">
                          {s.totalOut.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums font-bold ${s.balance < 0 ? "text-red-600" : "text-slate-900"}`}>
                          {s.balance.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
