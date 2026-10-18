import admin from "firebase-admin";

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

function escapeGraphQLString(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
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

    if (!privateKey) {
      return res.status(500).json({
        ok: false,
        error: "missing_netpay_private_key",
        message: "NETPAY_PRIVATE_KEY no está configurada.",
      });
    }

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

    // 1. Obtener la orden de Firestore
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

    // 2. Construir la consulta GraphQL según los identificadores provistos
    let queryFilter = "";
    if (netpayOrderId) {
      queryFilter = `orderId: "${escapeGraphQLString(netpayOrderId)}"`;
    } else {
      queryFilter = `transactionTokenId: "${escapeGraphQLString(transactionTokenId)}"`;
    }

    const query = `
      {
        allTransactions(${queryFilter}) {
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

    // 3. Consultar Sandbox Reports
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

    if (!netpayResponse.ok) {
      return res.status(502).json({
        ok: false,
        error: "netpay_transaction_query_failed",
        netpayStatus: netpayResponse.status,
        netpayResponse: netpayData,
      });
    }

    if (Array.isArray(netpayData?.errors) && netpayData.errors.length > 0) {
      return res.status(502).json({
        ok: false,
        error: "netpay_graphql_error",
        errors: netpayData.errors,
      });
    }

    const transactions = Array.isArray(netpayData?.data?.allTransactions)
      ? netpayData.data.allTransactions
      : [];

    if (!transactions.length) {
      return res.status(404).json({
        ok: true,
        found: false,
        message: "NetPay respondió 200 pero no hay registros con ese identificador.",
        queryFilter,
      });
    }

    const txn = transactions[0];

    // 4. Comparación diagnóstica de seguridad
    const validationCheck = {
      orderNumberMatches: txn.merchant_ref_code === expectedOrderNumber,
      amountMatches: Number(txn.auth_amount) === Number(expectedAmount.toFixed(2)),
      currencyMatches: txn.currency === "MXN",
      isApproved: txn.status === "DONE" || txn.status === "APPROVED" || txn.response_code === "00",
    };

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
      message: error?.message || "Error al verificar el pago.",
    });
  }
}