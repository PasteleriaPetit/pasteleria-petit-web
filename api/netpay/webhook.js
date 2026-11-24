/* import admin from "firebase-admin";
import { createShipdayOrderCore } from "../shipday/create-order-core.js";

function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const {
      FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY,
    } = process.env;

    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      throw new Error("Faltan variables de entorno de Firebase Admin.");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID.trim(),
        clientEmail: FIREBASE_CLIENT_EMAIL.trim(),
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }
  return admin;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const firebaseAdmin = getFirebaseAdmin();
    const db = firebaseAdmin.firestore();
    const body = req.body || {};

    console.log("📩 Webhook NetPay recibido:", JSON.stringify(body));

    // Extraer datos desde las posibles estructuras que envía NetPay
    const tx = body.transactionDto || body.data || body;
    const responseCode = String(tx.responseCode ?? body.responseCode ?? "").trim();
    const status = String(tx.status ?? body.status ?? "").toUpperCase();
    const merchantRef = String(
      tx.merchantReferenceCode ||
      body.merchantReferenceCode ||
      tx.orderNumber ||
      ""
    ).trim();

    const netpayOrderId = String(tx.orderId || body.orderId || tx.transactionId || "").trim();
    const transactionTokenId = String(tx.transactionTokenId || body.transactionTokenId || "").trim();

    // Validar que sea una notificación de pago aprobado
    const isApproved =
      responseCode === "00" ||
      responseCode === "0" ||
      status === "CHARGEABLE" ||
      status === "APPROVED" ||
      status === "PAID" ||
      status === "SUCCEEDED";

    if (!isApproved) {
      return res.status(200).json({ ok: true, ignored: true, reason: "not_approved_status" });
    }

    if (!merchantRef) {
      return res.status(400).json({ ok: false, error: "missing_merchant_reference_code" });
    }

    // Buscar el pedido en Firestore usando el orderNumber (PET-YYYYMMDD-XXXXXX)
    const snap = await db
      .collection("orders")
      .where("orderNumber", "==", merchantRef)
      .limit(1)
      .get();

    if (snap.empty) {
      console.warn(`⚠️ Webhook NetPay: No se encontró orden con orderNumber=${merchantRef}`);
      return res.status(404).json({ ok: false, error: "order_not_found" });
    }

    const orderDoc = snap.docs[0];
    const orderId = orderDoc.id;
    const orderRef = orderDoc.ref;

    // Bloqueo atómico (Transacción) para evitar duplicar Shipday si el frontend llegó al mismo tiempo
    let shouldProcessShipday = false;
    let currentOrderData = null;

    await db.runTransaction(async (t) => {
      const freshSnap = await t.get(orderRef);
      const data = freshSnap.data();
      currentOrderData = data;

      if (data.status === "paid" && data.shipday?.status === "created") {
        shouldProcessShipday = false;
        return;
      }

      if (data.shipday?.status === "processing") {
        shouldProcessShipday = false;
        return;
      }

      shouldProcessShipday = true;
      t.update(orderRef, {
        status: "paid",
        "payment.status": "paid",
        "payment.provider": "netpay",
        "payment.confirmedBy": "webhook",
        "payment.transactionId": netpayOrderId || transactionTokenId || merchantRef,
        "payment.netpayOrderId": netpayOrderId,
        "payment.transactionTokenId": transactionTokenId,
        "payment.authCode": String(tx.authCode || ""),
        "payment.responseCode": responseCode || "00",
        "payment.cardLast4": String(tx.last4 || tx.card?.last4 || ""),
        "payment.cardBrand": String(tx.brand || tx.card?.brand || ""),
        "payment.paidAt": admin.firestore.FieldValue.serverTimestamp(),
        "shipday.status": "processing",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    if (!shouldProcessShipday) {
      return res.status(200).json({ ok: true, message: "Ya procesado previamente." });
    }

    // Crear orden en Shipday
    try {
      const shipdayResult = await createShipdayOrderCore(currentOrderData, orderId, db);
      await orderRef.update({
        "shipday.status": shipdayResult?.shipdayOrderId ? "created" : "create_failed",
        "shipday.orderId": shipdayResult?.shipdayOrderId ? String(shipdayResult.shipdayOrderId) : null,
        "shipday.createdAt": admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (shipErr) {
      console.error("❌ Error creando Shipday desde Webhook:", shipErr);
      await orderRef.update({
        "shipday.status": "create_failed",
        "shipday.error": shipErr.message || "Error Shipday en webhook",
      });
    }

    return res.status(200).json({ ok: true, orderId, processedBy: "webhook" });
  } catch (error) {
    console.error("❌ Error en webhook NetPay:", error);
    return res.status(500).json({ ok: false, error: "internal_server_error" });
  }
} */