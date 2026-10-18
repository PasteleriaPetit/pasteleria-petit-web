
import admin from "firebase-admin";

function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n"
    );

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
    });
  }

  try {
    const privateKey = process.env.NETPAY_PRIVATE_KEY;
    const baseUrl = process.env.NETPAY_API_BASE_URL;

    if (!privateKey) {
      return res.status(500).json({
        ok: false,
        error: "missing_netpay_private_key",
        message: "NETPAY_PRIVATE_KEY no está configurada.",
      });
    }

    if (!baseUrl) {
      return res.status(500).json({
        ok: false,
        error: "missing_netpay_api_base_url",
        message: "NETPAY_API_BASE_URL no está configurada.",
      });
    }

    // Solo se admite la base de Sandbox para estas pruebas.
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

    if (
      normalizedBaseUrl !==
      "https://gateway-154.netpaydev.com/gateway-ecommerce"
    ) {
      return res.status(500).json({
        ok: false,
        error: "unexpected_netpay_environment",
        message: "La URL configurada no corresponde a Sandbox.",
      });
    }

    const orderId = String(req.body?.orderId || "").trim();

    if (!orderId) {
      return res.status(400).json({
        ok: false,
        error: "missing_order_id",
        message: "Debes proporcionar orderId.",
      });
    }

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

    if (order.status !== "pending_payment") {
      return res.status(409).json({
        ok: false,
        error: "invalid_order_status",
        message: "La orden no se encuentra pendiente de pago.",
      });
    }

    const amount = Number(order.totals?.total);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        ok: false,
        error: "invalid_order_amount",
        message: "El total de la orden no es válido para NetPay.",
      });
    }

    const normalizedAmount = Number(amount.toFixed(2));

    const netpayResponse = await fetch(
      `${normalizedBaseUrl}/v3/token/amount`,
      {
        method: "POST",
        headers: {
          Authorization: privateKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: normalizedAmount,
        }),
      }
    );

    const responseText = await netpayResponse.text();
    let netpayData = null;

    try {
      netpayData = responseText
        ? JSON.parse(responseText)
        : null;
    } catch {
      netpayData = null;
    }

    if (!netpayResponse.ok) {
      console.error("NetPay rechazó la tokenización:", {
        status: netpayResponse.status,
      });

      return res.status(502).json({
        ok: false,
        error: "netpay_amount_token_failed",
        message: "NetPay rechazó la solicitud de tokenización.",
        netpayStatus: netpayResponse.status,
      });
    }

    if (!netpayData?.tokenAmount) {
      console.error(
        "NetPay no devolvió tokenAmount. Revisa la respuesta en los logs del servidor."
      );

      return res.status(502).json({
        ok: false,
        error: "missing_token_amount",
        message: "NetPay no devolvió tokenAmount.",
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Token de monto generado correctamente.",
      order: {
        id: orderId,
        orderNumber: order.orderNumber || null,
        amount: normalizedAmount,
      },
      netpay: {
        tokenAmount: netpayData.tokenAmount,
        clientId: netpayData.clientId ?? null,
        storeId: netpayData.storeId ?? null,
        amount: netpayData.amount ?? normalizedAmount,
      },
    });
  } catch (error) {
    console.error("Error en create-amount-token:", error);

    return res.status(500).json({
      ok: false,
      error: "internal_server_error",
      message: "Ocurrió un error interno al generar el token.",
    });
  }
}
