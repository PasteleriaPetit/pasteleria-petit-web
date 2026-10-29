import React from "react";
import { QRCodeSVG } from "qrcode.react";

export default function MenuQR({
  url = "https://res.cloudinary.com/drdabinip/image/upload/v1793219396/jrey7w2fjozx4ioufpb4.pdf",
  logoSrc = "/logo.png",
  size = 140,
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Haz clic o escanea para abrir el menú"
      className="group flex flex-col items-center p-3 bg-white rounded-2xl shadow-sm hover:shadow-md border border-stone-200/80 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="p-1">
        <QRCodeSVG
          value={url}
          size={size}
          level="H" // Corrección de error del 30% para que el logo no afecte la lectura
          bgColor="#FFFFFF"
          fgColor="#4A1E2D" // Tono vino característico de Petit
          imageSettings={{
            src: logoSrc,
            height: Math.floor(size * 0.22),
            width: Math.floor(size * 0.22),
            excavate: true, // Crea automáticamente el fondo blanco detrás del logo
          }}
        />
      </div>
      <span className="text-[11px] font-semibold text-stone-500 group-hover:text-wine transition-colors mt-2 text-center select-none">
        Escanea o da clic para ver el menú
      </span>
    </a>
  );
}