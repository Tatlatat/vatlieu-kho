"use server";

export type TaxLookupResult =
  | { ok: true; name: string; address: string }
  | { ok: false; error?: string };

/** Tra thông tin doanh nghiệp theo MST qua VietQR (free, không cần key). */
export async function lookupTaxCode(mst: string): Promise<TaxLookupResult> {
  const code = (mst ?? "").trim();
  // MST VN: 10 số (doanh nghiệp) hoặc 13 số (chi nhánh, dạng 10-3). Bỏ dấu '-'.
  const digits = code.replace(/-/g, "");
  if (!/^\d{10}(\d{3})?$/.test(digits)) {
    return { ok: false, error: "Mã số thuế không hợp lệ" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://api.vietqr.io/v2/business/${digits}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: "Không tra cứu được" };
    const json = (await res.json()) as { code?: string; data?: { name?: string; address?: string } };
    if (json.code === "00" && json.data?.name) {
      return { ok: true, name: json.data.name, address: json.data.address ?? "" };
    }
    return { ok: false, error: "Không tìm thấy doanh nghiệp với mã số thuế này" };
  } catch {
    return { ok: false, error: "Không tra cứu được (mạng/quá thời gian)" };
  } finally {
    clearTimeout(timer);
  }
}
