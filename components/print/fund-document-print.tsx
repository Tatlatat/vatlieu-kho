import type { FundDocumentDetail } from "@/lib/queries/funds";
import { sumFundPrintAmount } from "@/lib/print/document-totals";

interface Props {
  document: FundDocumentDetail;
}

function formatDate(date: Date | null) {
  return date ? date.toLocaleDateString("vi-VN") : "";
}

function money(value: number) {
  return value.toLocaleString("vi-VN");
}

export function FundDocumentPrint({ document }: Props) {
  const totalAmount = sumFundPrintAmount(document.lines);

  return (
    <article className="mx-auto max-w-4xl bg-white p-8 text-slate-950 print-document">
      <header className="border-b border-slate-300 pb-4">
        <div className="text-sm font-semibold uppercase tracking-wide">Phần mềm vật liệu kho</div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold uppercase">{document.kindLabel}</h1>
            <p className="text-sm text-slate-600">Số phiếu: {document.code}</p>
          </div>
          <div className="text-sm sm:text-right">
            <div>Ngày chứng từ: {formatDate(document.documentDate)}</div>
            <div>Trạng thái: {document.statusLabel}</div>
            <div>Phiên bản: Lần {document.revisionNo}</div>
          </div>
        </div>
      </header>

      <section className="grid gap-3 border-b border-slate-200 py-4 text-sm sm:grid-cols-2">
        <div>
          <span className="text-slate-500">Quỹ: </span>
          <span className="font-medium">{document.fundName}</span>
        </div>
        <div>
          <span className="text-slate-500">Công trình: </span>
          <span className="font-medium">{document.projectName ?? "Không gắn công trình"}</span>
        </div>
        <div>
          <span className="text-slate-500">Người lập: </span>
          <span className="font-medium">{document.createdByName}</span>
        </div>
        <div>
          <span className="text-slate-500">Người ghi sổ: </span>
          <span className="font-medium">{document.postedByName ?? "Chưa có"}</span>
        </div>
        {document.note && (
          <div className="sm:col-span-2">
            <span className="text-slate-500">Ghi chú: </span>
            <span className="font-medium">{document.note}</span>
          </div>
        )}
      </section>

      <section className="py-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2 py-2 text-left">STT</th>
              <th className="border border-slate-300 px-2 py-2 text-left">Nhóm</th>
              <th className="border border-slate-300 px-2 py-2 text-left">Nội dung</th>
              <th className="border border-slate-300 px-2 py-2 text-right">Số tiền</th>
              <th className="border border-slate-300 px-2 py-2 text-left">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {document.lines.map((line) => (
              <tr key={line.id}>
                <td className="border border-slate-300 px-2 py-2">{line.lineNo}</td>
                <td className="border border-slate-300 px-2 py-2">{line.category}</td>
                <td className="border border-slate-300 px-2 py-2">{line.description}</td>
                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums">{money(line.amount)}</td>
                <td className="border border-slate-300 px-2 py-2">{line.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="border border-slate-300 px-2 py-2 text-right font-semibold" colSpan={3}>
                Tổng tiền
              </td>
              <td className="border border-slate-300 px-2 py-2 text-right font-semibold tabular-nums">
                {money(totalAmount)}
              </td>
              <td className="border border-slate-300 px-2 py-2" />
            </tr>
          </tfoot>
        </table>
      </section>

      <footer className="mt-10 grid grid-cols-3 gap-6 text-center text-sm">
        <div>
          <div className="font-semibold">Người lập phiếu</div>
          <div className="mt-20">{document.createdByName}</div>
        </div>
        <div>
          <div className="font-semibold">Thủ quỹ</div>
          <div className="mt-20">........................</div>
        </div>
        <div>
          <div className="font-semibold">Quản lý</div>
          <div className="mt-20">........................</div>
        </div>
      </footer>
    </article>
  );
}
