const NETPAY_SCRIPT_ID = "netpay-checkout-plus-sdk";

const NETPAY_SCRIPT_URL =
  "https://docs.netpay.mx/cdn/js/latest/checkout.plus.js";

let netpayInitialized = false;

export function loadNetPayCheckout() {
  return new Promise((resolve, reject) => {
    // Si ya está cargado
    if (window.NetPay) {
      resolve(window.NetPay);
      return;
    }

    // Si el script ya fue agregado pero todavía carga
    const existingScript =
      document.getElementById(NETPAY_SCRIPT_ID);

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.NetPay) {
          resolve(window.NetPay);
        } else {
          reject(
            new Error(
              "El SDK de NetPay cargó, pero window.NetPay no está disponible."
            )
          );
        }
      });

      existingScript.addEventListener("error", () => {
        reject(
          new Error(
            "No se pudo cargar el SDK de NetPay."
          )
        );
      });

      return;
    }

    // Cargar SDK
    const script = document.createElement("script");

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

export async function initializeNetPay() {
  const publicKey =
    import.meta.env.VITE_NETPAY_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error(
      "VITE_NETPAY_PUBLIC_KEY no está configurada."
    );
  }

  const NetPay = await loadNetPayCheckout();

  if (!netpayInitialized) {
    NetPay.init(publicKey);

    // IMPORTANTE:
    // Estamos trabajando en Sandbox.
    NetPay.setSandboxMode(true);

    netpayInitialized = true;
  }

  return NetPay;
}