import admin from "firebase-admin";

function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Faltan variables de entorno de Firebase Admin."
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return admin;
}

// ========================================
// HANDLER
// ========================================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);

    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
    });
  }

  try {
    // ========================================
    // VARIABLES DE ENTORNO
    // ========================================

    const privateKey = process.env.NETPAY_PRIVATE_KEY;

    if (!privateKey) {
      return res.status(500).json({
        ok: false,
        error: "missing_netpay_private_key",
        message:
          "NETPAY_PRIVATE_KEY no está configurada en el servidor.",
      });
    }

    // ========================================
    // ORDER ID
    // ========================================

    const orderId = String(req.body?.orderId || "").trim();

    if (!orderId) {
      return res.status(400).json({
        ok: false,
        error: "missing_order_id",
        message: "Debes proporcionar orderId.",
      });
    }

    // ========================================
    // LEER ORDER DESDE FIRESTORE
    // ========================================

    const firebaseAdmin = getFirebaseAdmin();
    const db = firebaseAdmin.firestore();

    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({
        ok: false,
        error: "order_not_found",
        message: "No se encontró la orden en Firestore.",
      });
    }

    const order = orderSnap.data();

    // ========================================
    // VALIDAR ESTADO DEL PEDIDO
    // ========================================

    if (order.status !== "pending_payment") {
      return res.status(409).json({
        ok: false,
        error: "invalid_order_status",
        message:
          "La orden no se encuentra pendiente de pago.",
        currentStatus: order.status || null,
      });
    }

    // ========================================
    // OBTENER TOTAL DESDE FIRESTORE
    // ========================================

    const amount = Number(order.totals?.total);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        ok: false,
        error: "invalid_order_amount",
        message:
          "El total de la orden no es válido para NetPay.",
      });
    }

    // Dos decimales como máximo
    const normalizedAmount = Number(amount.toFixed(2));

    // ========================================
    // TOKENIZACIÓN NETPAY SANDBOX
    // ========================================

    const netpayResponse = await fetch(
      "https://gateway-154.netpaydev.com/gateway-ecommerce/v3/token/amount",
      {
        method: "POST",
        headers: {
          Authorization: privateKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          amount: normalizedAmount,
        }),
      }
    );

    // ========================================
    // LEER RESPUESTA
    // ========================================

    const responseText = await netpayResponse.text();

    let netpayData = null;

    try {
      netpayData = responseText
        ? JSON.parse(responseText)
        : null;
    } catch {
      netpayData = {
        rawResponse: responseText,
      };
    }

    // ========================================
    // ERROR DE NETPAY
    // ========================================

    if (!netpayResponse.ok) {
      console.error(
        "Error tokenizando monto en NetPay:",
        netpayResponse.status,
        netpayData
      );

      return res.status(502).json({
        ok: false,
        error: "netpay_amount_token_failed",
        message:
          "NetPay rechazó la solicitud de tokenización.",
        netpayStatus: netpayResponse.status,
        netpayResponse: netpayData,
      });
    }

    // ========================================
    // VALIDAR TOKEN
    // ========================================

    const tokenAmount = netpayData?.tokenAmount;

    if (!tokenAmount) {
      return res.status(502).json({
        ok: false,
        error: "missing_token_amount",
        message:
          "NetPay respondió correctamente, pero no devolvió tokenAmount.",
        netpayResponse: netpayData,
      });
    }

    // ========================================
    // RESPUESTA AL FRONTEND
    // ========================================

    return res.status(200).json({
      ok: true,
      message:
        "Token de monto generado correctamente.",

      order: {
        id: orderId,
        orderNumber: order.orderNumber || null,
        amount: normalizedAmount,
      },

      netpay: {
        tokenAmount,
        clientId: netpayData?.clientId ?? null,
        storeId: netpayData?.storeId ?? null,
        amount: netpayData?.amount ?? normalizedAmount,
      },
    });
  } catch (error) {
    console.error(
      "Error en create-amount-token:",
      error
    );

    return res.status(500).json({
      ok: false,
      error: "internal_server_error",
      message:
        error?.message ||
        "Ocurrió un error interno al generar el token de monto.",
    });
  }
}