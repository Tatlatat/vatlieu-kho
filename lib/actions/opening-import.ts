"use server";

import { requireAtLeast } from "@/lib/auth-helpers";
import { createOpeningStock } from "@/lib/actions/opening";
import { parseOpeningStockWorkbook, validateOpeningRows } from "@/lib/opening-import";

export async function importOpeningStock(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
  errors?: { rowNumber: number; message: string }[];
  insertedCount?: number;
}> {
  await requireAtLeast("MANAGER");

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Vui lòng chọn file .xlsx" };
  }

  try {
    const rows = await parseOpeningStockWorkbook(await file.arrayBuffer());
    const result = await validateOpeningRows(rows);
    if (result.errors.length > 0) {
      return { ok: false, errors: result.errors };
    }

    const created = await createOpeningStock(result.entries);
    if (!created.ok) {
      return { ok: false, error: created.error };
    }

    return { ok: true, insertedCount: result.entries.length };
  } catch (e) {
    return { ok: false, error: `Không đọc được file nhập tồn đầu kỳ: ${(e as Error).message}` };
  }
}
