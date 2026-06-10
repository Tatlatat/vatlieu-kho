import { z } from "zod";

const lineSchema = z.object({
  amount: z.coerce.number().positive("Số tiền phải lớn hơn 0"),
  category: z.string().trim().min(1, "Vui lòng nhập nhóm thu chi").max(120, "Nhóm thu chi quá dài"),
  description: z.string().trim().min(1, "Vui lòng nhập nội dung").max(500, "Nội dung quá dài"),
  note: z.string().trim().max(500, "Ghi chú quá dài").optional(),
});

const linesSchema = z.array(lineSchema).min(1, "Phiếu quỹ phải có ít nhất một dòng");

export type ParsedFundDocumentLine = z.infer<typeof lineSchema>;

function normalizeLine(line: ParsedFundDocumentLine): ParsedFundDocumentLine {
  return {
    amount: line.amount,
    category: line.category,
    description: line.description,
    note: line.note || undefined,
  };
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function parseFundDocumentLines(formData: FormData): ParsedFundDocumentLine[] {
  const rawLines = getString(formData, "lines");
  if (!rawLines) throw new Error("Phiếu quỹ phải có ít nhất một dòng");

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawLines);
  } catch {
    throw new Error("Danh sách dòng phiếu quỹ không hợp lệ");
  }

  const parsed = linesSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dòng phiếu quỹ không hợp lệ");
  }

  return parsed.data.map(normalizeLine);
}

export function parseFundDocumentDate(formData: FormData, fallback = new Date()): Date {
  const rawDate = getString(formData, "documentDate").trim();
  if (!rawDate) return fallback;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    throw new Error("Ngày chứng từ không hợp lệ");
  }

  const date = new Date(`${rawDate}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Ngày chứng từ không hợp lệ");
  }

  return date;
}
