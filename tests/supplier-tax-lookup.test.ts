import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const supplierManagerSource = readFileSync("components/supplier-manager.tsx", "utf8");

assert.match(
  supplierManagerSource,
  /import\s+\{\s*lookupTaxCode\s*\}\s+from\s+["']@\/lib\/actions\/tax-lookup["']/,
  "SupplierManager must keep the MST lookup action import"
);
assert.match(
  supplierManagerSource,
  /onBlur=\{\(event\)\s*=>\s*handleTaxCodeBlur\(event\.target\.value,/,
  "Supplier tax code inputs must trigger lookup on blur"
);

async function main() {
  const taxLookupModule = await import("../lib/actions/tax-lookup").catch((error: unknown) => ({ error }));
  assert.ok(!("error" in taxLookupModule), "tax lookup action module must exist");

  const { lookupTaxCode } = taxLookupModule;
  const originalFetch = globalThis.fetch;
  let fetchedUrl = "";
  let fetchCalls = 0;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls += 1;
    fetchedUrl = String(input);
    assert.equal(init?.cache, "no-store");
    return new Response(
      JSON.stringify({
        code: "00",
        data: {
          name: "CONG TY TNHH VAT LIEU A",
          address: "123 Duong A, TP HCM",
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }) as typeof fetch;

  try {
    assert.deepEqual(await lookupTaxCode("0312345678-001"), {
      ok: true,
      name: "CONG TY TNHH VAT LIEU A",
      address: "123 Duong A, TP HCM",
    });
    assert.equal(fetchCalls, 1);
    assert.equal(fetchedUrl, "https://api.vietqr.io/v2/business/0312345678001");

    assert.deepEqual(await lookupTaxCode("abc"), {
      ok: false,
      error: "Mã số thuế không hợp lệ",
    });
    assert.equal(fetchCalls, 1, "invalid MST must not call the remote API");
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log("supplier tax lookup tests passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
