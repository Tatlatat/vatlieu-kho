import { z } from "zod";

const lineSchema = z.object({
  materialId: z.string().min(1, "Vui lòng chọn vật tư"),
  quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0"),
  note: z.string().trim().max(500).optional(),
  projectId: z.string().trim().optional(),
  workItemId: z.string().trim().optional(),
});

const linesSchema = z.array(lineSchema).min(1, "Phiếu phải có ít nhất một dòng");

export type ParsedDocumentLine = z.infer<typeof lineSchema>;

function normalizeLine(line: ParsedDocumentLine): ParsedDocumentLine {
  const normalized: ParsedDocumentLine = {
    materialId: line.materialId,
    quantity: line.quantity,
    note: line.note || undefined,
  };
  if (line.projectId) normalized.projectId = line.projectId;
  if (line.workItemId) normalized.workItemId = line.workItemId;
  return normalized;
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function parseDocumentLines(formData: FormData): ParsedDocumentLine[] {
  const rawLines = getString(formData, "lines");

  if (rawLines) {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawLines);
    } catch {
      throw new Error("Danh sách dòng phiếu không hợp lệ");
    }

    const parsed = linesSchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dòng phiếu không hợp lệ");
    }

    return parsed.data.map(normalizeLine);
  }

  const parsed = lineSchema.safeParse({
    materialId: formData.get("materialId"),
    quantity: formData.get("quantity"),
    note: getString(formData, "note") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dòng phiếu không hợp lệ");
  }

  return [normalizeLine(parsed.data)];
}

export function parseDocumentDate(formData: FormData, fallback = new Date()): Date {
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
