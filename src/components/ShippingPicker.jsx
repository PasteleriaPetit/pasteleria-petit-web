import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { computeShippingFromCoverage } from "../utils/shipping";
import { mxn } from "../utils/money";

export default function ShippingPicker({ address, onChange }) {
  const [shipping, setShipping] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadShipping = async () => {
      setError("");

      const postalCode = String(
        address?.postalCode || ""
      )
        .trim()
        .replace(/\D/g, "");

      // ======================================================
      // SIN CP VÁLIDO
      // ======================================================

      if (postalCode.length !== 5) {
        if (!cancelled) {
          setShipping(null);
          setLoading(false);
          onChange?.(null);
        }

        return;
      }

      setLoading(true);

      try {
        // ====================================================
        // BUSCAR TARIFA OFICIAL POR CÓDIGO POSTAL
        // ====================================================

        const coverageRef = doc(
          db,
          "deliveryCoverage",
          postalCode
        );

        const coverageSnap = await getDoc(
          coverageRef
        );

        if (cancelled) return;

        // ====================================================
        // CP NO REGISTRADO
        // ====================================================

        if (!coverageSnap.exists()) {
          setShipping(null);

          setError(
            "Este código postal no se encuentra dentro de nuestra cobertura de entrega."
          );

          onChange?.(null);

          return;
        }

        const coverage = {
          postalCode,
          ...coverageSnap.data(),
        };

        // ====================================================
        // CALCULAR ENVÍO DESDE LA TARIFA OFICIAL
        // ====================================================

        const result =
          computeShippingFromCoverage(
            coverage
          );

        if (!result?.available) {
          setShipping(null);

          setError(
            result?.message ||
              "Actualmente no contamos con cobertura para este código postal."
          );

          onChange?.(null);

          return;
        }

        // ====================================================
        // RESULTADO FINAL
        // ====================================================

        const normalizedShipping = {
          available: true,
          covered: true,

          postalCode,

          municipality:
            result.municipality ||
            coverage.municipality ||
            "",

          branchKey:
            result.branchKey ||
            coverage.branchKey ||
            coverage.branchId ||
            "",

          branchId:
            result.branchId ||
            coverage.branchId ||
            coverage.branchKey ||
            "",

          branchName:
            result.branchName ||
            coverage.branchName ||
            "",

          distanceKm: Number(
            result.distanceKm ??
              coverage.distanceKm ??
              coverage.distance ??
              0
          ),

          amount: Number(
            result.amount ??
              coverage.amount ??
              0
          ),

          source: "deliveryCoverage",
        };

        setShipping(normalizedShipping);

        onChange?.(normalizedShipping);
      } catch (err) {
        console.error(
          "Error consultando cobertura:",
          err
        );

        if (cancelled) return;

        setShipping(null);

        setError(
          "No fue posible consultar la cobertura de entrega. Intenta nuevamente."
        );

        onChange?.(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadShipping();

    return () => {
      cancelled = true;
    };
  }, [address?.postalCode, onChange]);

  return (
    <div className="p-4 rounded-lg border border-rose/40 bg-white space-y-3">
      <h3 className="font-semibold text-wine">
        Entrega
      </h3>

      {/* ================================================ */}
      {/* SIN DIRECCIÓN */}
      {/* ================================================ */}

      {!address?.postalCode && (
        <p className="text-sm text-wineDark/70">
          Selecciona o captura una dirección para
          consultar la cobertura y el costo de envío.
        </p>
      )}

      {/* ================================================ */}
      {/* CARGANDO */}
      {/* ================================================ */}

      {address?.postalCode && loading && (
        <p className="text-sm text-wineDark/70">
          Consultando cobertura para CP{" "}
          {address.postalCode}...
        </p>
      )}

      {/* ================================================ */}
      {/* ERROR / SIN COBERTURA */}
      {/* ================================================ */}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* ================================================ */}
      {/* COBERTURA ENCONTRADA */}
      {/* ================================================ */}

      {!loading && shipping && (
        <div className="text-sm text-wineDark/80 space-y-2">
          <div>
            <span className="font-medium">
              Código postal:
            </span>{" "}
            {shipping.postalCode}
          </div>

          {shipping.municipality && (
            <div>
              <span className="font-medium">
                Municipio:
              </span>{" "}
              {shipping.municipality}
            </div>
          )}

          <div>
            <span className="font-medium">
              Sucursal asignada:
            </span>{" "}
            {shipping.branchName}
          </div>

          {shipping.distanceKm > 0 && (
            <div>
              <span className="font-medium">
                Distancia de referencia:
              </span>{" "}
              {shipping.distanceKm} km
            </div>
          )}

          <div className="pt-1">
            <span className="font-medium">
              Costo de envío:
            </span>{" "}
            <span className="font-semibold text-wine">
              {mxn(shipping.amount)}
            </span>
          </div>

          <p className="text-xs text-wineDark/60 pt-1">
            Tarifa de entrega correspondiente a tu
            código postal.
          </p>
        </div>
      )}
    </div>
  );
}