import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { mxn } from "../utils/money";

export default function OrderSuccess() {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError("No se proporcionó un ID de pedido válido.");
        setLoading(false);
        return;
      }

      const cleanId = String(orderId).replace(/^\/+/, "");

      try {
        const orderRef = doc(db, "orders", cleanId);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
          setError("No pudimos encontrar los detalles de este pedido.");
        } else {
          setOrder(orderSnap.data());
        }
      } catch (err) {
        console.error("Error al cargar orden:", err);
        setError("Ocurrió un error al cargar la información del pedido.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <main className="bg-cream min-h-screen pt-[120px] px-4 pb-16 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-rose/30 p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 border-4 border-wine border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-wine font-display text-xl font-bold">Imprimiendo orden...</h2>
          <p className="text-wineDark/70 text-sm mt-1">Generando comprobante digital.</p>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="bg-cream min-h-screen pt-[120px] px-4 pb-16 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-rose/30 p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            !
          </div>
          <h2 className="text-wine font-display text-2xl font-bold">Pedido no encontrado</h2>
          <p className="text-wineDark/70 text-sm mt-2">{error}</p>
          <Link
            to="/"
            className="mt-6 inline-block w-full bg-wine text-cream py-3 rounded-xl font-semibold hover:opacity-90 transition text-center"
          >
            Volver a la tienda
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-cream min-h-screen pt-[90px] px-4 sm:px-6 pb-20 flex flex-col items-center">
      
      {/* MENSAJE DE CONFIRMACIÓN */}
      <div className="text-center max-w-lg mb-6">
        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
          <span>✓</span> Pago y orden confirmados
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-wine">
          ¡Gracias por tu compra!
        </h1>
        <p className="text-sm text-wineDark/70 mt-1">
          Tu pedido está listo y registrado en cocina.
        </p>
      </div>

      {/* CONTENEDOR DE LA IMPRESORA TÉRMICA */}
      <div className="w-full max-w-md relative flex flex-col items-center">
        
        {/* CABEZAL / RANURA DE LA IMPRESORA */}
        <div className="w-[92%] sm:w-[95%] h-5 bg-gradient-to-b from-stone-800 to-stone-900 rounded-t-xl shadow-lg relative z-20 flex items-center justify-center border-b-2 border-black/40">
          {/* Luz LED de la impresora */}
          <div className="absolute left-4 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          {/* Ranura por donde sale el papel */}
          <div className="w-[85%] h-1 bg-black rounded-full opacity-80" />
        </div>

        {/* TICKET SALIENDO DE LA RANURA (ANIMADO) */}
        <div className="w-[88%] sm:w-[90%] overflow-hidden relative z-10 pt-1">
          <div className="animate-ticket-print bg-white shadow-2xl border-x border-t border-stone-200 p-6 font-mono text-xs text-stone-800 relative">
            
            {/* ENCABEZADO DEL TICKET */}
            <div className="text-center pb-4 border-b border-dashed border-stone-300 space-y-1">
              <h2 className="font-bold text-base tracking-wider uppercase text-stone-900 font-sans">
                Petit Repostería
              </h2>
              <p className="text-[10px] text-stone-500 uppercase tracking-widest">Con Alma</p>
              <p className="text-[11px] pt-1 text-stone-600">Guadalajara, Jalisco</p>
              <div className="pt-2 text-stone-700">
                <span className="block font-bold">Folio:</span>
                <span className="text-sm font-bold tracking-wider">{order.orderNumber || orderId}</span>
              </div>
            </div>

            {/* FECHA Y ENTREGA */}
            <div className="py-3 border-b border-dashed border-stone-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-stone-500">Fecha de entrega:</span>
                <span className="font-bold">{order.delivery?.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Horario estimado:</span>
                <span className="font-bold">{order.delivery?.window}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Sucursal:</span>
                <span className="font-bold">{order.delivery?.branchName || "Minerva"}</span>
              </div>
            </div>

            {/* DATOS DEL CLIENTE Y DIRECCIÓN */}
            <div className="py-3 border-b border-dashed border-stone-300 text-[11px] space-y-1">
              <p className="font-bold text-stone-900">{order.customer?.name}</p>
              <p className="text-stone-600 leading-tight">
                {order.address?.street} {order.address?.extNumber}
                {order.address?.intNumber ? ` Int ${order.address.intNumber}` : ""},{" "}
                {order.address?.neighborhood}
              </p>
              <p className="text-stone-600">CP {order.address?.postalCode}, {order.address?.city}</p>
              {order.address?.references && (
                <p className="text-[10px] text-stone-500 italic pt-1">
                  Ref: {order.address.references}
                </p>
              )}
            </div>

            {/* PRODUCTOS */}
            <div className="py-3 border-b border-dashed border-stone-300">
              <div className="flex justify-between font-bold text-stone-900 pb-2">
                <span>CANT / ARTÍCULO</span>
                <span>TOTAL</span>
              </div>
              <div className="space-y-2">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[11px]">
                    <div className="pr-2">
                      <span className="font-bold text-stone-900">{item.qty}x </span>
                      <span className="text-stone-700">{item.title}</span>
                      {item.options?.variantLabel && (
                        <span className="block text-[10px] text-stone-500">
                          {item.options.variantLabel}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-stone-800 whitespace-nowrap">
                      {mxn(Number(item.qty || 1) * Number(item.price || 0))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* TOTALES */}
            <div className="py-3 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>{mxn(order.totals?.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Envío</span>
                <span>{mxn(order.totals?.shipping || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-stone-900 text-sm pt-2 border-t border-stone-200">
                <span>TOTAL PAGADO</span>
                <span>{mxn(order.totals?.total || 0)}</span>
              </div>
            </div>

            {/* PIE DEL TICKET */}
            <div className="pt-4 pb-2 text-center border-t border-dashed border-stone-300 space-y-1">
              <p className="font-bold text-stone-700">¡GRACIAS POR TU PREFERENCIA!</p>
              <p className="text-[10px] text-stone-500">
                Cualquier duda con tu pedido, contáctanos vía WhatsApp.
              </p>
              <div className="pt-2 text-[9px] text-stone-400">
                *** COPIA DE CLIENTE ***
              </div>
            </div>

            {/* BORDE ZIG-ZAG / DENTADO INFERIOR */}
            <div className="absolute -bottom-2.5 left-0 w-full ticket-zigzag-bottom" />
          </div>
        </div>
      </div>

      {/* ACCIONES */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={handlePrint}
          className="w-full bg-white border border-rose/30 text-wine py-2.5 px-4 rounded-xl text-sm font-semibold hover:bg-rose/10 transition flex items-center justify-center gap-2 shadow-sm"
        >
          <span>🖨️</span> Imprimir comprobante
        </button>

        <Link
          to="/"
          className="w-full bg-wine text-cream py-2.5 px-4 rounded-xl text-sm font-semibold hover:opacity-90 transition text-center shadow-sm flex items-center justify-center"
        >
          Volver a la tienda
        </Link>
      </div>

    </main>
  );
}