"use server";

export type TaxLookupResult =
  | { ok: true; name: string; address: string }
  | { ok: false; error: string };

export async function lookupTaxCode(taxCode: string): Promise<TaxLookupResult> {
  const digits = taxCode.trim().replace(/-/g, "");
  if (!/^\d{10}(\d{3})?$/.test(digits)) {
    return { ok: false, error: "Mã số thuế không hợp lệ" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`https://api.vietqr.io/v2/business/${digits}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, error: "Không tra cứu được mã số thuế" };
    }

    const payload = (await response.json()) as {
      code?: string;
      data?: {
        name?: string;
        address?: string;
      };
    };

    if (payload.code === "00" && payload.data?.name) {
      return {
        ok: true,
        name: payload.data.name,
        address: payload.data.address ?? "",
      };
    }

    return { ok: false, error: "Không tìm thấy doanh nghiệp với mã số thuế này" };
  } catch {
    return { ok: false, error: "Không tra cứu được mã số thuế" };
  } finally {
    clearTimeout(timeout);
  }
}
