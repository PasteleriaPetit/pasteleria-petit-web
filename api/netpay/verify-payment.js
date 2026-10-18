import admin from "firebase-admin";

// =========================================================
// INICIALIZACIÓN DE FIREBASE ADMIN
// =========================================================

function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Faltan variables de entorno de Firebase Admin.");
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
// ESCAPAR CARACTERES PARA GRAPHQL
// =========================================================

function escapeGraphQLString(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

// =========================================================
// HANDLER PRINCIPAL
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
    // 1. Validar presencia de llaves
    const privateKey = process.env.NETPAY_PRIVATE_KEY;

    if (!privateKey) {
      return res.status(500).json({
        ok: false,
        error: "missing_netpay_private_key",
        message: "NETPAY_PRIVATE_KEY no está configurada.",
      });
    }

    // 2. Extraer parámetros enviados
    const firestoreOrderId = String(req.body?.orderId || "").trim();
    const transactionTokenId = String(req.body?.transactionTokenId || "").trim();
    const netpayOrderId = String(req.body?.netpayOrderId || "").trim();

    if (!firestoreOrderId) {
      return res.status(400).json({
        ok: false,
        error: "missing_order_id",
        message: "Debes proporcionar el orderId de Firestore.",
      });
    }

    if (!transactionTokenId && !netpayOrderId) {
      return res.status(400).json({
        ok: false,
        error: "missing_netpay_identifier",
        message: "Debes proporcionar transactionTokenId o netpayOrderId.",
      });
    }

    // 3. Leer documento en Firestore para contrastar montos y referencia
    const firebaseAdmin = getFirebaseAdmin();
    const db = firebaseAdmin.firestore();
    const orderRef = db.collection("orders").doc(firestoreOrderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({
        ok: false,
        error: "order_not_found",
        message: "No se encontró la orden en Firestore.",
      });
    }

    const order = orderSnap.data();
    const expectedOrderNumber = String(order.orderNumber || "").trim();
    const expectedAmount = Number(order.totals?.total);

    if (!expectedOrderNumber) {
      return res.status(400).json({
        ok: false,
        error: "missing_order_number",
        message: "La orden no tiene orderNumber.",
      });
    }

    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      return res.status(400).json({
        ok: false,
        error: "invalid_order_amount",
        message: "El total de la orden no es válido.",
      });
    }

    // 4. Construir consulta GraphQL según el esquema oficial
    // transaction(orderId: ...) para búsqueda individual
    // allTransactions(transactionTokenId: ...) para búsqueda plural
    let query = "";
    if (netpayOrderId) {
      query = `
        {
          transaction(orderId: "${escapeGraphQLString(netpayOrderId)}") {
            transaction_id
            order_id
            transaction_token_id
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
    } else {
      query = `
        {
          allTransactions(transactionTokenId: "${escapeGraphQLString(transactionTokenId)}") {
            transaction_id
            order_id
            transaction_token_id
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
    }

    // 5. Ejecutar petición a Sandbox Reports
    const netpayResponse = await fetch(
      "https://gateway.netpay-api.com/reports-sandbox/v1/graphql",
      {
        method: "POST",
        headers: {
          "X-Netpay-Apikey": privateKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query }),
      }
    );

    const responseText = await netpayResponse.text();
    let netpayData = null;

    try {
      netpayData = responseText ? JSON.parse(responseText) : null;
    } catch {
      netpayData = { rawResponse: responseText };
    }

    // 6. Validar respuesta HTTP
    if (!netpayResponse.ok) {
      console.error(
        "Error HTTP consultando transacción en NetPay:",
        netpayResponse.status,
        netpayData
      );

      return res.status(502).json({
        ok: false,
        error: "netpay_transaction_query_failed",
        message: "NetPay rechazó la consulta de la transacción.",
        netpayStatus: netpayResponse.status,
        netpayResponse: netpayData,
      });
    }

    // 7. Validar errores sintácticos o de schema devueltos por GraphQL
    if (Array.isArray(netpayData?.errors) && netpayData.errors.length > 0) {
      console.error("GraphQL devolvió errores:", netpayData.errors);

      return res.status(502).json({
        ok: false,
        error: "netpay_graphql_error",
        message: "NetPay devolvió errores en la consulta GraphQL.",
        errors: netpayData.errors,
      });
    }

    // 8. Normalizar registros devueltos (sea singular o plural)
    let transactions = [];
    if (netpayData?.data?.transaction) {
      transactions = Array.isArray(netpayData.data.transaction)
        ? netpayData.data.transaction
        : [netpayData.data.transaction];
    } else if (netpayData?.data?.allTransactions) {
      transactions = Array.isArray(netpayData.data.allTransactions)
        ? netpayData.data.allTransactions
        : [netpayData.data.allTransactions];
    }

    // Filtrar null o undefined si el servicio devuelve un array con elementos vacíos
    transactions = transactions.filter(Boolean);

    if (!transactions.length) {
      return res.status(404).json({
        ok: true,
        found: false,
        message: "NetPay respondió 200 pero no encontró la transacción con el identificador provisto.",
        identifiersChecked: {
          netpayOrderId: netpayOrderId || null,
          transactionTokenId: transactionTokenId || null,
        },
      });
    }

    const txn = transactions[0];

    // 9. Comprobaciones de seguridad independientes
    const validationCheck = {
      orderNumberMatches: txn.merchant_ref_code === expectedOrderNumber,
      amountMatches: Number(txn.auth_amount) === Number(expectedAmount.toFixed(2)),
      currencyMatches: txn.currency === "MXN",
      isApproved:
        txn.status === "DONE" ||
        txn.status === "APPROVED" ||
        txn.response_code === "00",
    };

    // Modo diagnóstico: retorna el estado de la verificación sin alterar la orden todavía
    return res.status(200).json({
      ok: true,
      found: true,
      mode: "diagnostic",
      validationCheck,
      firestore: {
        orderId: firestoreOrderId,
        orderNumber: expectedOrderNumber,
        expectedAmount: Number(expectedAmount.toFixed(2)),
      },
      netpayTransaction: txn,
    });
  } catch (error) {
    console.error("Error en verify-payment:", error);

    return res.status(500).json({
      ok: false,
      error: "internal_server_error",
      message: error?.message || "Ocurrió un error verificando el pago.",
    });
  }
}