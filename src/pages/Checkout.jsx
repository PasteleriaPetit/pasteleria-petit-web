import React, { useMemo, useState, useEffect } from "react";

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

  // =========================================================
  // ENTREGA A DOMICILIO
  // =========================================================

  const [address, setAddress] = useState(null);

  const [shipping, setShipping] = useState(null);

  const [loadingPay, setLoadingPay] =
    useState(false);

  const [error, setError] = useState("");

  const [netpayCheckout, setNetpayCheckout] = useState(null);

  // =========================================================
  // RECOGER / PAGAR EN SUCURSAL
  //
  // Se conserva porque puede volver a utilizarse posteriormente.
  // Actualmente la interfaz correspondiente permanece comentada.
  // =========================================================

  const [showPickupForm, setShowPickupForm] =
    useState(false);

  const [customerName, setCustomerName] =
    useState("");

  const [customerPhone, setCustomerPhone] =
    useState("");

  const [pickupBranch, setPickupBranch] =
    useState("");

  const [pickupTime, setPickupTime] =
    useState("");

  const branches = [
    "Sucursal San Juan Bosco",
    "Sucursal Circunvalación",
    "Sucursal El Salto",
    "Sucursal Obsidiana",
    "Sucursal Minerva",
    "Sucursal Tlaquepaque",
    "Sucursal Río Nilo",
    "Sucursal Revolución",
    "Sucursal Plan de San Luis",
    "Sucursal Zapopan",
    "Sucursal Patria",
  ];

  const isPickupFormValid =
    customerName.trim().length > 2 &&
    customerPhone.length === 10 &&
    pickupBranch &&
    pickupTime;

  // =========================================================
  // IDIOMA
  // =========================================================

  useEffect(() => {
    const saved = localStorage.getItem("lang");

    if (
      saved &&
      saved !== i18n.language
    ) {
      i18n.changeLanguage(saved);
    }
  }, [i18n]);

  // =========================================================
  // TOTALES
  // =========================================================

  const shippingAmount = Number(
    shipping?.amount || 0
  );

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

  const canReserveStore =
    cart.length > 0 &&
    !loadingPay &&
    !!user;

  // =========================================================
  // RAPPI
  // =========================================================

  const openRappiDrawer = () => {
    window.dispatchEvent(
      new CustomEvent("open-rappi-drawer")
    );
  };

  // =========================================================
  // NÚMERO PÚBLICO DEL PEDIDO
  // =========================================================

  const buildOrderNumber = (orderId) => {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(
      now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      now.getDate()
    ).padStart(2, "0");

    const shortId = orderId
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 6)
      .toUpperCase();

    return `PET-${year}${month}${day}-${shortId}`;
  };

  // =========================================================
  // ITEMS
  // =========================================================

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

  // =========================================================
  // CREAR PEDIDO DE ENTREGA
  //
  // IMPORTANTE:
  // Por ahora esto crea el pedido en Firestore.
  // En la siguiente etapa NetPay utilizará este orderId.
  // =========================================================

  const createDeliveryOrder = async () => {
    if (!user) {
      throw new Error(
        "Debes iniciar sesión para realizar el pedido."
      );
    }

    if (!address) {
  throw new Error(
    "Selecciona una dirección de entrega."
  );
}

    if (
      !shipping ||
      shipping.available !== true ||
      shipping.covered !== true
    ) {
      throw new Error(
        "La dirección seleccionada no cuenta con cobertura de entrega."
      );
    }

    if (!address.deliveryDate) {
      throw new Error(
        "Selecciona una fecha de entrega."
      );
    }

    if (!address.deliveryWindow) {
      throw new Error(
        "Selecciona un horario de entrega."
      );
    }

    if (!cart.length) {
      throw new Error(
        "Tu carrito está vacío."
      );
    }

    // Creamos la referencia SIN escribir todavía.
    const orderRef = doc(
      collection(db, "orders")
    );

    const orderNumber =
      buildOrderNumber(orderRef.id);

    const orderData = {
      orderNumber,

      // =============================================
      // PRODUCTOS
      // =============================================

      items: buildItems(),

      // =============================================
      // CLIENTE
      // =============================================

      customer: {
        uid: user.uid,

        name:
          String(
            address.fullName || ""
          ).trim(),

        email: user.email || "",

        phone:
          String(
            address.phone || ""
          ).trim(),
      },

      // =============================================
      // DIRECCIÓN
      //
      // Aquí NO guardamos datos temporales
      // como fecha u horario.
      // =============================================

      address: {
        street:
          String(
            address.street || ""
          ).trim(),

        extNumber:
          String(
            address.extNumber || ""
          ).trim(),

        intNumber:
          String(
            address.intNumber || ""
          ).trim(),

        neighborhood:
          String(
            address.neighborhood || ""
          ).trim(),

        postalCode:
          String(
            address.postalCode || ""
          ).trim(),

        city:
          String(
            address.city || ""
          ).trim(),

        state:
          String(
            address.state || ""
          ).trim(),

        country:
          String(
            address.country || "México"
          ).trim(),

        references:
          String(
            address.references || ""
          ).trim(),
      },

      // =============================================
      // ENTREGA
      // =============================================

      delivery: {
        type: "delivery",

        date:
          address.deliveryDate || "",

        window:
          address.deliveryWindow || "",

        branchId:
          shipping.branchId ||
          shipping.branchKey ||
          null,

        branchName:
          shipping.branchName || "",

        municipality:
          shipping.municipality || "",

        distanceKm:
          Number.isFinite(
            Number(shipping.distanceKm)
          )
            ? Number(shipping.distanceKm)
            : null,

        shippingCost:
          Number(shipping.amount || 0),

        notes:
          String(
            address.notas || ""
          ).trim(),
      },

      // =============================================
      // TOTALES
      // =============================================

      totals: {
        subtotal:
          Number(subtotal || 0),

        shipping:
          Number(shipping.amount || 0),

        total:
          Number(grandTotal || 0),
      },

      // =============================================
      // PAGO
      //
      // Preparado para NetPay.
      // =============================================

      payment: {
        provider: "netpay",

        status: "pending",

        transactionId: null,
      },

      // =============================================
      // SHIPDAY
      //
      // NO creamos todavía la entrega.
      // Solo después de pago aprobado.
      // =============================================

      shipday: {
        status: "not_created",

        orderId: null,
      },

      // =============================================
      // ESTADO GENERAL
      // =============================================

      status: "pending_payment",

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);

    batch.set(
      orderRef,
      orderData
    );

    await batch.commit();

    return {
      id: orderRef.id,
      orderNumber,
      data: orderData,
    };
  };

  // =========================================================
  // PRUEBA DEL NUEVO FLUJO
  //
  // En la próxima etapa esta función será reemplazada
  // por el inicio de NetPay Checkout Plus.
  // =========================================================

  // =========================================================
