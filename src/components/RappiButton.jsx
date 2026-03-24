import React from "react";
import rappi from "../assets/rappi-button.webp";
export default function RappiButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Pedir por Rappi"
      title="Pedir por Rappi"
      className="
        fixed bottom-6 right-24 z-50
        h-14 w-14 rounded-full
        bg-[#F44611]  
        border border-gray-200
        shadow-lg
        flex items-center justify-center
        transition
        hover:scale-105
        active:scale-95
        focus:outline-none
        focus:ring-2 focus:ring-[#F44611]
      "
    >
      <img
        src={rappi}
        alt="Rappi"
        className="h-8 w-8 object-contain"
        draggable="false"
        loading="lazy"
      />
    </button>
  );
}
