// src/utils/shipping.js

export function computeShippingFromCoverage(
  coverage,
  postalCode = ""
) {
  const normalizedPostalCode = String(
    postalCode || coverage?.postalCode || ""
  ).trim();

  if (!coverage) {
    return {
      available: false,
      covered: false,
      reason: "postal_code_not_found",

      postalCode: normalizedPostalCode,

      branchKey: null,
      branchId: null,
      branchName: null,

      municipality: null,
      distanceKm: null,

      amount: 0,

      source: "deliveryCoverage",
    };
  }

  if (coverage.active === false) {
    return {
      available: false,
      covered: false,
      reason: "inactive",

      postalCode: normalizedPostalCode,

      branchKey: coverage.branchKey || null,

      branchId:
        coverage.branchId ||
        coverage.branchKey ||
        null,

      branchName: coverage.branchName || null,

      municipality: coverage.municipality || null,

      distanceKm:
        coverage.distanceKm !== undefined &&
        coverage.distanceKm !== null
          ? Number(coverage.distanceKm)
          : null,

      amount: 0,

      source: "deliveryCoverage",
    };
  }

  if (coverage.covered !== true) {
    return {
      available: false,
      covered: false,
      reason: "out_of_coverage",

      postalCode: normalizedPostalCode,

      branchKey: coverage.branchKey || null,

      branchId:
        coverage.branchId ||
        coverage.branchKey ||
        null,

      branchName: coverage.branchName || null,

      municipality: coverage.municipality || null,

      distanceKm:
        coverage.distanceKm !== undefined &&
        coverage.distanceKm !== null
          ? Number(coverage.distanceKm)
          : null,

      amount: 0,

      source: "deliveryCoverage",
    };
  }

  const amount = Number(coverage.amount);

  if (!Number.isFinite(amount) || amount < 0) {
    return {
      available: false,
      covered: false,
      reason: "invalid_rate",

      postalCode: normalizedPostalCode,

      branchKey: coverage.branchKey || null,

      branchId:
        coverage.branchId ||
        coverage.branchKey ||
        null,

      branchName: coverage.branchName || null,

      municipality: coverage.municipality || null,

      distanceKm:
        coverage.distanceKm !== undefined &&
        coverage.distanceKm !== null
          ? Number(coverage.distanceKm)
          : null,

      amount: 0,

      source: "deliveryCoverage",
    };
  }

  return {
    available: true,
    covered: true,
    reason: null,

    postalCode: normalizedPostalCode,

    municipality: coverage.municipality || "",

    branchKey: coverage.branchKey || null,

    branchId:
      coverage.branchId ||
      coverage.branchKey ||
      null,

    branchName: coverage.branchName || "",

    distanceKm:
      coverage.distanceKm !== undefined &&
      coverage.distanceKm !== null
        ? Number(coverage.distanceKm)
        : null,

    amount,

    coloniesCount:
      coverage.coloniesCount !== undefined
        ? Number(coverage.coloniesCount)
        : null,

    source: "deliveryCoverage",
  };
}