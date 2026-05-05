import { useState } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { doc, getDoc, setDoc } from "firebase/firestore";

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

    const city = data.places[0]["place name"];
    const state = data.places[0]["state"];

    // 2. Guardar visita (igual que ahora)
    await addDoc(collection(db, "zipCodes"), {
      zip: zip.toString(),
      city,
      state,
      createdAt: serverTimestamp()
    });

    
    const geoRef = doc(db, "zipGeo", zip);
    const geoSnap = await getDoc(geoRef);

    if (!geoSnap.exists()) {
      
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${zip},${city},${state},Mexico`,
        {
          headers: {
            "User-Agent": "pasteleria-app"
          }
        }
      );

      const geoData = await geoRes.json();

      if (geoData.length > 0) {
        const lat = parseFloat(geoData[0].lat);
        const lng = parseFloat(geoData[0].lon);

        // 5. Guardar en zipGeo (una sola vez en la vida)
        await setDoc(geoRef, {
          zip: zip.toString(),
          city,
          state,
          lat,
          lng,
          createdAt: serverTimestamp()
        });

        console.log(" ZIP geocodificado:", zip);
      } else {
        console.warn(" No se pudo geocodificar:", zip);
      }
    }

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
            disabled={zip.length !== 5 }
            className="w-full py-2 rounded text-white transition bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Continuar
          </button>
        </form>
      </div>
    </div>
  );
}