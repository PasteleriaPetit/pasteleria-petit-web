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
    start,
    end,
  };
}

// ============================================================
// CONVERSIÓN MÉXICO → UTC
//
// America/Mexico_City actualmente usa UTC-6.
// Para las fechas actuales de operación de Petit no se aplica
// horario de verano.
//
// 10:00 local -> 16:00 UTC
// 14:00 local -> 20:00 UTC
// ============================================================

function localMexicoTimeToUtc(
  dateString,
  timeString
) {
  const dateMatch = String(dateString).match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  const timeMatch = String(timeString).match(
    /^(\d{2}):(\d{2})$/
  );

  if (!dateMatch || !timeMatch) {
    throw new Error(
      `Fecha u hora inválida: ${dateString} ${timeString}`
    );
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  /*
   * Guadalajara / America/Mexico_City:
   * UTC-6.
   *
   * Para convertir hora local a UTC
   * sumamos 6 horas.
   */

  const utcDate = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hour + 6,
      minute,
      0
    )
  );

  const utcDateString =
    utcDate.toISOString().slice(0, 10);

  const utcTimeString =
    utcDate.toISOString().slice(11, 19);

  return {
    date: utcDateString,
    time: utcTimeString,
    iso: utcDate.toISOString(),
  };
}

// ============================================================
// API
// ============================================================

