export interface FundDocumentSnapshotInput {
  id: string;
  code: string;
  kind: string;
  status: string;
  documentDate: Date;
  fundId: string;
  note: string | null;
  revisionNo: number;
  lines: Array<{
    lineNo: number;
    amount: number;
    category: string;
    description: string;
    note: string | null;
  }>;
}

export function snapshotFundDocument(doc: FundDocumentSnapshotInput) {
  return {
    id: doc.id,
    code: doc.code,
    kind: doc.kind,
    status: doc.status,
    documentDate: doc.documentDate.toISOString(),
    fundId: doc.fundId,
    note: doc.note,
    revisionNo: doc.revisionNo,
    lines: doc.lines.map((line) => ({
      lineNo: line.lineNo,
      amount: line.amount,
      category: line.category,
      description: line.description,
      note: line.note,
    })),
  };
}

export function fundAuditActionLabel(action: string): string {
  if (action === "CREATE") return "Tạo phiếu";
  if (action === "POST") return "Ghi sổ";
  if (action === "EDIT_DRAFT") return "Sửa nháp";
  if (action === "EDIT_POSTED") return "Sửa phiếu đã ghi sổ";
  if (action === "VOID") return "Hủy phiếu";
  if (action === "DELETE_DRAFT") return "Xóa nháp";
  return action;
}
