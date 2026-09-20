import admin from "firebase-admin";

// ============================================================
// FIREBASE ADMIN
// ============================================================

function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const {
      FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY,
    } = process.env;

    if (
      !FIREBASE_PROJECT_ID ||
      !FIREBASE_CLIENT_EMAIL ||
      !FIREBASE_PRIVATE_KEY
    ) {
      throw new Error(
        "Faltan variables de Firebase Admin."
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID.trim(),

        clientEmail:
          FIREBASE_CLIENT_EMAIL.trim(),

        privateKey:
          FIREBASE_PRIVATE_KEY.replace(
            /\\n/g,
            "\n"
          ),
      }),
    });
  }

  return admin.firestore();
}

// ============================================================
// TELÉFONO
// ============================================================

function normalizeMexicanPhone(phone = "") {
  const digits = String(phone).replace(
    /\D/g,
    ""
  );

  if (!digits) return "";

  // Ya viene con 52
  if (
    digits.length === 12 &&
    digits.startsWith("52")
  ) {
    return `+${digits}`;
  }

  // Teléfono mexicano de 10 dígitos
  if (digits.length === 10) {
    return `+52${digits}`;
  }

  // Fallback
  return `+${digits}`;
}

// ============================================================
// DIRECCIÓN DEL CLIENTE
// ============================================================

function buildCustomerAddress(address = {}) {
  const streetLine = [
    address.street,
    address.extNumber,
  ]
    .filter(Boolean)
    .join(" ");

  const interior = address.intNumber
    ? `Int. ${address.intNumber}`
    : "";

  return [
    streetLine,
    interior,
    address.neighborhood,
    address.city,
    address.state,
    address.postalCode
      ? `CP ${address.postalCode}`
      : "",
    address.country || "México",
  ]
    .filter(Boolean)
    .join(", ");
}

// ============================================================
// DIRECCIÓN DE SUCURSAL
// ============================================================

function buildBranchAddress(branch = {}) {
  // Preferimos el formatted que agregamos en Etapa 1.
  if (branch.address?.formatted) {
    return branch.address.formatted;
  }

  const address = branch.address || {};

  const streetLine = [
    address.street,
    address.extNumber,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    streetLine,
    address.neighborhood,
    address.city,
    address.state,
    address.postalCode
      ? `CP ${address.postalCode}`
      : "",
    address.country || "México",
  ]
    .filter(Boolean)
    .join(", ");
}

// ============================================================
// HORARIOS
// ============================================================

function parseDeliveryWindow(window = "") {
  const [start, end] = String(window).split(
    "-"
  );

  if (!start || !end) {
    throw new Error(
      "La ventana de entrega no es válida."
    );
  }

  return {
    start: `${start}:00`,
    end: `${end}:00`,
  };
}

// ============================================================
// HANDLER
// ============================================================

