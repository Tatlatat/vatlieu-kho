export type NormVarianceStatus = "WITHIN" | "OVER" | "NO_NORM";

export interface NormVarianceInput {
  normQty: number | null;
  actualQty: number;
}

export interface NormVarianceResult {
  normQty: number | null;
  actualQty: number;
  varianceQty: number | null;
  status: NormVarianceStatus;
  statusLabel: string;
}

export function calculateNormVariance(input: NormVarianceInput): NormVarianceResult {
  if (input.normQty == null) {
    return {
      normQty: null,
      actualQty: input.actualQty,
      varianceQty: null,
      status: "NO_NORM",
      statusLabel: "Chưa có định mức",
    };
  }

  const varianceQty = input.actualQty - input.normQty;
  return {
    normQty: input.normQty,
    actualQty: input.actualQty,
    varianceQty,
    status: varianceQty > 0 ? "OVER" : "WITHIN",
    statusLabel: varianceQty > 0 ? "Vượt định mức" : "Trong định mức",
  };
}