export default async function handler(req, res) {
  // ----------------------------------------------------------
  // SOLO POST
  // ----------------------------------------------------------

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
      message:
        "Este endpoint solo acepta solicitudes POST.",
    });
  }

  try {
    // ========================================================
    // 1. VARIABLES DE ENTORNO
    // ========================================================

    const apiKey =
      process.env.SHIPDAY_API_KEY;

    const pickupPhone =
      process.env.PETIT_PICKUP_PHONE;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "missing_shipday_api_key",
      });
    }

    if (!pickupPhone) {
      return res.status(500).json({
        ok: false,
        error: "missing_pickup_phone",
      });
    }

    // ========================================================
    // 2. OBTENER orderId DEL BODY
    // ========================================================

    const orderId = String(
      req.body?.orderId || ""
    ).trim();

    if (!orderId) {
      return res.status(400).json({
        ok: false,
        error: "missing_order_id",
        message:
          "Debes enviar orderId en el body.",
      });
    }

    const db = getDb();

    const orderRef = db
      .collection("orders")
      .doc(orderId);

    // ========================================================
    // 3. LEER PEDIDO
    // ========================================================

    const orderSnap =
      await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({
        ok: false,
        error: "order_not_found",
        orderId,
      });
    }

    const order = orderSnap.data();

    // ========================================================
    // 4. PROTECCIÓN CONTRA DUPLICADOS
    // ========================================================

    if (
      order.shipday?.orderId ||
      order.shipday?.status === "created"
    ) {
      return res.status(409).json({
        ok: false,
        error: "shipday_order_already_created",

        message:
          "Este pedido ya tiene una orden creada en Shipday.",

        shipday: order.shipday,
      });
    }

    // ========================================================
    // 5. SUCURSAL
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
    // 6. VALIDACIONES
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
    // 7. HORARIO LOCAL
    // ========================================================

    const window = parseWindow(
      order.delivery.window
    );

    // ========================================================
    // 8. CONVERTIR A UTC
    // ========================================================

    const pickupUtc =
      localMexicoTimeToUtc(
        order.delivery.date,
        window.start
      );

    const deliveryUtc =
      localMexicoTimeToUtc(
        order.delivery.date,
        window.end
      );

    // ========================================================
    // 9. PRODUCTOS
    // ========================================================

    const orderItem =
      Array.isArray(order.items)
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

            if (
              item.options?.variantLabel
            ) {
              details.push(
                `Variante: ${item.options.variantLabel}`
              );
            }

            if (details.length) {
              product.detail = [
                ...new Set(details),
              ].join(" | ");
            }

            return product;
          })
        : [];

    // ========================================================
    // 10. INSTRUCCIONES
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
    // 11. PAYLOAD SHIPDAY
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

      /*
       * Shipday recibe fecha y horas UTC.
       */

      expectedDeliveryDate:
        deliveryUtc.date,

      expectedPickupTime:
        pickupUtc.time,

      expectedDeliveryTime:
        deliveryUtc.time,

      orderItem,

      tips: 0,
      tax: 0,
      discountAmount: 0,

      deliveryFee:
        Number(
          order.totals?.shipping ??
            order.delivery
              ?.shippingCost ??
            0
        ),

      totalOrderCost:
        Number(
          order.totals?.total || 0
        ),

      deliveryInstruction:
        instructions,

      orderSource:
        "Petit Repostería Web - PRUEBA",

      additionalId:
        String(orderId),

      paymentMethod:
        "credit_card",
    };

    // ========================================================
    // 12. COORDENADAS PICKUP
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
      shipdayPayload.pickupLatitude =
        lat;

      shipdayPayload.pickupLongitude =
        lng;
    }

    // ========================================================
    // 13. MARCAR INTENTO
    // ========================================================

    await orderRef.set(
      {
        shipday: {
          status: "creating",
          orderId: null,
          lastAttemptAt:
            admin.firestore.FieldValue.serverTimestamp(),
        },

        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      },
      {
        merge: true,
      }
    );

    // ========================================================
    // 14. CREAR ORDEN EN SHIPDAY
    // ========================================================

    const response = await fetch(
      "https://api.shipday.com/orders",
      {
        method: "POST",

        headers: {
          Accept: "application/json",
          "Content-Type":
            "application/json",

          Authorization:
            `Basic ${apiKey}`,
        },

        body: JSON.stringify(
          shipdayPayload
        ),
      }
    );

    const rawResponse =
      await response.text();

    let shipdayResponse = null;

    try {
      shipdayResponse =
        rawResponse
          ? JSON.parse(rawResponse)
          : null;
    } catch {
      shipdayResponse =
        rawResponse;
    }

    // ========================================================
    // 15. ERROR HTTP SHIPDAY
    // ========================================================

    if (!response.ok) {
      console.error(
        "Shipday respondió con error:",
        response.status,
        shipdayResponse
      );

      await orderRef.set(
        {
          shipday: {
            status:
              "create_failed",

            orderId: null,

            httpStatus:
              response.status,

            error:
              typeof shipdayResponse ===
              "string"
                ? shipdayResponse
                : JSON.stringify(
                    shipdayResponse
                  ),

            lastAttemptAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },

          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      return res
        .status(response.status)
        .json({
          ok: false,

          error:
            "shipday_create_failed",

          shipdayStatus:
            response.status,

          shipdayResponse,

          utcConversion: {
            localDate:
              order.delivery.date,

            localWindow:
              order.delivery.window,

            pickupUtc:
              pickupUtc.iso,

            deliveryUtc:
              deliveryUtc.iso,
          },
        });
    }

    // ========================================================
    // 16. VALIDAR RESPUESTA SHIPDAY
    // ========================================================

    const shipdayOrderId =
      shipdayResponse?.orderId;

    if (
      shipdayResponse?.success !==
        true ||
      !shipdayOrderId
    ) {
      await orderRef.set(
        {
          shipday: {
            status:
              "create_failed",

            orderId: null,

            error:
              "Shipday respondió sin un orderId válido.",

            response:
              shipdayResponse,

            lastAttemptAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },

          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      return res.status(502).json({
        ok: false,

        error:
          "invalid_shipday_response",

        message:
          "Shipday respondió, pero no devolvió un orderId válido.",

        shipdayResponse,
      });
    }

    // ========================================================
    // 17. GUARDAR ÉXITO EN FIRESTORE
    // ========================================================

    await orderRef.set(
      {
        shipday: {
          status: "created",

          orderId:
            String(
              shipdayOrderId
            ),

          createdAt:
            admin.firestore.FieldValue.serverTimestamp(),

          lastAttemptAt:
            admin.firestore.FieldValue.serverTimestamp(),
        },

        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      },
      {
        merge: true,
      }
    );

    // ========================================================
    // 18. RESPUESTA FINAL
    // ========================================================

    return res.status(200).json({
      ok: true,

      message:
        "Orden de prueba creada correctamente en Shipday.",

      source: {
        orderId,
        orderNumber:
          order.orderNumber,
        branchId,
      },

      shipday: {
        orderId:
          shipdayOrderId,

        response:
          shipdayResponse,
      },

      utcConversion: {
        timezone:
          "America/Mexico_City",

        localDate:
          order.delivery.date,

        localWindow:
          order.delivery.window,

        pickupUtc:
          pickupUtc.iso,

        deliveryUtc:
          deliveryUtc.iso,
      },
    });
  } catch (error) {
    console.error(
      "Error creando orden Shipday:",
      error
    );

    return res.status(500).json({
      ok: false,

      error:
        "shipday_create_error",

      message:
        error?.message ||
        "No fue posible crear la orden en Shipday.",
    });
  }
}