const NETPAY_SCRIPT_ID = "netpay-checkout-plus-sdk";

const NETPAY_SCRIPT_URL =
  "https://docs.netpay.mx/cdn/js/latest/checkout.plus.js";

let netpayInitialized = false;

// =========================================================
// CARGAR SDK DE NETPAY CHECKOUT PLUS
// =========================================================

export function loadNetPayCheckout() {
  return new Promise((resolve, reject) => {
    // Si NetPay ya está disponible, no cargamos
    // nuevamente el script.
    if (window.NetPay) {
      resolve(window.NetPay);
      return;
    }

    // Comprobamos si el script ya fue agregado al DOM.
    const existingScript =
      document.getElementById(NETPAY_SCRIPT_ID);

    if (existingScript) {
      const handleLoad = () => {
        if (window.NetPay) {
          resolve(window.NetPay);
        } else {
          reject(
            new Error(
              "El SDK de NetPay cargó, pero window.NetPay no está disponible."
            )
          );
        }
      };

      existingScript.addEventListener(
        "load",
        handleLoad,
        { once: true }
      );

      existingScript.addEventListener(
        "error",
        () => {
          reject(
            new Error(
              "No se pudo cargar el SDK de NetPay."
            )
          );
        },
        { once: true }
      );

      return;
    }

    // Creamos el script del SDK.
    const script =
      document.createElement("script");

    script.id = NETPAY_SCRIPT_ID;
    script.src = NETPAY_SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      if (!window.NetPay) {
        reject(
          new Error(
            "El SDK de NetPay cargó, pero window.NetPay no está disponible."
          )
        );
        return;
      }

      resolve(window.NetPay);
    };

    script.onerror = () => {
      reject(
        new Error(
          "No se pudo cargar el SDK de NetPay."
        )
      );
    };

    document.body.appendChild(script);
  });
}

// =========================================================
// INICIALIZAR CHECKOUT PLUS
// =========================================================

export async function initializeNetPay() {
  const publicKey =
    import.meta.env.VITE_NETPAY_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error(
      "VITE_NETPAY_PUBLIC_KEY no está configurada."
    );
  }

  const NetPay =
    await loadNetPayCheckout();

  // Evitamos inicializar NetPay varias veces
  // durante la misma carga de la aplicación.
  if (!netpayInitialized) {
    NetPay.init(publicKey);

    // =============================================
    // SANDBOX
    //
    // IMPORTANTE:
    // Cambiar a false únicamente cuando pasemos
    // oficialmente a producción.
    // =============================================

    NetPay.setSandboxMode(true);

    netpayInitialized = true;
  }

  return NetPay;
}