import { useState } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function ZipCodeModal({ onClose }) {
  const [zip, setZip] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!/^\d{5}$/.test(zip)) {
      alert("El código postal debe tener exactamente 5 números.");
      return;
    }

    try {
      const res = await fetch(`https://api.zippopotam.us/mx/${zip}`);

      if (!res.ok) {
        alert("Código postal no válido.");
        return;
      }

      const data = await res.json();

      await addDoc(collection(db, "zipCodes"), {
        zip: zip.toString(),
        city: data.places[0]["place name"],
        state: data.places[0]["state"],
        createdAt: serverTimestamp()
      });

      localStorage.setItem("userZip", zip);
      onClose();

    } catch (error) {
      console.error("Error guardando código postal:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-80">
        <h2 className="text-xl font-bold mb-4">
          ¿Desde qué zona nos visitas?
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={5}
            placeholder="Código Postal"
            value={zip}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              setZip(value);
            }}
            className="w-full border p-2 rounded mb-4"
          />

          <button
            type="submit"
            disabled={zip.length !== 5}
            className="bg-pink-600 text-white w-full py-2 rounded"
          >
            Continuar
          </button>
        </form>
      </div>
    </div>
  );
}