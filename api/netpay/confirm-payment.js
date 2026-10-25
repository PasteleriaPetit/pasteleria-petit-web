import admin from "firebase-admin";
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
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
    });
  }

  try {
    const firebaseAdmin = getFirebaseAdmin();
    const db = firebaseAdmin.firestore();

    // 1. Validar autenticación de Firebase
    const authHeader = req.headers.authorization || "";
    let callerUid = null;

    if (authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1];
      try {
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
        callerUid = decodedToken.uid;
      } catch (authErr) {
        return res.status(401).json({
          ok: false,
          error: "unauthorized",
          message: "Token de usuario inválido o expirado.",
        });
      }
    }

    // 2. Extraer identificadores del cuerpo
    const orderId = String(req.body?.orderId || "").trim();
    const netpayOrderId = String(req.body?.netpayOrderId || "").trim();
    const transactionTokenId = String(req.body?.transactionTokenId || "").trim();
    const responseCode = String(req.body?.responseCode || "").trim();
    const authCode = String(req.body?.authCode || "").trim();
    const rawStatus = String(req.body?.rawStatus || "").trim();
    // Extraer datos bancarios adicionales de NetPay
    const cardLast4 = String(req.body?.cardLast4 || "").trim();
    const cardBrand = String(req.body?.cardBrand || "").trim();
    const cardType = String(req.body?.cardType || "").trim();
    const bank = String(req.body?.bank || "").trim();
    const eci = String(req.body?.eci || "").trim();
    const paymentDate = String(req.body?.paymentDate || "").trim();

    if (!orderId) {
      return res.status(400).json({
        ok: false,
        error: "missing_order_id",
      });
    }

    if (!transactionTokenId && !netpayOrderId) {
      return res.status(400).json({
        ok: false,
        error: "missing_netpay_identifiers",
      });
    }

    // 3. Validar código de respuesta de NetPay
    if (responseCode !== "00" && responseCode !== "0") {
      return res.status(400).json({
        ok: false,
        error: "transaction_not_approved",
        message: `El código de respuesta (${responseCode}) no es aprobatorio.`,
      });
    }

    // 4. Leer orden de Firestore
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({
        ok: false,
        error: "order_not_found",
      });
    }

    const order = orderSnap.data();

    // 5. Validar que pertenezca al usuario si viene autenticado
    if (callerUid && order.customer?.uid && order.customer.uid !== callerUid) {
      return res.status(403).json({
        ok: false,
        error: "forbidden",
        message: "No tienes permiso para confirmar este pedido.",
      });
    }

    // 6. Idempotencia: si ya está pagado y ya tiene Shipday, responder OK sin duplicar
    if (order.status === "paid" && order.shipday?.status === "created") {
      return res.status(200).json({
        ok: true,
        message: "La orden ya se encuentra pagada y registrada en Shipday.",
        orderId,
        shipdayOrderId: order.shipday.orderId,
      });
    }

    // 7. Crear el pedido en Shipday
    let shipdayResult = null;
    let shipdayError = null;

    try {
      shipdayResult = await createShipdayOrderCore(order, orderId, db);
    } catch (shipErr) {
      console.error("Error al procesar Shipday en confirm-payment:", shipErr);
      shipdayError = shipErr.message || "Error al conectar con Shipday.";
    }

    

    // Actualizar Firestore de forma atómica con la ficha bancaria
    const updateData = {
      status: "paid",
      "payment.status": "paid",
      "payment.provider": "netpay",
      "payment.transactionId": netpayOrderId || transactionTokenId,
      "payment.netpayOrderId": netpayOrderId,
      "payment.transactionTokenId": transactionTokenId,
      "payment.authCode": authCode,
      "payment.responseCode": responseCode,
      "payment.rawStatus": rawStatus,
      "payment.cardLast4": cardLast4,
      "payment.cardBrand": cardBrand,
      "payment.cardType": cardType,
      "payment.bank": bank,
      "payment.eci": eci,
      "payment.paymentDate": paymentDate,
      "payment.paidAt": admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (shipdayResult?.shipdayOrderId) {
      updateData["shipday.status"] = "created";
      updateData["shipday.orderId"] = String(shipdayResult.shipdayOrderId);
      updateData["shipday.createdAt"] = admin.firestore.FieldValue.serverTimestamp();
      updateData["shipday.lastAttemptAt"] = admin.firestore.FieldValue.serverTimestamp();
    } else {
      updateData["shipday.status"] = "create_failed";
      updateData["shipday.error"] = shipdayError;
      updateData["shipday.lastAttemptAt"] = admin.firestore.FieldValue.serverTimestamp();
    }

    await orderRef.update(updateData);

    return res.status(200).json({
      ok: true,
      message: shipdayResult
        ? "Pago confirmado y orden creada en Shipday exitosamente."
        : "Pago confirmado, pero hubo un problema al generar la orden en Shipday.",
      orderId,
      status: "paid",
      shipday: {
        status: shipdayResult ? "created" : "create_failed",
        orderId: shipdayResult?.shipdayOrderId || null,
        error: shipdayError,
      },
    });
  } catch (error) {
    console.error("Error en confirm-payment:", error);
    return res.status(500).json({
      ok: false,
      error: "internal_server_error",
      message: error?.message || "Ocurrió un error al procesar la confirmación.",
    });
  }
}