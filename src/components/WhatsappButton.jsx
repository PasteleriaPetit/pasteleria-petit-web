import React from "react";
import { FaWhatsapp } from "react-icons/fa";

export default function WhatsAppButton({ visible = true }) {
  const phoneNumber = "523334416133";

  const message = encodeURIComponent(
    "Hola, quisiera información sobre el servicio a domicilio y cobertura de entrega de Petit Repostería con Alma."
  );

  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/${phoneNumber}?text=${message}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // Si no debe mostrarse, no lo renderizamos
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={handleWhatsApp}
      aria-label="Contactar por WhatsApp"
      title="Servicio a domicilio por WhatsApp"
      className="
        fixed
        bottom-6
        right-[168px]
        z-[60]

        h-14
        w-14
        rounded-full

        bg-[#25D366]
        text-white

        shadow-lg
        border border-white/40

        flex
        items-center
        justify-center

        transition-all
        duration-200

        hover:scale-105
        hover:shadow-xl

        active:scale-95

        focus:outline-none
        focus:ring-2
        focus:ring-[#25D366]
        focus:ring-offset-2
      "
    >
      <FaWhatsapp
        className="text-[32px]"
        aria-hidden="true"
      />
    </button>
  );
}