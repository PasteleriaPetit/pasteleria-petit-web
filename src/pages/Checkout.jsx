import React, { useMemo, useState, useEffect, useRef } from "react";

import AddressForm from "../components/AddressForm";
import ShippingPicker from "../components/ShippingPicker";

import { useCart } from "../context/CartContext";
import { useAuth } from "../auth/AuthProvider";

import { mxn } from "../utils/money";

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import {
  doc,
  collection,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { useTranslation } from "react-i18next";
import { initializeNetPay } from "../utils/netpay";

export default function Checkout() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { cart, subtotal, clearCart } = useCart();
  const { user } = useAuth();

  // Guardia: Redirigir a la tienda si no cumple el monto mínimo o el carrito está vacío
  useEffect(() => {
    if (cart.length === 0) {
      navigate("/productos");
      return;
    }
    if (subtotal < 350) {
      toast.warning("El monto mínimo de compra es de $350 MXN.");
      navigate("/productos");
    }
  }, [cart, subtotal, navigate]);

  // =========================================================
  // ENTREGA A DOMICILIO
  // =========================================================
  const [address, setAddress] = useState(null);
  const [shipping, setShipping] = useState(null);
  const [loadingPay, setLoadingPay] = useState(false);
  const [error, setError] = useState("");

  const [netpayCheckout, setNetpayCheckout] = useState(null);
  const [isAttachingPayment, setIsAttachingPayment] = useState(false);

  // Referencia para que el callback global de NetPay siempre acceda al valor actualizado
  const currentCheckoutRef = useRef(null);

  useEffect(() => {
    currentCheckoutRef.current = netpayCheckout;
  }, [netpayCheckout]);

  // =========================================================
  // IDIOMA
  // =========================================================
  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved && saved !== i18n.language) {
      i18n.changeLanguage(saved);
    }
  }, [i18n]);

  // =========================================================
  // TOTALES
  // =========================================================
  const shippingAmount = Number(shipping?.amount || 0);

  const grandTotal = useMemo(() => {
    return Number(subtotal || 0) + shippingAmount;
  }, [subtotal, shippingAmount]);

  // =========================================================
  // HABILITACIÓN DEL PAGO
  // =========================================================
  const canPayOnline =
    cart.length > 0 &&
    !!user &&
    !!address &&
    !!address.deliveryDate &&
    !!address.deliveryWindow &&
    !!shipping &&
    shipping.available === true &&
    shipping.covered === true &&
    !loadingPay;

  const openRappiDrawer = () => {
    window.dispatchEvent(new CustomEvent("open-rappi-drawer"));
  };

  const buildOrderNumber = (orderId) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const shortId = orderId
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 6)
      .toUpperCase();

    return `PET-${year}${month}${day}-${shortId}`;
  };

  const buildItems = () => {
    return cart.map((item) => ({
      id: item.id,
      title: item.title,
      qty: Number(item.qty),
      price: Number(item.price),
      img: item.img || "",
      options: item.options || null,
    }));
  };

  const createDeliveryOrder = async () => {
    if (!user) throw new Error("Debes iniciar sesión para realizar el pedido.");
    if (!address) throw new Error("Selecciona una dirección de entrega.");
    if (!shipping || shipping.available !== true || shipping.covered !== true) {
      throw new Error("La dirección seleccionada no cuenta con cobertura de entrega.");
    }
    if (!address.deliveryDate) throw new Error("Selecciona una fecha de entrega.");
    if (!address.deliveryWindow) throw new Error("Selecciona un horario de entrega.");
    if (!cart.length) throw new Error("Tu carrito está vacío.");

    const orderRef = doc(collection(db, "orders"));
    const orderNumber = buildOrderNumber(orderRef.id);

    const orderData = {
      orderNumber,
      items: buildItems(),
      customer: {
        uid: user.uid,
        name: String(address.fullName || "").trim(),
        email: user.email || "",
        phone: String(address.phone || "").trim(),
      },
      address: {
        street: String(address.street || "").trim(),
        extNumber: String(address.extNumber || "").trim(),
        intNumber: String(address.intNumber || "").trim(),
        neighborhood: String(address.neighborhood || "").trim(),
        postalCode: String(address.postalCode || "").trim(),
        city: String(address.city || "").trim(),
        state: String(address.state || "").trim(),
        country: String(address.country || "México").trim(),
        references: String(address.references || "").trim(),
      },
      delivery: {
        type: "delivery",
        date: address.deliveryDate || "",
        window: address.deliveryWindow || "",
        branchId: shipping.branchId || shipping.branchKey || null,
        branchName: shipping.branchName || "",
        municipality: shipping.municipality || "",
        distanceKm: Number.isFinite(Number(shipping.distanceKm))
          ? Number(shipping.distanceKm)
          : null,
        shippingCost: Number(shipping.amount || 0),
        notes: String(address.notas || "").trim(),
      },
      totals: {
        subtotal: Number(subtotal || 0),
        shipping: Number(shipping.amount || 0),
        total: Number(grandTotal || 0),
      },
      payment: {
        provider: "netpay",
        status: "pending",
        transactionId: null,
      },
      shipday: {
        status: "not_created",
        orderId: null,
      },
      status: "pending_payment",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(orderRef, orderData);
    await batch.commit();

    return {
      id: orderRef.id,
      orderNumber,
      data: orderData,
    };
  };

  const getNetPayStateCode = (state) => {
    const normalized = String(state || "").trim().toLowerCase();
    const states = {
      jalisco: "JAL",
      jal: "JAL",
    };
    return states[normalized] || "JAL";
  };

  // =========================================================
  // FLUJO DE PAGO SECUENCIAL (RESUELVE EL FALLO DE APERTURA A LA PRIMERA)
  // =========================================================
  const continueToPayment = async () => {
    try {
      setLoadingPay(true);
      setError("");

      // 1. Crear el pedido en Firestore
      const order = await createDeliveryOrder();

      // 2. Solicitar token a NetPay
      const response = await fetch("/api/netpay/create-amount-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || "No se pudo preparar el pago con NetPay.");
      }

      const tokenAmount = data?.netpay?.tokenAmount;
      if (!tokenAmount) {
        throw new Error("NetPay no devolvió el token de pago.");
      }

      // 3. Guardar estado
      const checkoutInfo = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tokenAmount,
      };
      setNetpayCheckout(checkoutInfo);
      currentCheckoutRef.current = checkoutInfo;

      toast.info("Conectando con pasarela segura...");

      // 4. Secuencia controlada: esperar a que React actualice atributos en el DOM
      setTimeout(async () => {
        try {
          await initializeNetPay();
          
          // Dar un pequeño margen para que el SDK de NetPay registre los data-attributes
          setTimeout(() => {
            const netpayBtn = document.getElementById("netpay-checkout");
            if (netpayBtn) {
              netpayBtn.click();
            } else {
              throw new Error("No se pudo conectar con el botón de NetPay.");
            }
            setLoadingPay(false);
          }, 150);
        } catch (initErr) {
          console.error("Error al inicializar NetPay SDK:", initErr);
          setLoadingPay(false);
          toast.error("La pasarela tardó en responder. Por favor haz clic en pagar nuevamente.");
        }
      }, 50);

    } catch (err) {
      console.error("Error preparando NetPay:", err);
      setError(err?.message || "No se pudo preparar el pago.");
      toast.error(err?.message || "No se pudo preparar el pago.");
      setLoadingPay(false);
    }
  };

  // =========================================================
  // CALLBACKS GLOBALES DE NETPAY
  // =========================================================
  useEffect(() => {
    window.onPaymentSuccess = async (response) => {
      console.log("✅ NetPay payment success recibido:", response);

      const checkoutData = currentCheckoutRef.current;
      const firestoreOrderId = checkoutData?.orderId;

      if (!firestoreOrderId) {
        console.error("No se encontró el ID de Firestore para confirmar el pedido.");
        toast.error("Error al vincular el pedido.");
        return;
      }

      try {
        setIsAttachingPayment(true);
        toast.info("Confirmando pago y programando entrega...");

        let idToken = "";
        if (user) {
          idToken = await user.getIdToken();
        }

        const netpayOrderId =
          response?.orderId ||
          response?.transactionDto?.orderId ||
          response?.data?.orderId ||
          null;

        const transactionTokenId =
          response?.transactionTokenId ||
          response?.transactionDto?.transactionTokenId ||
          response?.data?.transactionTokenId ||
          null;

        const responseCode =
          response?.transactionDto?.responseCode ||
          response?.responseCode ||
          response?.data?.responseCode ||
          "00";

        const authCode =
          response?.transactionDto?.authCode ||
          response?.authCode ||
          response?.data?.authCode ||
          "";

        const transactionStatus =
          response?.transactionDto?.status ||
          response?.status ||
          null;

        const payload = {
          orderId: firestoreOrderId,
          netpayOrderId: netpayOrderId ? String(netpayOrderId) : null,
          transactionTokenId: transactionTokenId ? String(transactionTokenId) : null,
          responseCode: String(responseCode),
          authCode: String(authCode),
          rawStatus: response?.status || "success",
          transactionStatus: transactionStatus ? String(transactionStatus) : null,
          cardLast4: response?.transactionDto?.last4 || response?.last4 || response?.transactionDto?.card?.last4 || "",
          cardBrand: response?.transactionDto?.brand || response?.brand || response?.transactionDto?.card?.brand || "",
          cardType: response?.transactionDto?.cardType || response?.cardType || "Crédito",
          bank: response?.transactionDto?.bank || response?.bank || "Banco Emisor",
          eci: response?.transactionDto?.eci || response?.eci || "06",
          paymentDate: response?.transactionDto?.transactionDate || response?.transactionDate || new Date().toLocaleString("es-MX"),
        };

        const res = await fetch("/api/netpay/confirm-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: idToken ? `Bearer ${idToken}` : "",
          },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        if (!res.ok || !result.ok) {
          throw new Error(result.error || result.message || "No se pudo confirmar el pedido.");
        }

        toast.success("¡Pago exitoso! Tu pedido ha sido confirmado.");
        clearCart();

        // Limpieza de modales residuales
        const selectors = [
          "#netpay-modal",
          ".netpay-modal",
          "#netpay-checkout-modal",
          "iframe[src*='netpay']",
          ".modal-backdrop",
          "[id^='netpay-']",
        ];

        selectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((el) => {
            try {
              el.remove();
            } catch (e) {
              console.warn("No se pudo remover elemento NetPay:", e);
            }
          });
        });

        document.body.style.overflow = "auto";
        const cleanOrderId = String(firestoreOrderId).replace(/^\/+/, "");
        navigate(`/order-success/${cleanOrderId}`);

      } catch (err) {
        console.error("❌ Error en la confirmación del pago:", err);
        toast.error(err.message || "Ocurrió un error al confirmar tu pedido.");
      } finally {
        setIsAttachingPayment(false);
      }
    };

    window.onPaymentError = (response) => {
      console.error("❌ NetPay payment error:", response);
      toast.error("NetPay reportó un error en el pago.");
    };

    return () => {
      delete window.onPaymentSuccess;
      delete window.onPaymentError;
    };
  }, [user, clearCart, navigate]);

  return (
    <main className="bg-cream min-h-[calc(100vh-80px)] pt-[96px] px-4 sm:px-6 lg:px-12 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="font-display text-3xl text-wine">
          {t("checkout.title")}
        </h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* DIRECCIÓN + ENVÍO */}
        <div className="lg:col-span-2 space-y-6">
          <AddressForm onSelected={setAddress} />

          <div className="bg-white rounded-xl border border-rose/30 p-4 shadow-sm">
            <h3 className="text-wine text-lg font-semibold mb-3">
              {t("checkout.shipping.title")}
            </h3>
            <ShippingPicker address={address} onChange={setShipping} />
          </div>

          {/* RAPPI */}
          <div className="bg-white rounded-xl border border-rose/30 p-4 shadow-sm">
            <h3 className="text-wine text-lg font-semibold mb-2">
              {t("checkout.rappiCheckout.title")}
            </h3>
            <p className="text-sm text-wineDark/70">
              {t("checkout.rappiCheckout.subtitle")}
            </p>
            <button
              type="button"
              onClick={openRappiDrawer}
              className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#F44611] text-white text-sm font-medium hover:opacity-90 transition"
            >
              {t("checkout.rappiCheckout.button")}
            </button>
          </div>
        </div>

        {/* RESUMEN */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-rose/30 p-4 shadow-sm">
            <h3 className="text-wine text-lg font-semibold mb-3">
              {t("checkout.summary.title")}
            </h3>

            {cart.length === 0 ? (
              <p className="text-wineDark/70">
                {t("checkout.summary.empty")}
              </p>
            ) : (
              <>
                <ul className="divide-y divide-rose/20 max-h-72 overflow-y-auto pr-2">
                  {cart.map((item) => (
                    <li
                      key={`${item.id}${item.options ? JSON.stringify(item.options) : ""}`}
                      className="py-2 flex items-center gap-3"
                    >
                      <img
                        src={item.img}
                        alt={item.title}
                        className="w-12 h-12 rounded object-cover border border-rose/30"
                      />
                      <div className="flex-1">
                        <div className="text-wine text-sm font-medium truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-wineDark/60">
                          {item.qty} x {mxn(item.price)}
                        </div>
                      </div>
                      <div className="text-sm text-wine font-semibold">
                        {mxn(item.qty * item.price)}
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 space-y-1 text-sm text-wineDark/80">
                  <div className="flex justify-between">
                    <span>{t("checkout.summary.subtotal")}</span>
                    <span>{mxn(subtotal)}</span>
                  </div>

                  {shipping?.amount ? (
                    <div className="flex justify-between">
                      <span>{t("checkout.summary.shipping")}</span>
                      <span>{mxn(shipping.amount)}</span>
                    </div>
                  ) : null}

                  <div className="flex justify-between font-semibold text-wine mt-2">
                    <span>{t("checkout.summary.total")}</span>
                    <span>{mxn(grandTotal)}</span>
                  </div>
                </div>

                {error && (
                  <p className="text-red text-sm mt-3 whitespace-pre-line">
                    {error}
                  </p>
                )}

                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    onClick={openRappiDrawer}
                    className="w-full bg-[#F44611] text-white py-2 rounded-lg hover:opacity-90 transition"
                  >
                    {t("checkout.actions.rappi")}
                  </button>

                  {/* BOTÓN VISIBLE DE PAGO */}
                  <button
                    type="button"
                    disabled={!canPayOnline || loadingPay || isAttachingPayment}
                    onClick={continueToPayment}
                    className="w-full bg-[#0056B3] hover:bg-[#003B6B] text-white py-3.5 rounded-xl font-bold text-base transition flex items-center justify-center gap-3 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loadingPay ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Conectando con pasarela segura...</span>
                      </>
                    ) : isAttachingPayment ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Confirmando pedido...</span>
                      </>
                    ) : (
                      <span>Pagar con NetPay</span>
                    )}
                  </button>

                  {/* BOTÓN TÉCNICO NETPAY: SIEMPRE PRESENTE EN EL DOM PARA EVITAR FALLO DE RECONOCIMIENTO */}
                  <button
                    id="netpay-checkout"
                    type="button"
                    className="fixed -top-[9999px] left-0 w-1 h-1 opacity-0 pointer-events-none overflow-hidden"
                    data-button-title="Continuar"
                    data-street1={`${String(address?.street || "").trim()} ${String(
                      address?.extNumber || ""
                    ).trim()}`.trim()}
                    data-country="MX"
                    data-city={String(address?.city || "").trim()}
                    data-postal-code={String(address?.postalCode || "").trim()}
                    data-state={getNetPayStateCode(address?.state)}
                    data-token={netpayCheckout?.tokenAmount || ""}
                    data-phone-number={String(address?.phone || "").trim()}
                    data-email={user?.email || address?.email || ""}
                    data-merchant-reference-code={netpayCheckout?.orderNumber || ""}
                    data-onsuccess="onPaymentSuccess"
                    data-onerror="onPaymentError"
                    data-product-count={String(
                      cart.reduce((total, item) => total + Number(item.qty || 0), 0)
                    )}
                    data-commerce-name="Petit Repostería con Alma"
                    data-logo-url="https://pasteleriaspetit.com/og-image.png"
                    data-image="https://pasteleriaspetit.com/og-image.png"
                  />
                </div>

                {!user && (
                  <p className="text-xs text-wineDark/60 mt-2">
                    {t("checkout.hints.loginRequired")}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}