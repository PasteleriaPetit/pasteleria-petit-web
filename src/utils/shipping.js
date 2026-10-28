/**
 * Convierte un documento de Firestore:
 *
 * deliveryCoverage/{postalCode}
 *
 * en el objeto de envío utilizado por Checkout.
 *
 * IMPORTANTE:
 * El costo de envío NO se calcula por distancia.
 * La tarifa oficial es `amount`, almacenada en
 * deliveryCoverage.
 */
export function computeShippingFromCoverage(coverage) {
  if (!coverage) {
    return {
      available: false,
      covered: false,
      message:
        "No se encontró información de cobertura para este código postal.",
    };
  }

  // ==========================================================
  // VALIDAR SI EL CP ESTÁ ACTIVO
  // ==========================================================

  if (coverage.active === false) {
    return {
      available: false,
      covered: false,
      postalCode: coverage.postalCode || "",
      message:
        "El servicio de entrega no está disponible actualmente para este código postal.",
    };
  }

  // ==========================================================
  // VALIDAR COBERTURA
  // ==========================================================

  if (coverage.covered !== true) {
    return {
      available: false,
      covered: false,
      postalCode: coverage.postalCode || "",
      municipality: coverage.municipality || "",
      message:
        "Actualmente no contamos con cobertura de entrega para este código postal.",
    };
  }

  // ==========================================================
  // VALIDAR SUCURSAL
  // ==========================================================

  const branchId =
    coverage.branchId ||
    coverage.branchKey ||
    "";

  if (!branchId) {
    return {
      available: false,
      covered: false,
      postalCode: coverage.postalCode || "",
      municipality: coverage.municipality || "",
      message:
        "No hay una sucursal asignada para este código postal.",
    };
  }

  // ==========================================================
  // VALIDAR TARIFA
  // ==========================================================

  const amount = Number(coverage.amount);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return {
      available: false,
      covered: false,
      postalCode: coverage.postalCode || "",
      municipality: coverage.municipality || "",
      message:
        "La tarifa de envío para este código postal no es válida.",
    };
  }

  // ==========================================================
  // DISTANCIA
  //
  // Es únicamente informativa.
  // NO se utiliza para calcular el costo.
  // ==========================================================

  const rawDistance =
    coverage.distanceKm ??
    coverage.distance ??
    0;

  const parsedDistance =
    Number(rawDistance);

  const distanceKm =
    Number.isFinite(parsedDistance)
      ? parsedDistance
      : 0;

  // ==========================================================
  // RESULTADO
  // ==========================================================

  return {
    available: true,
    covered: true,

    postalCode:
      String(
        coverage.postalCode || ""
      ).trim(),

    municipality:
      coverage.municipality || "",

    branchKey:
      coverage.branchKey ||
      branchId,

    branchId,

    branchName:
      coverage.branchName || "",

    distanceKm,

    amount,

    source: "deliveryCoverage",
  };
}