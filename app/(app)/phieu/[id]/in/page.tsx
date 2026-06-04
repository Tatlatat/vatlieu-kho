export const dynamic = "force-dynamic";

import * as React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getDocument } from "@/lib/queries/documents";
import { PrintButton } from "@/components/print-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintPage({ params }: PageProps) {
  const { id } = await params;
  const doc = await getDocument(id);

  if (!doc) {
    notFound();
  }

  const getDocTitle = (type: string) => {
    switch (type) {
      case "IN":
        return "PHIẾU NHẬP KHO";
      case "OUT":
        return "PHIẾU XUẤT KHO";
      case "TRANSFER":
        return "PHIẾU CHUYỂN KHO";
      case "STOCKTAKE":
        return "PHIẾU KIỂM KÊ";
      default:
        return "PHIẾU KHO";
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Resolve back URL based on document type
  const getBackUrl = () => {
    switch (doc.type) {
      case "IN":
        return `/nhap/${doc.id}`;
      case "OUT":
        return `/xuat/${doc.id}`;
      case "TRANSFER":
        return `/chuyen-kho/${doc.id}`;
      default:
        return "/";
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-2 sm:p-6 print:p-0">
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          header, nav, footer, .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
            color: black !important;
            font-size: 12pt;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          @page {
            size: A4;
            margin: 1.5cm;
          }
        }
      `}} />

      {/* Action panel at the top (hidden during print) */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Link
            href={getBackUrl()}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại chi tiết</span>
          </Link>
        </div>
        <PrintButton label="In phiếu A4" className="shadow-sm" />
      </div>

      {/* Printable Sheet */}
      <div className="print-container bg-white p-8 border rounded-lg shadow-md max-w-[21cm] mx-auto min-h-[29.7cm] flex flex-col justify-between">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide">KHO VẬT LIỆU</h3>
              <p className="text-xs text-slate-500">Hệ thống quản lý vật tư & kho bãi</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">Mã phiếu: <span className="font-mono text-blue-600 font-bold">{doc.code}</span></p>
              <p className="text-xs text-slate-500">Ngày lập: {formatDate(doc.docDate)}</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center py-4">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{getDocTitle(doc.type)}</h1>
            <p className="text-sm text-slate-500 mt-1 italic">
              Trạng thái: {
                doc.status === "DRAFT" ? "Bản nháp" :
                doc.status === "PENDING" ? "Chờ duyệt" :
                doc.status === "POSTED" ? "Đã xác nhận" :
                doc.status === "VOIDED" ? "Đã hủy" : doc.status
              }
            </p>
          </div>

          {/* Metadata Section */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 bg-slate-50 p-4 rounded-lg text-sm border">
            {doc.type === "TRANSFER" ? (
              <>
                <div>
                  <span className="text-slate-500 block text-xs uppercase font-medium">Kho gửi (nguồn)</span>
                  <span className="font-semibold text-slate-800">
                    {doc.fromWarehouse ? `${doc.fromWarehouse.name} (${doc.fromWarehouse.code})` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs uppercase font-medium">Kho nhận (đích)</span>
                  <span className="font-semibold text-slate-800">
                    {doc.toWarehouse ? `${doc.toWarehouse.name} (${doc.toWarehouse.code})` : "—"}
                  </span>
                </div>
              </>
            ) : (
              <div>
                <span className="text-slate-500 block text-xs uppercase font-medium">Kho hàng</span>
                <span className="font-semibold text-slate-800">
                  {doc.warehouse ? `${doc.warehouse.name} (${doc.warehouse.code})` : "—"}
                </span>
              </div>
            )}

            {doc.supplier && (
              <div>
                <span className="text-slate-500 block text-xs uppercase font-medium">Nhà cung cấp</span>
                <span className="font-semibold text-slate-800">{doc.supplier.name}</span>
                {doc.supplier.contact && <span className="text-xs text-slate-500 block">Liên hệ: {doc.supplier.contact}</span>}
              </div>
            )}

            {doc.reason && (
              <div className="col-span-2">
                <span className="text-slate-500 block text-xs uppercase font-medium">Lý do</span>
                <span className="text-slate-800">{doc.reason}</span>
              </div>
            )}
          </div>

          {/* Material Lines Table */}
          <div className="mt-6">
            <table className="w-full text-left border-collapse border border-slate-300 text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2 text-center w-12 font-semibold">STT</th>
                  <th className="border border-slate-300 p-2 font-semibold w-28">Mã</th>
                  <th className="border border-slate-300 p-2 font-semibold">Tên vật tư</th>
                  <th className="border border-slate-300 p-2 font-semibold w-20 text-center">ĐVT</th>
                  <th className="border border-slate-300 p-2 font-semibold w-24 text-right">Số lượng</th>
                  <th className="border border-slate-300 p-2 font-semibold w-40">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {doc.lines && doc.lines.length > 0 ? (
                  doc.lines.map((line, index) => (
                    <tr key={line.id} className="hover:bg-slate-50 transition-colors">
                      <td className="border border-slate-300 p-2 text-center">{index + 1}</td>
                      <td className="border border-slate-300 p-2 font-mono text-xs">{line.material.code}</td>
                      <td className="border border-slate-300 p-2">{line.material.name}</td>
                      <td className="border border-slate-300 p-2 text-center">{line.material.unit}</td>
                      <td className="border border-slate-300 p-2 text-right font-semibold">{line.quantity}</td>
                      <td className="border border-slate-300 p-2 text-slate-600 text-xs">{line.note || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="border border-slate-300 p-4 text-center text-slate-400 italic">
                      Không có dòng vật tư nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Overall note */}
          {doc.note && (
            <div className="border-t pt-4 text-sm">
              <span className="font-semibold text-slate-800 block mb-1">Ghi chú phiếu:</span>
              <p className="text-slate-600 bg-slate-50 p-3 rounded border italic leading-relaxed">{doc.note}</p>
            </div>
          )}
        </div>

        {/* Footer with signatures */}
        <div className="pt-12 mt-12 border-t">
          <div className="grid grid-cols-2 text-center text-sm gap-8">
            <div className="flex flex-col justify-between min-h-[140px]">
              <div>
                <p className="font-bold text-slate-800 uppercase tracking-wide">Người lập phiếu</p>
                <p className="text-xs text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
              </div>
              <div className="mt-8">
                <p className="font-semibold text-slate-800">{doc.createdBy?.name || "—"}</p>
              </div>
            </div>

            <div className="flex flex-col justify-between min-h-[140px]">
              <div>
                <p className="font-bold text-slate-800 uppercase tracking-wide">Người duyệt phiếu</p>
                <p className="text-xs text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
              </div>
              <div className="mt-8">
                {doc.approvedBy ? (
                  <p className="font-semibold text-slate-800">{doc.approvedBy.name}</p>
                ) : (
                  <p className="text-slate-400 italic font-normal">(Chưa duyệt)</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
