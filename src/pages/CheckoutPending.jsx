import React, { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function CheckoutPending() {
  const q = useQuery();
  const orderId = q.get("orderId") || "";
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!orderId) return;
    const ref = doc(db, "orders", orderId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setOrder({ id: snap.id, ...snap.data() });
    });
    return () => unsub();
  }, [orderId]);

  return (
    <main className="bg-cream min-h-[calc(100vh-80px)] pt-[96px] px-4 sm:px-6 lg:px-12 pb-10">
      <div className="max-w-2xl mx-auto bg-white border border-rose/30 rounded-2xl p-6 shadow-sm">
        <h1 className="font-display text-3xl text-wine mb-2">Pago pendiente</h1>

        <p className="text-wineDark/70 mb-4">
          Tu pago quedó en estado <strong>pendiente</strong>. En algunos métodos de pago puede tardar unos minutos.
        </p>

        {orderId && (
          <p className="text-wineDark/70 mb-2">
            Número de pedido: <strong className="text-wine">{orderId}</strong>
          </p>
        )}

        {order && (
          <p className="text-wineDark/80">
            Estado actual: <strong className="text-wine">{order.status}</strong>
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <Link
            to="/"
            className="bg-wine text-cream px-4 py-2 rounded-lg hover:opacity-90 transition"
          >
            Volver al inicio
          </Link>
          <Link
            to="/checkout"
            className="border border-wine/30 text-wine px-4 py-2 rounded-lg hover:bg-rose/10 transition"
          >
            Reintentar checkout
          </Link>
        </div>
      </div>
    </main>
  );
}