export default async function handler(req, res) {
  // ----------------------------------------------------------
  // SOLO GET PARA ESTA PRUEBA
  // ----------------------------------------------------------

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
    });
  }

  try {
    const orderId = String(
      req.query.orderId || ""
    ).trim();

    if (!orderId) {
      return res.status(400).json({
        ok: false,
        error: "missing_order_id",
        message:
          "Debes proporcionar ?orderId=ID_DEL_PEDIDO",
      });
    }

    const pickupPhone =
      process.env.PETIT_PICKUP_PHONE;

    if (!pickupPhone) {
      return res.status(500).json({
        ok: false,
        error: "missing_pickup_phone",
      });
    }

    const db = getFirebaseAdmin();

    // ========================================================
    // LEER PEDIDO
    // ========================================================

    const orderRef = db
      .collection("orders")
      .doc(orderId);

    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({
        ok: false,
        error: "order_not_found",
      });
    }

    const order = orderSnap.data();

    // ========================================================
    // VALIDAR SUCURSAL
    // ========================================================

    const branchId =
      order.delivery?.branchId;

    if (!branchId) {
      return res.status(400).json({
        ok: false,
        error: "missing_branch_id",
      });
    }

    // ========================================================
    // LEER SUCURSAL
    // ========================================================

    const branchRef = db
      .collection("branches")
      .doc(branchId);

    const branchSnap =
      await branchRef.get();

    if (!branchSnap.exists) {
      return res.status(404).json({
        ok: false,
        error: "branch_not_found",
        branchId,
      });
    }

    const branch = {
      id: branchSnap.id,
      ...branchSnap.data(),
    };

    // ========================================================
    // VALIDAR DATOS DEL PEDIDO
    // ========================================================

    if (!order.orderNumber) {
      throw new Error(
        "El pedido no tiene orderNumber."
      );
    }

    if (!order.customer?.name) {
      throw new Error(
        "El pedido no tiene nombre del cliente."
      );
    }

    if (!order.customer?.phone) {
      throw new Error(
        "El pedido no tiene teléfono del cliente."
      );
    }

    if (!order.delivery?.date) {
      throw new Error(
        "El pedido no tiene fecha de entrega."
      );
    }

    if (!order.delivery?.window) {
      throw new Error(
        "El pedido no tiene horario de entrega."
      );
    }

    // ========================================================
    // HORARIO
    // ========================================================

    const deliveryWindow =
      parseDeliveryWindow(
        order.delivery.window
      );

    // ========================================================
    // ITEMS
    // ========================================================

    const orderItem = Array.isArray(
      order.items
    )
      ? order.items.map((item) => {
          const result = {
            name:
              String(
                item.title || "Producto"
              ).trim(),

            unitPrice:
              Number(item.price || 0),

            quantity:
              Number(item.qty || 1),
          };

          // Por ahora ponemos la variante como detalle.
          if (item.options?.variantLabel) {
            result.detail =
              `Variante: ${item.options.variantLabel}`;
          }

          return result;
        })
      : [];

    // ========================================================
    // PAYLOAD SHIPDAY
    // ========================================================

    const shipdayPayload = {
      orderNumber:
        String(order.orderNumber),

      customerName:
        String(order.customer.name),

      customerAddress:
        buildCustomerAddress(
          order.address
        ),

      customerEmail:
        String(
          order.customer.email || ""
        ),

      customerPhoneNumber:
        normalizeMexicanPhone(
          order.customer.phone
        ),

      restaurantName:
        String(
          branch.name ||
            order.delivery.branchName ||
            branch.id
        ),

      restaurantAddress:
        buildBranchAddress(branch),

      restaurantPhoneNumber:
        normalizeMexicanPhone(
          pickupPhone
        ),

      expectedDeliveryDate:
        order.delivery.date,

      /*
       * IMPORTANTE:
       *
       * Todavía NO enviaremos este payload.
       *
       * Shipday documenta estos horarios como UTC.
       * En esta prueba queremos comprobar primero
       * que todos los datos y la ventana sean correctos.
       *
       * La conversión Guadalajara -> UTC se hará
       * antes del POST real.
       */

      expectedPickupTime:
        deliveryWindow.start,

      expectedDeliveryTime:
        deliveryWindow.end,

      orderItem,

      tips: 0,

      tax: 0,

      discountAmount: 0,

      deliveryFee:
        Number(
          order.totals?.shipping ||
            order.delivery?.shippingCost ||
            0
        ),

      totalOrderCost:
        Number(
          order.totals?.total || 0
        ),

      deliveryInstruction: [
        order.address?.references
          ? `Referencias: ${order.address.references}`
          : "",

        order.delivery?.notes
          ? `Notas: ${order.delivery.notes}`
          : "",
      ]
        .filter(Boolean)
        .join(" | "),

      orderSource:
        "Petit Repostería Web",

      additionalId:
        String(orderId),

      /*
       * NetPay será pago en línea.
       * Shipday documenta credit_card para este endpoint.
       */
      paymentMethod:
        "credit_card",
    };

    // ========================================================
    // COORDENADAS DE SUCURSAL
    // ========================================================

    if (
      Number.isFinite(
        Number(branch.coords?.lat)
      ) &&
      Number.isFinite(
        Number(branch.coords?.lng)
      )
    ) {
      shipdayPayload.pickupLatitude =
        Number(branch.coords.lat);

      shipdayPayload.pickupLongitude =
        Number(branch.coords.lng);
    }

    // ========================================================
    // RESPUESTA
    //
    // NO HAY FETCH A SHIPDAY AQUÍ.
    // ========================================================

    return res.status(200).json({
      ok: true,

      message:
        "Payload de Shipday generado. No se creó ninguna entrega.",

      source: {
        orderId,
        branchId,
      },

      shipdayPayload,
    });
  } catch (error) {
    console.error(
      "Error generando preview Shipday:",
      error
    );

    return res.status(500).json({
      ok: false,

      error:
        "shipday_preview_error",

      message:
        error?.message ||
        "No fue posible generar el payload.",
    });
  }
}