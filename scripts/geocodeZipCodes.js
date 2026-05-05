import admin from "firebase-admin";
import fetch from "node-fetch";
import fs from "fs";

// 🔐 Cargar credenciales Firebase
const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("../serviceAccountKey.json", import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ⏳ Delay para evitar bloqueos
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// 📦 Cache local
let cache = {};
if (fs.existsSync("cache.json")) {
  cache = JSON.parse(fs.readFileSync("cache.json"));
}

// 🧠 Evitar procesar ZIPs repetidos
const processedZips = new Set();

// 🌍 Obtener coordenadas
async function getLatLng(zip, city, state) {
  const key = `${zip}-${city}-${state}`;

  if (cache[key]) {
    console.log(`⚡ Cache usado: ${zip}`);
    return cache[key];
  }

  try {
    const query = `${zip}, ${city}, ${state}, Mexico`;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "pasteleria-app",
        },
      }
    );

    const data = await res.json();

    if (data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };

      cache[key] = coords;

      // 💾 Guardar cache
      fs.writeFileSync("cache.json", JSON.stringify(cache, null, 2));

      return coords;
    } else {
      console.log(`❌ No se encontró: ${zip}`);
    }
  } catch (err) {
    console.error(`⚠️ Error en geocoding ${zip}:`, err.message);
  }

  return null;
}

// 🚀 MAIN
async function main() {
  console.log("🚀 Iniciando geocodificación...\n");

  let totalDocs = 0;
  let totalProcesados = 0;

  try {
    const stream = db.collection("zipCodes").stream();

    for await (const doc of stream) {
      totalDocs++;

      const data = doc.data();

      if (!data.zip) {
        console.log("⚠️ Documento sin ZIP, saltando...");
        continue;
      }

      // 👉 Si ya tiene coords → saltar
      if (data.lat && data.lng) {
        continue;
      }

      // 👉 Evitar duplicados
      if (processedZips.has(data.zip)) {
        continue;
      }

      processedZips.add(data.zip);

      console.log(`📍 Procesando ZIP: ${data.zip}`);

      const coords = await getLatLng(data.zip, data.city, data.state);

      if (coords) {
        try {
          await doc.ref.update(coords);
          console.log(`✅ Guardado: ${data.zip}`);
        } catch (err) {
          console.error(`❌ Error guardando ${data.zip}:`, err.message);
        }
      }

      totalProcesados++;

      console.log(`📊 Progreso: ${totalProcesados} ZIPs únicos\n`);

      // ⏳ MUY IMPORTANTE
      await delay(1200);
    }

    console.log("\n🎉 FINALIZADO");
    console.log(`📄 Documentos leídos: ${totalDocs}`);
    console.log(`📍 ZIPs procesados: ${totalProcesados}`);
  } catch (err) {
    console.error("💥 Error general:", err);
  }
}

main();