// CÓDIGO DE ESTADO PARA NETPAY
// =========================================================

const getNetPayStateCode = (state) => {
  const normalized = String(state || "")
    .trim()
    .toLowerCase();

  const states = {
    jalisco: "JAL",
    jal: "JAL",
  };

  return states[normalized] || "";
};

  const continueToPayment = async () => {
  try {
    setLoadingPay(true);
    setError("");
    setNetpayCheckout(null);

    // =========================================
    // 1. CREAR PEDIDO EN FIRESTORE
    // =========================================

    const order =
      await createDeliveryOrder();

    console.log(
      "Pedido preparado para NetPay:",
      order
    );

    // =========================================
    // 2. SOLICITAR TOKEN DE MONTO
    // =========================================

    const response = await fetch(
      "/api/netpay/create-amount-token",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          orderId: order.id,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data?.ok) {
      throw new Error(
        data?.message ||
          "No se pudo preparar el pago con NetPay."
      );
    }

    const tokenAmount =
      data?.netpay?.tokenAmount;

    if (!tokenAmount) {
      throw new Error(
        "NetPay no devolvió el token de pago."
      );
    }

    // =========================================
    // 3. PREPARAR CHECKOUT PLUS
    // =========================================

    setNetpayCheckout({
      orderId: order.id,
      orderNumber: order.orderNumber,
      tokenAmount,
    });

    console.log(
      "Token NetPay generado:",
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tokenAmount,
      }
    );

    toast.success(
      "Pago preparado. Continúa con NetPay."
    );
  } catch (err) {
    console.error(
      "Error preparando NetPay:",
      err
    );

    setError(
      err?.message ||
        "No se pudo preparar el pago."
    );

    toast.error(
      err?.message ||
        "No se pudo preparar el pago."
    );
  } finally {
    setLoadingPay(false);
  }
};

  // =========================================================
  // PAGO / RECOGIDA EN SUCURSAL
  //
  // Se conserva para futura reactivación.
  // =========================================================

  /*
  const reserveInStore = async () => {
    try {
      setLoadingPay(true);
      setError("");

      // Aquí se implementará nuevamente la creación
      // del pedido de pickup si la pastelería decide
      // reactivar esta modalidad.

      console.log({
        customerName,
        customerPhone,
        pickupBranch,
        pickupTime,
      });

    } catch (err) {
      console.error(err);

      setError(
        "No se pudo registrar el pedido"
      );
    } finally {
      setLoadingPay(false);
    }
  };
  */

  // =========================================================
  // COMPONENTE
  // =========================================================

  // =========================================================
