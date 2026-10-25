import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "../context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { mxn } from "../utils/money";
import { useNavigate } from "react-router-dom";
import { cld } from "../utils/cloudinary";

const MIN_ORDER_AMOUNT = 350;

export default function CartDrawer({ open, onClose }) {
  const {
    cart,
    removeFromCart,
    setQuantity,
    increase,
    decrease,
    subtotal,
    discount = 0,
    taxes = 0,
    clearCart,
    maxItemQty = 5,
  } = useCart();
  const { t } = useTranslation();

  const [shipping] = useState({
    amount: 0,
    express: false,
    expressFee: 0,
    earlyOnly: false,
  });
  const navigate = useNavigate();

  const grandTotal =
    subtotal +
    (shipping?.amount || 0) +
    (shipping?.express ? shipping?.expressFee || 0 : 0) -
    (discount || 0) +
    (taxes || 0);

  // Validación de monto mínimo
  const hasItems = cart.length > 0;
  const meetsMinOrder = subtotal >= MIN_ORDER_AMOUNT;
  const amountShortage = Math.max(0, MIN_ORDER_AMOUNT - subtotal);
  const minOrderProgress = Math.min(100, Math.round((subtotal / MIN_ORDER_AMOUNT) * 100));

  // Accesibilidad: ESC y focus
  const drawerRef = useRef(null);
  const lastFocusedRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    if (open) {
      lastFocusedRef.current = document.activeElement;
      document.addEventListener("keydown", onKey);
      setTimeout(
        () =>
          drawerRef.current
            ?.querySelector("button, input, a")
            ?.focus(),
        10
      );
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      if (
        lastFocusedRef.current &&
        typeof lastFocusedRef.current.focus === "function"
      ) {
        lastFocusedRef.current.focus();
      }
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="drawer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex justify-end z-50"
          onClick={onClose}
          aria-modal="true"
          role="dialog"
          aria-label={t("cart.title")}
        >
          <motion.div
            ref={drawerRef}
            onClick={(e) => e.stopPropagation()}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28 }}
            className="bg-cream w-full max-w-sm h-full shadow-xl flex flex-col outline-none"
          >
            {/* Header */}
            <header className="p-4 border-b border-rose flex justify-between items-center sticky top-0 bg-cream z-10">
              <h2 className="text-lg font-semibold text-wine">
                {t("cart.title")}
              </h2>
              <button
                onClick={onClose}
                className="text-wineDark/70 hover:text-red transition focus:outline-none focus:ring-2 focus:ring-rose rounded"
              >
                ✕
              </button>
            </header>

            {/* Barra de progreso de pedido mínimo ($350) */}
            {hasItems && (
              <div className="bg-white px-4 py-2.5 border-b border-rose/30 shadow-inner">
                {meetsMinOrder ? (
                  <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                    <span>✓</span> ¡Alcanzaste el monto mínimo de envío ({mxn(MIN_ORDER_AMOUNT)})!
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-xs text-wineDark/80">
                      Te faltan <strong className="text-wine">{mxn(amountShortage)}</strong> para el pedido mínimo ({mxn(MIN_ORDER_AMOUNT)}).
                    </p>
                    <div className="w-full bg-rose/20 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-wine h-2 rounded-full transition-all duration-300"
                        style={{ width: `${minOrderProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-wineDark/70 mt-8">
                  {t("cart.empty")}
                </p>
              ) : (
                cart.map((item) => {
                  const lineKey = `${item.id}::${
                    item.options ? JSON.stringify(item.options) : ""
                  }`;
                  const isMaxReached = (item.qty || 1) >= maxItemQty;

                  return (
                    <motion.div
                      key={lineKey}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 border-b border-rose/30 pb-3"
                    >
                      <img
                        src={cld(item.img, { w: 160, h: 160, ar: "1:1", fit: "fill", g: "auto" })}
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-lg border border-rose/30 bg-cream"
                        loading="lazy"
                      />

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-wine truncate">
                          {item.title}
                        </h3>

                        {item.options?.variantLabel && (
                          <p className="text-xs text-wineDark/70">
                            {item.options.variantLabel}
                          </p>
                        )}

                        {item.options?.size && (
                          <p className="text-xs text-wineDark/70">
                            {item.options.size}
                          </p>
                        )}

                        <p className="text-sm text-wineDark/70">
                          {mxn(item.price)}
                        </p>

                        {/* Controles de cantidad con límite de 5 */}
                        <div className="mt-1 flex flex-col items-start gap-1">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => decrease(item.id, item.options)}
                              className="w-7 h-7 rounded-md border border-wine/30 text-wine hover:bg-rose/20 transition flex items-center justify-center font-bold"
                              aria-label="Disminuir"
                            >
                              –
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={maxItemQty}
                              value={item.qty}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (val > maxItemQty) {
                                  setQuantity(item.id, item.options, maxItemQty);
                                } else {
                                  setQuantity(item.id, item.options, val);
                                }
                              }}
                              className="w-12 border border-wine/30 rounded-md px-1 py-0.5 text-center text-wineDark text-sm font-semibold"
                            />
                            <button
                              disabled={isMaxReached}
                              onClick={() => increase(item.id, item.options)}
                              className={`w-7 h-7 rounded-md border border-wine/30 text-wine transition flex items-center justify-center font-bold ${
                                isMaxReached
                                  ? "opacity-40 cursor-not-allowed bg-rose/10"
                                  : "hover:bg-rose/20"
                              }`}
                              aria-label="Aumentar"
                              title={isMaxReached ? `Límite máximo: ${maxItemQty} piezas` : "Aumentar"}
                            >
                              +
                            </button>
                          </div>
                          {isMaxReached && (
                            <span className="text-[10px] text-amber-800 font-medium">
                              Máx. {maxItemQty} pzas. ¿Requieres más? Contáctanos.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-semibold text-wine">
                          {mxn(item.price * item.qty)}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id, item.options)}
                          className="text-red hover:scale-110 transition-transform mt-2"
                          aria-label="Eliminar"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <footer className="p-4 border-t border-rose space-y-3 bg-cream sticky bottom-0 z-10">
              {/* Totales */}
              <div className="space-y-1 text-wineDark/80 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-wine">{mxn(subtotal)}</span>
                </div>
                {shipping?.amount ? (
                  <div className="flex justify-between">
                    <span>Envío estimado</span>
                    <span>{mxn(shipping.amount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-bold text-wine mt-2 pt-2 border-t border-rose/30 text-base">
                  <span>{t("cart.total")}:</span>
                  <motion.span
                    key={grandTotal}
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {mxn(grandTotal)}
                  </motion.span>
                </div>
              </div>

              {/* Botón de Proceder al Checkout con bloqueo por monto mínimo */}
              <button
                disabled={!hasItems || !meetsMinOrder}
                onClick={() => {
                  onClose?.();
                  navigate("/checkout");
                }}
                className={`w-full py-2.5 rounded-xl font-semibold transition text-sm ${
                  !hasItems || !meetsMinOrder
                    ? "bg-wine/40 text-cream/70 cursor-not-allowed"
                    : "bg-wine text-cream hover:opacity-90 shadow-sm"
                }`}
              >
                {!meetsMinOrder && hasItems
                  ? `Monto mínimo: ${mxn(MIN_ORDER_AMOUNT)}`
                  : t("cart.checkout")}
              </button>

              <button
                onClick={clearCart}
                className="bg-red/10 border border-red/30 w-full text-red py-2 rounded-xl text-xs font-semibold hover:bg-red hover:text-white transition"
              >
                {t("cart.clear")}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}