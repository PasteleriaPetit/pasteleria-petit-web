export default async function handler(req, res) {
  // ============================================
  // SOLO GET
  // ============================================

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
    });
  }

  // ============================================
  // VARIABLE PRIVADA
  // ============================================

  const apiKey = process.env.SHIPDAY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: "missing_shipday_api_key",
    });
  }

  try {
    // ============================================
    // PRUEBA DE COMUNICACIÓN CON SHIPDAY
    //
    // GET /orders NO crea ningún pedido.
    // ============================================

    const response = await fetch(
      "https://api.shipday.com/orders",
      {
        method: "GET",

        headers: {
          Accept: "application/json",

          Authorization: `Basic ${apiKey}`,
        },
      }
    );

    // Shipday puede devolver JSON,
    // pero manejamos también una respuesta de texto.
    const rawResponse = await response.text();

    let data = null;

    try {
      data = rawResponse
        ? JSON.parse(rawResponse)
        : null;
    } catch {
      data = rawResponse;
    }

    // ============================================
    // RESPUESTA NO EXITOSA
    // ============================================

    if (!response.ok) {
      console.error(
        "Shipday respondió con error:",
        response.status,
        data
      );

      return res.status(response.status).json({
        ok: false,

        shipdayStatus: response.status,

        error: "shipday_request_failed",

        details: data,
      });
    }

    // ============================================
    // CONEXIÓN CORRECTA
    //
    // NO regresamos la API key.
    // ============================================

    return res.status(200).json({
      ok: true,

      message:
        "Conexión con Shipday realizada correctamente.",

      shipdayStatus: response.status,

      /*
       * Solo para esta prueba mostramos
       * la respuesta recibida.
       *
       * Después eliminaremos este endpoint.
       */
      data,
    });
  } catch (error) {
    console.error(
      "Error conectando con Shipday:",
      error
    );

    return res.status(500).json({
      ok: false,

      error: "shipday_connection_error",

      message:
        error?.message ||
        "No fue posible conectar con Shipday.",
    });
  }
}