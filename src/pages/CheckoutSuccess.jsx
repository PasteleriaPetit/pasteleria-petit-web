import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useCart } from "../context/CartContext";
import { useAuth } from "../auth/AuthProvider";

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const orderId = params.get("orderId");
  const { clearCart } = useCart();
  const { user } = useAuth();

  const [status, setStatus] = useState("checking"); // checking | paid | pending | failed | not_found
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!orderId) {
      setStatus("not_found");
      return;
    }

    const ref = doc(db, "orders", orderId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setStatus("not_found");
        return;
      }
      const data = snap.data();
      setOrder(data);

      if (data.status === "paid") setStatus("paid");
      else if (data.status === "payment_failed" || data.status === "cancelled") setStatus("failed");
      else setStatus("pending");
    });

    return () => unsub();
  }, [orderId]);

  useEffect(() => {
    // ✅ limpiar carrito solo cuando el pago sea confirmado
    if (status === "paid") clearCart();
  }, [status, clearCart]);

  return (
    <main className="bg-cream min-h-[calc(100vh-80px)] pt-[96px] px-4 sm:px-6 lg:px-12 pb-10">
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-rose/30 p-6 shadow-sm">
        <h1 className="font-display text-3xl text-wine mb-3">Pago</h1>

        {!orderId ? (
          <p className="text-wineDark/70">No se recibió el número de pedido.</p>
        ) : status === "checking" ? (
          <p className="text-wineDark/70">Verificando tu pago…</p>
        ) : status === "pending" ? (
          <>
            <p className="text-wineDark/70">
              Tu pago está en proceso de validación. En unos segundos debe actualizarse.
            </p>
            <p className="text-xs text-wineDark/60 mt-2">Pedido: {orderId}</p>
          </>
        ) : status === "paid" ? (
          <>
            <p className="text-wine font-semibold">
              ✅ Pago confirmado. Tu pedido quedó registrado.
            </p>
            <p className="text-xs text-wineDark/60 mt-2">Pedido: {orderId}</p>
          </>
        ) : (
          <>
            <p className="text-red">
              ❌ El pago no se confirmó. Si hiciste el cargo, revisa más tarde o contáctanos.
            </p>
            <p className="text-xs text-wineDark/60 mt-2">Pedido: {orderId}</p>
          </>
        )}

        <div className="mt-6 flex gap-3">
          <Link
            to="/"
            className="bg-wine text-cream px-4 py-2 rounded-lg hover:opacity-90 transition"
          >
            Ir al inicio
          </Link>

          {orderId ? (
            <Link
              to="/checkout"
              className="border border-wine/30 text-wine px-4 py-2 rounded-lg hover:bg-rose/10 transition"
            >
              Volver al checkout
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
