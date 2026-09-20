import admin from "firebase-admin";

// ============================================================
// FIREBASE ADMIN
// ============================================================

function getDb() {
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
        "Faltan variables de entorno de Firebase Admin."
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID.trim(),
        clientEmail: FIREBASE_CLIENT_EMAIL.trim(),
        privateKey: FIREBASE_PRIVATE_KEY.replace(
          /\\n/g,
          "\n"
        ),
      }),
    });
  }

  return admin.firestore();
}

// ============================================================
// TELÉFONOS
// ============================================================

function normalizeMexicanPhone(phone = "") {
  const digits = String(phone).replace(/\D/g, "");

  if (!digits) return "";

  if (
    digits.length === 12 &&
    digits.startsWith("52")
  ) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+52${digits}`;
  }

  return `+${digits}`;
}

// ============================================================
// DIRECCIÓN CLIENTE
// ============================================================

function buildCustomerAddress(address = {}) {
  const street = [
    address.street,
    address.extNumber,
  ]
    .filter(Boolean)
    .join(" ");

  const interior = address.intNumber
    ? `Int. ${address.intNumber}`
    : "";

  return [
    street,
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
// DIRECCIÓN SUCURSAL
// ============================================================

function buildBranchAddress(branch = {}) {
  if (branch.address?.formatted) {
    return branch.address.formatted;
  }

  const address = branch.address || {};

  const street = [
    address.street,
    address.extNumber,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    street,
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
// HORARIO
// ============================================================

function parseWindow(window = "") {
  const [start, end] = String(window).split("-");

  if (!start || !end) {
    throw new Error(
      `Ventana de entrega inválida: ${window}`
    );
  }

  return {
    localStart: `${start}:00`,
    localEnd: `${end}:00`,
  };
}

// ============================================================
// API
// ============================================================

export default async function handler(req, res) {
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
          "Debes proporcionar ?orderId=ID_DEL_DOCUMENTO",
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

    const db = getDb();

    // ========================================================
    // 1. LEER ORDER
    // ========================================================

    const orderSnap = await db
      .collection("orders")
      .doc(orderId)
      .get();

    if (!orderSnap.exists) {
      return res.status(404).json({
        ok: false,
        error: "order_not_found",
        orderId,
      });
    }

    const order = orderSnap.data();

    // ========================================================
    // 2. OBTENER SUCURSAL ASIGNADA
    // ========================================================

    const branchId =
      order.delivery?.branchId;

    if (!branchId) {
      return res.status(400).json({
        ok: false,
        error: "missing_branch_id",
      });
    }

    const branchSnap = await db
      .collection("branches")
      .doc(branchId)
      .get();

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
    // 3. VALIDACIONES
    // ========================================================

    if (!order.orderNumber) {
      throw new Error(
        "El pedido no contiene orderNumber."
      );
    }

    if (!order.customer?.name) {
      throw new Error(
        "El pedido no contiene nombre del cliente."
      );
    }

    if (!order.customer?.phone) {
      throw new Error(
        "El pedido no contiene teléfono del cliente."
      );
    }

    if (!order.address?.postalCode) {
      throw new Error(
        "El pedido no contiene código postal."
      );
    }

    if (!order.delivery?.date) {
      throw new Error(
        "El pedido no contiene fecha de entrega."
      );
    }

    if (!order.delivery?.window) {
      throw new Error(
        "El pedido no contiene horario de entrega."
      );
    }

    // ========================================================
    // 4. HORARIO
    // ========================================================

    const window = parseWindow(
      order.delivery.window
    );

    // ========================================================
    // 5. PRODUCTOS
    // ========================================================

    const orderItem = Array.isArray(order.items)
      ? order.items.map((item) => {
          const product = {
            name: String(
              item.title || "Producto"
            ),

            unitPrice: Number(
              item.price || 0
            ),

            quantity: Number(
              item.qty || 1
            ),
          };

          const details = [];

          if (item.variantLabel) {
            details.push(
              `Variante: ${item.variantLabel}`
            );
          }

          if (item.options?.variantLabel) {
            details.push(
              `Variante: ${item.options.variantLabel}`
            );
          }

          if (details.length) {
            product.detail =
              [...new Set(details)].join(" | ");
          }

          return product;
        })
      : [];

    // ========================================================
    // 6. INSTRUCCIONES
    // ========================================================

    const instructions = [
      order.address?.references
        ? `Referencias: ${order.address.references}`
        : "",

      order.delivery?.notes
        ? `Notas: ${order.delivery.notes}`
        : "",
    ]
      .filter(Boolean)
      .join(" | ");

    // ========================================================
    // 7. PAYLOAD SHIPDAY
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
        String(order.customer.email || ""),

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
       * TEMPORAL:
       * estos son todavía horarios locales de Petit.
       *
       * Antes del POST real los convertiremos
       * correctamente a UTC.
       */
      expectedPickupTime:
        window.localStart,

      expectedDeliveryTime:
        window.localEnd,

      orderItem,

      tips: 0,
      tax: 0,
      discountAmount: 0,

      deliveryFee:
        Number(
          order.totals?.shipping ??
            order.delivery?.shippingCost ??
            0
        ),

      totalOrderCost:
        Number(order.totals?.total || 0),

      deliveryInstruction:
        instructions,

      orderSource:
        "Petit Repostería Web",

      additionalId:
        String(orderId),

      paymentMethod:
        "credit_card",
    };

    // ========================================================
    // 8. COORDENADAS DE RECOLECCIÓN
    // ========================================================

    const lat = Number(
      branch.coords?.lat
    );

    const lng = Number(
      branch.coords?.lng
    );

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      shipdayPayload.pickupLatitude = lat;
      shipdayPayload.pickupLongitude = lng;
    }

    // ========================================================
    // 9. RESPUESTA
    //
    // IMPORTANTE:
    // AQUÍ NO EXISTE NINGÚN FETCH A SHIPDAY.
    // ========================================================

    return res.status(200).json({
      ok: true,

      message:
        "Payload generado correctamente. No se creó ninguna orden en Shipday.",

      source: {
        orderId,
        branchId,
      },

      localDeliveryWindow: {
        date: order.delivery.date,
        window: order.delivery.window,
        start: window.localStart,
        end: window.localEnd,
        timezone: "America/Mexico_City",
      },

      shipdayPayload,
    });
  } catch (error) {
    console.error(
      "Error generando payload Shipday:",
      error
    );

    return res.status(500).json({
      ok: false,
      error: "shipday_preview_error",
      message:
        error?.message ||
        "No fue posible generar el payload.",
    });
  }
}