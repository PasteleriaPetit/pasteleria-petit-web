import admin from "firebase-admin";

// Normalización de teléfonos mexicanos
function normalizeMexicanPhone(phone = "") {
    const digits = String(phone).replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length === 12 && digits.startsWith("52")) return `+${digits}`;
    if (digits.length === 10) return `+52${digits}`;
    return `+${digits}`;
}

// Dirección del cliente
function buildCustomerAddress(address = {}) {
    const street = [address.street, address.extNumber].filter(Boolean).join(" ");
    const interior = address.intNumber ? `Int. ${address.intNumber}` : "";
    return [
    street,
    interior,
    address.neighborhood,
    address.city,
    address.state,
    address.postalCode ? `CP ${address.postalCode}` : "",
    address.country || "México",
    ]
    .filter(Boolean)
    .join(", ");
}

// Dirección de la sucursal asignada
function buildBranchAddress(branch = {}) {
    if (branch.address?.formatted) return branch.address.formatted;
    const address = branch.address || {};
    const street = [address.street, address.extNumber].filter(Boolean).join(" ");
    return [
    street,
    address.neighborhood,
    address.city,
    address.state,
    address.postalCode ? `CP ${address.postalCode}` : "",
    address.country || "México",
    ]
    .filter(Boolean)
    .join(", ");
}

// Conversión de ventana horaria
function parseWindow(window = "") {
    const [start, end] = String(window).split("-");
    if (!start || !end) {
    throw new Error(`Ventana de entrega inválida: ${window}`);
    }
    return { start, end };
}

// Conversión Guadalajara (UTC-6) a UTC
function localMexicoTimeToUtc(dateString, timeString) {
    const dateMatch = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timeMatch = String(timeString).match(/^(\d{2}):(\d{2})$/);

    if (!dateMatch || !timeMatch) {
    throw new Error(`Fecha u hora inválida: ${dateString} ${timeString}`);
    }

    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    const hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);

    const utcDate = new Date(Date.UTC(year, month - 1, day, hour + 6, minute, 0));

    return {
    date: utcDate.toISOString().slice(0, 10),
    time: utcDate.toISOString().slice(11, 19),
    };
}

/**
 * Función central para crear una orden en Shipday a partir de un pedido de Firestore
 * @param {Object} order - Documento de la orden en Firestore
 * @param {string} orderId - ID del documento en Firestore
 * @param {FirebaseFirestore.Firestore} db - Instancia de Firestore
 */
export async function createShipdayOrderCore(order, orderId, db) {
  const apiKey = process.env.SHIPDAY_API_KEY;
  const pickupPhone = process.env.PETIT_PICKUP_PHONE;

  if (!apiKey) throw new Error("Falta la variable SHIPDAY_API_KEY.");
  if (!pickupPhone) throw new Error("Falta la variable PETIT_PICKUP_PHONE.");

  // 1. Validar que no se haya creado previamente
  if (order.shipday?.orderId || order.shipday?.status === "created") {
    return {
      alreadyCreated: true,
      shipdayOrderId: String(order.shipday.orderId),
      response: order.shipday,
    };
  }

  // 2. Obtener sucursal
  const branchId = order.delivery?.branchId;
  if (!branchId) throw new Error("El pedido no tiene branchId asignado.");

  const branchSnap = await db.collection("branches").doc(branchId).get();
  if (!branchSnap.exists) {
    throw new Error(`Sucursal no encontrada en Firestore: ${branchId}`);
  }
  const branch = { id: branchSnap.id, ...branchSnap.data() };

  // 3. Validaciones básicas
  if (!order.orderNumber) throw new Error("El pedido no contiene orderNumber.");
  if (!order.customer?.name) throw new Error("El pedido no contiene nombre del cliente.");
  if (!order.customer?.phone) throw new Error("El pedido no contiene teléfono del cliente.");
  if (!order.delivery?.date) throw new Error("El pedido no contiene fecha de entrega.");
  if (!order.delivery?.window) throw new Error("El pedido no contiene horario de entrega.");

  // 4. Horarios en UTC
  const window = parseWindow(order.delivery.window);
  const pickupUtc = localMexicoTimeToUtc(order.delivery.date, window.start);
  const deliveryUtc = localMexicoTimeToUtc(order.delivery.date, window.end);

  // 5. Productos
  const orderItem = Array.isArray(order.items)
    ? order.items.map((item) => {
        const product = {
          name: String(item.title || "Producto"),
          unitPrice: Number(item.price || 0),
          quantity: Number(item.qty || 1),
        };
        const details = [];
        if (item.variantLabel) details.push(`Variante: ${item.variantLabel}`);
        if (item.options?.variantLabel) details.push(`Variante: ${item.options.variantLabel}`);
        if (details.length) product.detail = [...new Set(details)].join(" | ");
        return product;
      })
    : [];

  // 6. Instrucciones
  const instructions = [
    order.address?.references ? `Referencias: ${order.address.references}` : "",
    order.delivery?.notes ? `Notas: ${order.delivery.notes}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  // 7. Payload Shipday
  const shipdayPayload = {
    orderNumber: String(order.orderNumber),
    customerName: String(order.customer.name),
    customerAddress: buildCustomerAddress(order.address),
    customerEmail: String(order.customer.email || ""),
    customerPhoneNumber: normalizeMexicanPhone(order.customer.phone),
    restaurantName: String(branch.name || order.delivery.branchName || branch.id),
    restaurantAddress: buildBranchAddress(branch),
    restaurantPhoneNumber: normalizeMexicanPhone(pickupPhone),
    expectedDeliveryDate: deliveryUtc.date,
    expectedPickupTime: pickupUtc.time,
    expectedDeliveryTime: deliveryUtc.time,
    orderItem,
    tips: 0,
    tax: 0,
    discountAmount: 0,
    deliveryFee: Number(order.totals?.shipping ?? order.delivery?.shippingCost ?? 0),
    totalOrderCost: Number(order.totals?.total || 0),
    deliveryInstruction: instructions,
    orderSource: "Petit Repostería Web",
    additionalId: String(orderId),
    paymentMethod: "credit_card",
  };

  const lat = Number(branch.coords?.lat);
  const lng = Number(branch.coords?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    shipdayPayload.pickupLatitude = lat;
    shipdayPayload.pickupLongitude = lng;
  }

  // 8. Envío a Shipday
  const response = await fetch("https://api.shipday.com/orders", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${apiKey}`,
    },
    body: JSON.stringify(shipdayPayload),
  });

  const rawResponse = await response.text();
  let shipdayResponse = null;
  try {
    shipdayResponse = rawResponse ? JSON.parse(rawResponse) : null;
  } catch {
    shipdayResponse = rawResponse;
  }

  if (!response.ok || shipdayResponse?.success !== true || !shipdayResponse?.orderId) {
    const errorMsg =
      shipdayResponse?.message ||
      (typeof shipdayResponse === "string" ? shipdayResponse : JSON.stringify(shipdayResponse));
    throw new Error(`Shipday error (${response.status}): ${errorMsg}`);
  }

  return {
    alreadyCreated: false,
    shipdayOrderId: String(shipdayResponse.orderId),
    response: shipdayResponse,
  };
}