// CALLBACKS DE NETPAY
// =========================================================

useEffect(() => {
  window.onPaymentSuccess = (response) => {
    console.log(
      "✅ NetPay payment success:",
      response
    );

    toast.success(
      "NetPay reportó una transacción exitosa."
    );

    /*
     * IMPORTANTE:
     *
     * Este callback ocurre en el navegador.
     * NO lo utilizaremos como confirmación
     * definitiva del pago.
     *
     * Todavía NO:
     *
     * - cambiamos payment.status
     * - cambiamos status a paid
     * - limpiamos el carrito
     * - creamos Shipday
     *
     * La confirmación definitiva se hará
     * desde backend.
     */
  };

  window.onPaymentError = (response) => {
    console.error(
      "❌ NetPay payment error:",
      response
    );

    toast.error(
      "NetPay reportó un error en el pago."
    );
  };

  return () => {
    delete window.onPaymentSuccess;
    delete window.onPaymentError;
  };
}, []);

// =========================================================
// INICIALIZAR CHECKOUT PLUS
//
// Solo se ejecuta cuando ya tenemos:
// - pedido
// - orderNumber
// - tokenAmount
//
// En ese momento React ya renderiza
// #netpay-checkout.
// =========================================================

useEffect(() => {
  if (!netpayCheckout) {
    return;
  }

  let cancelled = false;

  const initialize = async () => {
    try {
      // Permitimos que React termine de colocar
      // #netpay-checkout en el DOM.
      await new Promise((resolve) =>
        setTimeout(resolve, 0)
      );

      if (cancelled) {
        return;
      }

      const button =
        document.getElementById(
          "netpay-checkout"
        );

      if (!button) {
        throw new Error(
          "No se encontró el botón de Checkout Plus."
        );
      }

      await initializeNetPay();

      if (cancelled) {
        return;
      }

      console.log(
        "✅ Checkout Plus inicializado."
      );
    } catch (err) {
      if (cancelled) {
        return;
      }

      console.error(
        "❌ Error inicializando Checkout Plus:",
        err
      );

      const message =
        err?.message ||
        "No se pudo inicializar Checkout Plus.";

      setError(message);

      toast.error(message);
    }
  };

  initialize();

  return () => {
    cancelled = true;
  };
}, [netpayCheckout]);

  return (
    <main className="
      bg-cream
      min-h-[calc(100vh-80px)]
      pt-[96px]
      px-4
      sm:px-6
      lg:px-12
      pb-10
    ">
      <div className="
        flex
        flex-col
        gap-3
        sm:flex-row
        sm:items-center
        sm:justify-between
        mb-6
      ">
        <h1 className="
          font-display
          text-3xl
          text-wine
        ">
          {t("checkout.title")}
        </h1>
      </div>

      <div className="
        grid
        lg:grid-cols-3
        gap-8
      ">
        {/* =========================================
            DIRECCIÓN + ENVÍO
        ========================================== */}

        <div className="
          lg:col-span-2
          space-y-6
        ">
          <AddressForm
            onSelected={setAddress}
          />

          <div className="
            bg-white
            rounded-xl
            border
            border-rose/30
            p-4
            shadow-sm
          ">
            <h3 className="
              text-wine
              text-lg
              font-semibold
              mb-3
            ">
              {t(
                "checkout.shipping.title"
              )}
            </h3>

            <ShippingPicker
              address={address}
              onChange={setShipping}
            />
          </div>

          {/* =====================================
              RAPPI
          ====================================== */}

          <div className="
            bg-white
            rounded-xl
            border
            border-rose/30
            p-4
            shadow-sm
          ">
            <h3 className="
              text-wine
              text-lg
              font-semibold
              mb-2
            ">
              {t(
                "checkout.rappiCheckout.title"
              )}
            </h3>

            <p className="
              text-sm
              text-wineDark/70
            ">
              {t(
                "checkout.rappiCheckout.subtitle"
              )}
            </p>

            <button
              type="button"
              onClick={openRappiDrawer}
              className="
                mt-3
                inline-flex
                items-center
                justify-center
                px-4
                py-2
                rounded-lg
                bg-[#F44611]
                text-white
                text-sm
                font-medium
                hover:opacity-90
                transition
              "
            >
              {t(
                "checkout.rappiCheckout.button"
              )}
            </button>
          </div>
        </div>

        {/* =========================================
            RESUMEN
        ========================================== */}

        <div className="space-y-4">
          <div className="
            bg-white
            rounded-xl
            border
            border-rose/30
            p-4
            shadow-sm
          ">
            <h3 className="
              text-wine
              text-lg
              font-semibold
              mb-3
            ">
              {t(
                "checkout.summary.title"
              )}
            </h3>

            {cart.length === 0 ? (
              <p className="text-wineDark/70">
                {t(
                  "checkout.summary.empty"
                )}
              </p>
            ) : (
              <>
                {/* ITEMS */}

                <ul className="
                  divide-y
                  divide-rose/20
                  max-h-72
                  overflow-y-auto
                  pr-2
                ">
                  {cart.map((item) => (
                    <li
                      key={`${item.id}${
                        item.options
                          ? JSON.stringify(
                              item.options
                            )
                          : ""
                      }`}
                      className="
                        py-2
                        flex
                        items-center
                        gap-3
                      "
                    >
                      <img
                        src={item.img}
                        alt={item.title}
                        className="
                          w-12
                          h-12
                          rounded
                          object-cover
                          border
                          border-rose/30
                        "
                      />

                      <div className="flex-1">
                        <div className="
                          text-wine
                          text-sm
                          font-medium
                          truncate
                        ">
                          {item.title}
                        </div>

                        <div className="
                          text-xs
                          text-wineDark/60
                        ">
                          {item.qty} x{" "}
                          {mxn(item.price)}
                        </div>
                      </div>

                      <div className="
                        text-sm
                        text-wine
                        font-semibold
                      ">
                        {mxn(
                          item.qty *
                            item.price
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* TOTALES */}

                <div className="
                  mt-4
                  space-y-1
                  text-sm
                  text-wineDark/80
                ">
                  <div className="
                    flex
                    justify-between
                  ">
                    <span>
                      {t(
                        "checkout.summary.subtotal"
                      )}
                    </span>

                    <span>
                      {mxn(subtotal)}
                    </span>
                  </div>

                  {shipping?.amount ? (
                    <div className="
                      flex
                      justify-between
                    ">
                      <span>
                        {t(
                          "checkout.summary.shipping"
                        )}
                      </span>

                      <span>
                        {mxn(
                          shipping.amount
                        )}
                      </span>
                    </div>
                  ) : null}

                  <div className="
                    flex
                    justify-between
                    font-semibold
                    text-wine
                    mt-2
                  ">
                    <span>
                      {t(
                        "checkout.summary.total"
                      )}
                    </span>

                    <span>
                      {mxn(grandTotal)}
                    </span>
                  </div>
                </div>

                {/* ERROR */}

                {error && (
                  <p className="
                    text-red
                    text-sm
                    mt-3
                    whitespace-pre-line
                  ">
                    {error}
                  </p>
                )}

                {/* ACCIONES */}

                <div className="
                  mt-4
                  grid
                  gap-3
                ">
                  <button
                    type="button"
                    onClick={
                      openRappiDrawer
                    }
                    className="
                      w-full
                      bg-[#F44611]
                      text-white
                      py-2
                      rounded-lg
                      hover:opacity-90
                      transition
                    "
                  >
                    {t(
                      "checkout.actions.rappi"
                    )}
                  </button>

                  {/* =================================
                      RECOGER / PAGAR EN SUCURSAL

                      Se mantiene comentado porque
                      actualmente no se utiliza.
                  ================================== */}

                  {/*
                  <button
                    disabled={
                      !canReserveStore
                    }
                    onClick={() =>
                      setShowPickupForm(
                        true
                      )
                    }
                    className="
                      w-full
                      bg-wine
                      text-cream
                      py-2
                      rounded-lg
                      hover:opacity-90
                      transition
                      disabled:opacity-50
                    "
                  >
                    {t(
                      "checkout.actions.reserveStore"
                    )}
                  </button>

                  {showPickupForm && (
                    <div className="
                      bg-rose/10
                      border
                      border-rose/30
                      rounded-xl
                      p-4
                      mt-3
                      space-y-3
                    ">
                      <input
                        type="text"
                        placeholder="Nombre"
                        value={
                          customerName
                        }
                        onChange={(e) =>
                          setCustomerName(
                            e.target.value
                          )
                        }
                        className="
                          w-full
                          border
                          border-rose/30
                          rounded-lg
                          px-3
                          py-2
                        "
                      />

                      <input
                        type="tel"
                        placeholder="Teléfono"
                        value={
                          customerPhone
                        }
                        onChange={(e) => {
                          const numbersOnly =
                            e.target.value.replace(
                              /\D/g,
                              ""
                            );

                          setCustomerPhone(
                            numbersOnly.slice(
                              0,
                              10
                            )
                          );
                        }}
                        className="
                          w-full
                          border
                          border-rose/30
                          rounded-lg
                          px-3
                          py-2
                        "
                      />

                      <select
                        value={
                          pickupBranch
                        }
                        onChange={(e) =>
                          setPickupBranch(
                            e.target.value
                          )
                        }
                        className="
                          w-full
                          border
                          border-rose/30
                          rounded-lg
                          px-3
                          py-2
                        "
                      >
                        <option value="">
                          Selecciona
                          sucursal
                        </option>

                        {branches.map(
                          (branch) => (
                            <option
                              key={branch}
                              value={
                                branch
                              }
                            >
                              {branch}
                            </option>
                          )
                        )}
                      </select>

                      <input
                        type="time"
                        min="8:30"
                        max="21:00"
                        value={
                          pickupTime
                        }
                        onChange={(e) =>
                          setPickupTime(
                            e.target.value
                          )
                        }
                        className="
                          w-full
                          border
                          border-rose/30
                          rounded-lg
                          px-3
                          py-2
                        "
                      />

                      <button
                        disabled={
                          !isPickupFormValid ||
                          loadingPay
                        }
                        className="
                          w-full
                          bg-wine
                          text-white
                          py-2
                          rounded-lg
                          disabled:bg-gray-400
                        "
                      >
                        Confirmar pedido
                      </button>
                    </div>
                  )}
                  */}

                 {/* =================================
                        NETPAY CHECKOUT PLUS
                    ================================== */}

                    <button
                      type="button"
                      disabled={!canPayOnline}
                      onClick={continueToPayment}
                      className="
                        w-full
                        bg-blue-600
                        text-white
                        py-2
                        rounded-lg
                        hover:opacity-90
                        transition
                        disabled:opacity-50
                        disabled:cursor-not-allowed
                      "
                    >
                      {loadingPay
                        ? "Preparando pedido..."
                        : "Continuar al pago"}
                    </button>

                    {/* =================================
                        BOTÓN GENERADO PARA CHECKOUT PLUS

                        Solo existe después de obtener
                        tokenAmount desde nuestro backend.
                    ================================== */}

                    {netpayCheckout && (
                      <button
                        id="netpay-checkout"
                        type="button"

                        data-button-title="Continuar"

                        data-street1={`${String(
                          address?.street || ""
                        ).trim()} ${String(
                          address?.extNumber || ""
                        ).trim()}`.trim()}

                        data-country="MX"

                        data-city={
                          String(
                            address?.city || ""
                          ).trim()
                        }

                        data-postal-code={
                          String(
                            address?.postalCode || ""
                          ).trim()
                        }

                        data-state={
                          getNetPayStateCode(
                            address?.state
                          )
                        }

                        data-token={
                          netpayCheckout.tokenAmount
                        }

                        data-phone-number={
                          String(
                            address?.phone || ""
                          ).trim()
                        }

                        data-email={
                          String(
                            user?.email || ""
                          ).trim()
                        }

                        data-merchant-reference-code={
                          netpayCheckout.orderNumber
                        }

                        data-onsuccess="onPaymentSuccess"

                        data-onerror="onPaymentError"

                        data-product-count={String(
                          cart.reduce(
                            (total, item) =>
                              total +
                              Number(item.qty || 0),
                            0
                          )
                        )}

                        data-commerce-name="Petit Repostería con Alma"

                        className="
                          w-full
                          bg-wine
                          text-white
                          py-3
                          rounded-lg
                          font-semibold
                          hover:opacity-90
                          transition
                        "
                      >
                        Abrir pago con NetPay
                      </button>
                    )}

                </div>

                {!user && (
                  <p className="
                    text-xs
                    text-wineDark/60
                    mt-2
                  ">
                    {t(
                      "checkout.hints.loginRequired"
                    )}
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