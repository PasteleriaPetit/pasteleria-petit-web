import React, { useEffect, useState } from "react";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "../lib/firebase";

import {
  computeShippingFromCoverage,
} from "../utils/shipping";

import { mxn } from "../utils/money";

export default function ShippingPicker({
  address,
  onChange,
}) {
  const [loading, setLoading] = useState(false);

  const [shipping, setShipping] = useState(null);

  const [status, setStatus] = useState("waiting");

  const [message, setMessage] = useState("");

  const postalCode = String(
    address?.postalCode || ""
  )
    .replace(/\D/g, "")
    .slice(0, 5);

  useEffect(() => {
    let cancelled = false;

    async function loadCoverage() {
      // ==============================
      // SIN DIRECCIÓN
      // ==============================

      if (!address) {
        setShipping(null);
        setStatus("waiting");
        setMessage("");

        onChange?.(null);

        return;
      }

      // ==============================
      // CP INCOMPLETO
      // ==============================

      if (postalCode.length !== 5) {
        setShipping(null);
        setStatus("waiting");

        setMessage(
          "Ingresa un código postal válido de 5 dígitos."
        );

        onChange?.(null);

        return;
      }

      try {
        setLoading(true);
        setStatus("loading");
        setMessage("");

        // ==============================
        // deliveryCoverage/{CP}
        // ==============================

        const coverageRef = doc(
          db,
          "deliveryCoverage",
          postalCode
        );

        const coverageSnap =
          await getDoc(coverageRef);

        if (cancelled) return;

        // ==============================
        // CP NO REGISTRADO
        // ==============================

        if (!coverageSnap.exists()) {
          const result =
            computeShippingFromCoverage(
              null,
              postalCode
            );

          setShipping(result);

          setStatus("not-covered");

          setMessage(
            "Por el momento no contamos con servicio a domicilio para este código postal."
          );

          onChange?.(null);

          return;
        }

        // ==============================
        // INTERPRETAR COBERTURA
        // ==============================

        const coverage = {
          id: coverageSnap.id,
          ...coverageSnap.data(),
        };

        const result =
          computeShippingFromCoverage(
            coverage,
            postalCode
          );

        if (!result.available) {
          setShipping(result);

          setStatus("not-covered");

          switch (result.reason) {
            case "inactive":
              setMessage(
                "El servicio a domicilio para este código postal se encuentra temporalmente deshabilitado."
              );
              break;

            case "invalid_rate":
              setMessage(
                "No fue posible determinar el costo de envío para este código postal. Por favor contáctanos."
              );
              break;

            case "out_of_coverage":
            default:
              setMessage(
                "Por el momento no contamos con servicio a domicilio para este código postal."
              );
              break;
          }

          // IMPORTANTE:
          // Checkout recibe null y no puede continuar.
          onChange?.(null);

          return;
        }

        // ==============================
        // COBERTURA CORRECTA
        // ==============================

        setShipping(result);

        setStatus("covered");

        setMessage("");

        onChange?.(result);
      } catch (error) {
        console.error(
          "Error consultando cobertura:",
          error
        );

        if (cancelled) return;

        setShipping(null);

        setStatus("error");

        setMessage(
          "No pudimos consultar la cobertura en este momento. Intenta nuevamente."
        );

        onChange?.(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCoverage();

    return () => {
      cancelled = true;
    };
  }, [postalCode]);

  // ==============================
  // SIN DIRECCIÓN
  // ==============================

  if (!address) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">
          Envío a domicilio
        </h3>

        <p className="mt-2 text-sm text-gray-500">
          Selecciona o captura tu dirección para
          consultar la cobertura y el costo de envío.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Envío a domicilio
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Consultaremos la cobertura utilizando el
          código postal de tu dirección.
        </p>
      </div>

      {/* Código postal */}

      <div className="mb-4 rounded-xl bg-gray-50 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Código postal
        </p>

        <p className="mt-1 font-semibold text-gray-900">
          {postalCode || "Sin especificar"}
        </p>
      </div>

      {/* Cargando */}

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            Consultando cobertura...
          </p>
        </div>
      )}

      {/* Sin cobertura */}

      {!loading &&
        status === "not-covered" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-700">
              Dirección fuera de cobertura
            </p>

            <p className="mt-1 text-sm text-red-600">
              {message}
            </p>
          </div>
        )}

      {/* Error */}

      {!loading && status === "error" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-medium text-amber-800">
            No pudimos validar el envío
          </p>

          <p className="mt-1 text-sm text-amber-700">
            {message}
          </p>
        </div>
      )}

      {/* CP incompleto */}

      {!loading &&
        status === "waiting" &&
        message && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-600">
              {message}
            </p>
          </div>
        )}

      {/* Cobertura */}

      {!loading &&
        status === "covered" &&
        shipping && (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="font-semibold text-green-800">
                ✓ Servicio disponible
              </p>

              <p className="mt-1 text-sm text-green-700">
                Esta dirección se encuentra dentro de
                nuestra cobertura de servicio a domicilio.
              </p>
            </div>

            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
              {shipping.municipality && (
                <div className="flex items-center justify-between gap-4 p-4">
                  <span className="text-sm text-gray-500">
                    Municipio
                  </span>

                  <span className="text-right text-sm font-medium text-gray-900">
                    {shipping.municipality}
                  </span>
                </div>
              )}

              {shipping.branchName && (
                <div className="flex items-center justify-between gap-4 p-4">
                  <span className="text-sm text-gray-500">
                    Sucursal asignada
                  </span>

                  <span className="text-right text-sm font-medium text-gray-900">
                    {shipping.branchName}
                  </span>
                </div>
              )}

              {Number.isFinite(
                shipping.distanceKm
              ) && (
                <div className="flex items-center justify-between gap-4 p-4">
                  <span className="text-sm text-gray-500">
                    Distancia de referencia
                  </span>

                  <span className="text-right text-sm font-medium text-gray-900">
                    {shipping.distanceKm} km
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 p-4">
                <span className="font-medium text-gray-700">
                  Costo de envío
                </span>

                <span className="text-xl font-bold text-gray-900">
                  {mxn(shipping.amount)}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              El costo corresponde a la tarifa oficial
              asignada al código postal seleccionado.
            </p>
          </div>
        )}
    </section>
  );
}