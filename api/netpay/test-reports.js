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
    // 1. SECRET KEY
    // =====================================================

    const privateKey =
      process.env.NETPAY_PRIVATE_KEY;

    if (!privateKey) {
      return res.status(500).json({
        ok: false,
        error: "missing_netpay_private_key",
      });
    }

    // =====================================================
    // 2. NETPAY ORDER ID
    // IMPORTANTE: mantenerlo como STRING
    // =====================================================

    const netpayOrderId =
      String(
        req.body?.netpayOrderId || ""
      ).trim();

    if (!netpayOrderId) {
      return res.status(400).json({
        ok: false,
        error: "missing_netpay_order_id",
      });
    }

    // Evitamos insertar caracteres inesperados en GraphQL.
    if (!/^\d+$/.test(netpayOrderId)) {
      return res.status(400).json({
        ok: false,
        error: "invalid_netpay_order_id",
      });
    }

    // =====================================================
    // 3. CONSULTA PUNTUAL
    // =====================================================

    const query = `
      {
        transaction(
          orderId: "${netpayOrderId}"
        ) {
          transaction_id
          order_id
          transaction_date
          status
          auth_amount
          capt_amount
          auth_code
          response_msg
        }
      }
    `;

    console.log(
      "Consultando transacción NetPay por orderId:",
      netpayOrderId
    );

    // =====================================================
    // 4. NETPAY REPORTS SANDBOX
    // =====================================================

    const response = await fetch(
      "https://gateway.netpay-api.com/reports/v1/graphql",
      {
        method: "POST",

        headers: {
          "X-Netpay-Apikey": privateKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify({
          query,
        }),
      }
    );

    // =====================================================
    // 5. LEER RESPUESTA
    // =====================================================

    const text =
      await response.text();

    let data;

    try {
      data = text
        ? JSON.parse(text)
        : null;
    } catch {
      data = {
        rawResponse: text,
      };
    }

    // =====================================================
    // 6. DEVOLVER RESULTADO DE DIAGNÓSTICO
    // =====================================================

    return res.status(200).json({
      ok: response.ok,

      httpStatus:
        response.status,

      httpStatusText:
        response.statusText,

      netpayOrderId,

      netpayResponse:
        data,
    });
  } catch (error) {
    console.error(
      "Error test-reports:",
      error
    );

    return res.status(500).json({
      ok: false,
      error: "internal_server_error",

      message:
        error?.message ||
        "Error consultando NetPay.",
    });
  }
}