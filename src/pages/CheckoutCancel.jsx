import React, { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function CheckoutCancel() {
  const q = useQuery();
  const orderId = q.get("orderId") || "";

  return (
    <main className="bg-cream min-h-[calc(100vh-80px)] pt-[96px] px-4 sm:px-6 lg:px-12 pb-10">
      <div className="max-w-2xl mx-auto bg-white border border-rose/30 rounded-2xl p-6 shadow-sm">
        <h1 className="font-display text-3xl text-wine mb-2">Pago cancelado</h1>

        <p className="text-wineDark/70 mb-4">
          El pago no se completó. Puedes intentarlo de nuevo cuando gustes.
        </p>

        {orderId && (
          <p className="text-wineDark/70">
            Número de pedido: <strong className="text-wine">{orderId}</strong>
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <Link
            to="/checkout"
            className="bg-wine text-cream px-4 py-2 rounded-lg hover:opacity-90 transition"
          >
            Volver al checkout
          </Link>
          <Link
            to="/"
            className="border border-wine/30 text-wine px-4 py-2 rounded-lg hover:bg-rose/10 transition"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
