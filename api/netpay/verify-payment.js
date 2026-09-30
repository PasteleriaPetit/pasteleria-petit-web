import admin from "firebase-admin";

// =========================================================
// FIREBASE ADMIN
// =========================================================

function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const projectId =
      process.env.FIREBASE_PROJECT_ID;

    const clientEmail =
      process.env.FIREBASE_CLIENT_EMAIL;

    const privateKey =
      process.env.FIREBASE_PRIVATE_KEY?.replace(
        /\\n/g,
        "\n"
      );

    if (
      !projectId ||
      !clientEmail ||
      !privateKey
    ) {
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

// =========================================================
// ESCAPAR STRING PARA GRAPHQL
// =========================================================

function escapeGraphQLString(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

// =========================================================
// HANDLER
// =========================================================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);

    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
    });
  }

  try {
    // =====================================================
    // 1. CREDENCIALES
    // =====================================================

    const privateKey =
      process.env.NETPAY_PRIVATE_KEY;

    if (!privateKey) {
      return res.status(500).json({
        ok: false,
        error: "missing_netpay_private_key",
        message:
          "NETPAY_PRIVATE_KEY no está configurada.",
      });
    }

    // =====================================================
    // 2. DATOS RECIBIDOS
    // =====================================================

    const orderId =
      String(req.body?.orderId || "").trim();

    const transactionTokenId =
      String(
        req.body?.transactionTokenId || ""
      ).trim();

    if (!orderId) {
      return res.status(400).json({
        ok: false,
        error: "missing_order_id",
        message:
          "Debes proporcionar el orderId de Firestore.",
      });
    }

    if (!transactionTokenId) {
      return res.status(400).json({
        ok: false,
        error: "missing_transaction_token_id",
        message:
          "Debes proporcionar transactionTokenId.",
      });
    }

    // =====================================================
    // 3. LEER PEDIDO REAL DE FIRESTORE
    // =====================================================

    const firebaseAdmin =
      getFirebaseAdmin();

    const db =
      firebaseAdmin.firestore();

    const orderRef =
      db.collection("orders").doc(orderId);

    const orderSnap =
      await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({
        ok: false,
        error: "order_not_found",
        message:
          "No se encontró la orden en Firestore.",
      });
    }

    const order =
      orderSnap.data();

    const expectedOrderNumber =
      String(order.orderNumber || "").trim();

    const expectedAmount =
      Number(order.totals?.total);

    if (!expectedOrderNumber) {
      return res.status(400).json({
        ok: false,
        error: "missing_order_number",
        message:
          "La orden no tiene orderNumber.",
      });
    }

    if (
      !Number.isFinite(expectedAmount) ||
      expectedAmount <= 0
    ) {
      return res.status(400).json({
        ok: false,
        error: "invalid_order_amount",
        message:
          "El total de la orden no es válido.",
      });
    }

    // =====================================================
    // 4. CONSULTA GRAPHQL A NETPAY
    // =====================================================

    const safeTransactionTokenId =
      escapeGraphQLString(
        transactionTokenId
      );

    const query = `
      {
        allTransactions(
          transactionTokenId: "${safeTransactionTokenId}"
        ) {
          transaction_id
          transaction_token_id
          order_id
          merchant_ref_code
          transaction_date
          auth_amount
          capt_amount
          currency
          status
          report_status
          response_code
          response_msg
          auth_code
          store_id
          store_name
          brand
          card_type
        }
      }
    `;

    const netpayResponse =
      await fetch(
        "https://gateway.netpay-api.com/reports-sandbox/v1/graphql",
        {
          method: "POST",

          headers: {
            "X-Netpay-Apikey":
              privateKey,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify({
            query,
          }),
        }
      );

    // =====================================================
    // 5. LEER RESPUESTA DE NETPAY
    // =====================================================

    const responseText =
      await netpayResponse.text();

    let netpayData = null;

    try {
      netpayData =
        responseText
          ? JSON.parse(responseText)
          : null;
    } catch {
      netpayData = {
        rawResponse: responseText,
      };
    }

    // =====================================================
    // 6. ERROR HTTP
    // =====================================================

    if (!netpayResponse.ok) {
      console.error(
        "Error consultando transacción en NetPay:",
        netpayResponse.status,
        netpayData
      );

      return res.status(502).json({
        ok: false,
        error:
          "netpay_transaction_query_failed",
        message:
          "NetPay rechazó la consulta de la transacción.",
        netpayStatus:
          netpayResponse.status,
        netpayResponse:
          netpayData,
      });
    }

    // =====================================================
    // 7. GRAPHQL PUEDE DEVOLVER HTTP 200 + errors
    // =====================================================

    if (
      Array.isArray(netpayData?.errors) &&
      netpayData.errors.length > 0
    ) {
      console.error(
        "GraphQL devolvió errores:",
        netpayData.errors
      );

      return res.status(502).json({
        ok: false,
        error:
          "netpay_graphql_error",
        message:
          "NetPay devolvió errores en la consulta GraphQL.",
        errors:
          netpayData.errors,
      });
    }

    // =====================================================
    // 8. TRANSACCIONES ENCONTRADAS
    // =====================================================

    const transactions =
      Array.isArray(
        netpayData?.data?.allTransactions
      )
        ? netpayData.data.allTransactions
        : [];

    if (!transactions.length) {
      return res.status(404).json({
        ok: false,
        error:
          "transaction_not_found",
        message:
          "NetPay no encontró una transacción con ese transactionTokenId.",

        expected: {
          orderNumber:
            expectedOrderNumber,

          amount:
            Number(
              expectedAmount.toFixed(2)
            ),
        },
      });
    }

    // =====================================================
    // 9. SOLO DIAGNÓSTICO
    //
    // TODAVÍA NO:
    // - actualizamos Firestore
    // - marcamos paid
    // - creamos Shipday
    // =====================================================

    return res.status(200).json({
      ok: true,

      mode: "diagnostic",

      message:
        "La transacción fue encontrada en NetPay. Firestore no fue modificado.",

      firestore: {
        orderId,

        orderNumber:
          expectedOrderNumber,

        amount:
          Number(
            expectedAmount.toFixed(2)
          ),

        status:
          order.status || null,

        paymentStatus:
          order.payment?.status || null,
      },

      requestedTransactionTokenId:
        transactionTokenId,

      transactions,
    });
  } catch (error) {
    console.error(
      "Error en verify-payment:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        "internal_server_error",
      message:
        error?.message ||
        "Ocurrió un error verificando el pago.",
    });
  }
}