export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);

    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
    });
  }

  try {
    const privateKey =
      process.env.NETPAY_PRIVATE_KEY;

    if (!privateKey) {
      return res.status(500).json({
        ok: false,
        error: "missing_netpay_private_key",
      });
    }

    const merchantRefCode =
      String(
        req.body?.merchantRefCode || ""
      ).trim();

    if (!merchantRefCode) {
      return res.status(400).json({
        ok: false,
        error: "missing_merchant_ref_code",
      });
    }

    // Consulta mínima documentada por NetPay.
    const query = `
      {
        allTransactions(
          merchantRefCode: "${merchantRefCode}"
        ) {
          transaction_id
          order_id
          transaction_token_id
          merchant_ref_code
          status
          auth_amount
        }
      }
    `;

    console.log(
      "Consultando NetPay por merchantRefCode:",
      merchantRefCode
    );

    const response = await fetch(
      "https://gateway.netpay-api.com/reports-sandbox/v1/graphql",
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

    return res.status(200).json({
      ok: response.ok,

      httpStatus:
        response.status,

      httpStatusText:
        response.statusText,

      merchantRefCode,

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
      error:
        "internal_server_error",

      message:
        error?.message ||
        "Error consultando NetPay.",
    });
  }
}