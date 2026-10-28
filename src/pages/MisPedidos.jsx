import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { Link } from "react-router-dom";
import { mxn } from "../utils/money";

export default function MisPedidos() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserOrders = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "orders"),
          where("customer.uid", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const snap = await getDocs(q);
        const list = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setOrders(list);
      } catch (err) {
        console.error("Error al cargar pedidos del usuario:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrders();
  }, [user]);

  if (!user) {
    return (
      <main className="bg-cream min-h-screen pt-[120px] px-4 pb-16 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center border border-rose/30 shadow-sm">
          <h2 className="text-wine font-display text-2xl font-bold">Inicia Sesión</h2>
          <p className="text-wineDark/70 text-sm mt-2">
            Debes iniciar sesión para consultar tu historial de pedidos y tickets.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block w-full bg-wine text-cream py-3 rounded-xl font-semibold hover:opacity-90 transition text-center"
          >
            Ir a Iniciar Sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-cream min-h-screen pt-[110px] px-4 sm:px-6 lg:px-12 pb-16">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl text-center font-display font-bold text-wine">Mis Pedidos</h1>
          <p className="text-sm text-center text-wineDark/70 mt-1">
            Consulta el historial de tus compras y descarga tus comprobantes en cualquier momento.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-rose/20">
            <div className="w-10 h-10 border-4 border-wine border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-wine text-sm font-semibold">Cargando tus pedidos...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-rose/20 space-y-4">
            <p className="text-wineDark/70 text-sm">Aún no tienes pedidos registrados con esta cuenta.</p>
            <Link
              to="/productos"
              className="inline-block bg-wine text-cream px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition"
            >
              Explorar Productos
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-5 border border-rose/30 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-wine/40 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-wine text-base">
                      {order.orderNumber || order.id}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                        order.status === "paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {order.status === "paid" ? "Pagado" : "Pendiente"}
                    </span>
                  </div>

                  <p className="text-xs text-wineDark/60">
                    Fecha de entrega: <strong className="text-wineDark">{order.delivery?.date}</strong> ({order.delivery?.window})
                  </p>
                  <p className="text-xs text-wineDark/60">
                    Sucursal: {order.delivery?.branchName || "Minerva"} · {order.items?.length || 0} producto(s)
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-rose/10">
                  <span className="text-lg font-bold text-wine">
                    {mxn(order.totals?.total || 0)}
                  </span>
                  <Link
                    to={`/order-success/${order.id}`}
                    className="inline-flex items-center gap-1.5 text-xs bg-rose/15 text-wine hover:bg-wine hover:text-cream px-3 py-1.5 rounded-lg font-semibold transition"
                  >
                    <span>🖨️</span> Ver Ticket
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}