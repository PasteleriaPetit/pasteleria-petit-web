import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "../context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { mxn } from "../utils/money";
import ShippingPicker from "./ShippingPicker";
import { useNavigate } from "react-router-dom";
import { cld } from "../utils/cloudinary";

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
  } = useCart();
  const { t } = useTranslation();

  // Estado de envío (Picker emite amount, express, expressFee, earlyOnly, branchId, distanceKm)
  const [shipping, setShipping] = useState({
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

  // Mensaje para WhatsApp (por si luego lo quieres usar desde aquí)
  const whatsappText = useMemo(() => {
    const lines = [
      "Hola! Quiero hacer este pedido:\n",
      ...cart.map(
        (i) =>
          `• ${i.title}${
            i.options?.size ? ` (${i.options.size})` : ""
          } x${i.qty} — ${mxn(i.price * i.qty)}`
      ),
      "",
      `Subtotal: ${mxn(subtotal)}`,
      shipping?.amount ? `Envío: ${mxn(shipping.amount)}` : null,
      shipping?.express
        ? `Express: ${mxn(shipping.expressFee || 0)}`
        : null,
      discount ? `Descuento: -${mxn(discount)}` : null,
      taxes ? `Impuestos: ${mxn(taxes)}` : null,
      `Total: ${mxn(grandTotal)}`,
    ]
      .filter(Boolean)
      .join("\n");

    return encodeURIComponent(lines);
  }, [cart, subtotal, discount, taxes, shipping, grandTotal]);

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
            <header className="p-4 border-b border-rose flex justify-between items-center sticky top-0 bg-cream">
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

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-wineDark/70">
                  {t("cart.empty")}
                </p>
              ) : (
                cart.map((item) => {
                  const lineKey = `${item.id}::${
                    item.options
                      ? JSON.stringify(item.options)
                      : ""
                  }`;
                  return (
                    <motion.div
                      key={lineKey}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 border-b border-rose/30 pb-2"
                    >
                      <img
                        src={cld(item.img, { w: 160, h: 160, ar: "1:1", fit: "fill", g: "auto" })}
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-lg border border-rose/30 bg-cream"
                        loading="lazy"
                      />

                      {item.options?.variantLabel && (
                        <p className="text-xs text-wineDark/70">
                          {item.options.variantLabel}
                        </p>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-wine truncate">
                          {item.title}
                        </h3>
                        {item.options?.size && (
                          <p className="text-xs text-wineDark/70">
                            {item.options.size}
                          </p>
                        )}
                        <p className="text-sm text-wineDark/70">
                          {mxn(item.price)}
                        </p>

                        {/* Controles de cantidad */}
                        <div className="mt-1 inline-flex items-center gap-2">
                          <button
                            onClick={() =>
                              decrease(item.id, item.options)
                            }
                            className="w-7 h-7 rounded-md border border-wine/30 text-wine hover:bg-rose/20"
                            aria-label="Disminuir"
                          >
                            –
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={item.qty}
                            onChange={(e) =>
                              setQuantity(
                                item.id,
                                item.options,
                                Number(e.target.value)
                              )
                            }
                            className="w-14 border border-wine/30 rounded-md px-2 py-0.5 text-center text-wineDark"
                          />
                          <button
                            onClick={() =>
                              increase(item.id, item.options)
                            }
                            className="w-7 h-7 rounded-md border border-wine/30 text-wine hover:bg-rose/20"
                            aria-label="Aumentar"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-semibold text-wine">
                          {mxn(item.price * item.qty)}
                        </div>
                        <button
                          onClick={() =>
                            removeFromCart(item.id, item.options)
                          }
                          className="text-red hover:scale-110 transition-transform mt-1"
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
            <footer className="p-4 border-t border-rose space-y-3 bg-cream sticky bottom-0">
              {/* Totales */}
              <div className="space-y-1 text-wineDark/80 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{mxn(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Envío</span>
                  <span>{mxn(shipping?.amount || 0)}</span>
                </div>
                {shipping?.express ? (
                  <div className="flex justify-between">
                    <span>Express</span>
                    <span>{mxn(shipping?.expressFee || 0)}</span>
                  </div>
                ) : null}
                {discount ? (
                  <div className="flex justify-between">
                    <span>Descuento</span>
                    <span>-{mxn(discount)}</span>
                  </div>
                ) : null}
                {taxes ? (
                  <div className="flex justify-between">
                    <span>Impuestos</span>
                    <span>{mxn(taxes)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-semibold text-wine mt-2">
                  <span>{t("cart.total")}:</span>
                  <motion.span
                    key={grandTotal}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {mxn(grandTotal)}
                  </motion.span>
                </div>
              </div>
              <button
                onClick={() => {
                  onClose?.();
                  navigate("/checkout");
                }}
                className="w-full bg-wine text-cream py-2 rounded-lg hover:opacity-90 transition"
              >
                {t("cart.checkout")}
              </button>

              <button
                onClick={clearCart}
                className="bg-red w-full text-cream py-2 rounded-lg hover:bg-wine transition"
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
