import { useState } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function ZipCodeModal({ onClose }) {
  const [zip, setZip] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!zip) return;

    try {
      await addDoc(collection(db, "zipCodes"), {
        zip,
        createdAt: serverTimestamp()
      });

      localStorage.setItem("userZip", zip);
      onClose();

    } catch (error) {
      console.error(error);
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
            placeholder="Código Postal"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            className="w-full border p-2 rounded mb-4"
          />

          <button
            type="submit"
            className="bg-pink-600 text-white w-full py-2 rounded"
          >
            Continuar
          </button>
        </form>
      </div>
    </div>
  );
}