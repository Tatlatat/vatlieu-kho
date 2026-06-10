import { z } from "zod";

const lineSchema = z.object({
  materialId: z.string().min(1, "Vui lòng chọn vật tư"),
  quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0"),
  note: z.string().trim().max(500).optional(),
});

const linesSchema = z.array(lineSchema).min(1, "Phiếu phải có ít nhất một dòng");

export type ParsedDocumentLine = z.infer<typeof lineSchema>;

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

    return parsed.data.map((line) => ({
      ...line,
      note: line.note || undefined,
    }));
  }

  const parsed = lineSchema.safeParse({
    materialId: formData.get("materialId"),
    quantity: formData.get("quantity"),
    note: getString(formData, "note") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dòng phiếu không hợp lệ");
  }

  return [{ ...parsed.data, note: parsed.data.note || undefined }];
}
