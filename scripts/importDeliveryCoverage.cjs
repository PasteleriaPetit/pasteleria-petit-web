const fs = require("fs");
const path = require("path");

const ENV_PATH = path.join(__dirname, "..", ".env.local");

console.log("🔍 Buscando variables en:");
console.log(ENV_PATH);

if (!fs.existsSync(ENV_PATH)) {
  throw new Error(`No se encontró .env.local en: ${ENV_PATH}`);
}

require("dotenv").config({
  path: ENV_PATH,
});

const admin = require("firebase-admin");

console.log("Variables Firebase detectadas:");
console.log({
  projectId: process.env.FIREBASE_PROJECT_ID
    ? "✅ encontrada"
    : "❌ no encontrada",

  clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    ? "✅ encontrada"
    : "❌ no encontrada",

  privateKey: process.env.FIREBASE_PRIVATE_KEY
    ? "✅ encontrada"
    : "❌ no encontrada",
});

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} = process.env;

if (!FIREBASE_PROJECT_ID) {
  throw new Error("Falta FIREBASE_PROJECT_ID en .env.local");
}

if (!FIREBASE_CLIENT_EMAIL) {
  throw new Error("Falta FIREBASE_CLIENT_EMAIL en .env.local");
}

if (!FIREBASE_PRIVATE_KEY) {
  throw new Error("Falta FIREBASE_PRIVATE_KEY en .env.local");
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: FIREBASE_PROJECT_ID.trim(),
    clientEmail: FIREBASE_CLIENT_EMAIL.trim(),
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const db = admin.firestore();

// ==============================
// LEER ARCHIVO JSON
// ==============================

const DATA_PATH = path.join(
  __dirname,
  "..",
  "deliveryCoverage.json"
);

if (!fs.existsSync(DATA_PATH)) {
  throw new Error(
    `No se encontró deliveryCoverage.json en:\n${DATA_PATH}`
  );
}

const rawCoverage = fs.readFileSync(DATA_PATH, "utf8");

if (!rawCoverage.trim()) {
  throw new Error("deliveryCoverage.json está vacío");
}

let coverage;

try {
  coverage = JSON.parse(rawCoverage);
} catch (error) {
  throw new Error(
    `deliveryCoverage.json contiene JSON inválido: ${error.message}`
  );
}

if (!Array.isArray(coverage)) {
  throw new Error(
    "deliveryCoverage.json debe contener un arreglo de registros"
  );
}

// ==============================
// IMPORTAR A FIRESTORE
// ==============================

async function importCoverage() {
  console.log("");
  console.log("🚚 IMPORTACIÓN DE COBERTURA");
  console.log("============================");
  console.log(`📦 Registros encontrados: ${coverage.length}`);
  console.log(`🔥 Proyecto Firebase: ${FIREBASE_PROJECT_ID}`);
  console.log("");

  const BATCH_SIZE = 400;

  let imported = 0;

  for (let i = 0; i < coverage.length; i += BATCH_SIZE) {
    const chunk = coverage.slice(i, i + BATCH_SIZE);

    const batch = db.batch();

    for (const item of chunk) {
      const postalCode = String(item.postalCode || "").trim();

      if (!postalCode) {
        console.warn("⚠️ Registro sin código postal, omitido:", item);
        continue;
      }

      const ref = db
        .collection("deliveryCoverage")
        .doc(postalCode);

      batch.set(
        ref,
        {
          ...item,

          postalCode,

          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        },
        {
          merge: true,
        }
      );
    }

    await batch.commit();

    imported += chunk.length;

    console.log(
      `✅ ${Math.min(imported, coverage.length)}/${coverage.length} registros procesados`
    );
  }

  console.log("");
  console.log("🎉 Importación terminada");
  console.log(`📁 Colección: deliveryCoverage`);
  console.log(`📄 Registros procesados: ${coverage.length}`);
  console.log("");

  process.exit(0);
}

importCoverage().catch((error) => {
  console.error("");
  console.error("❌ ERROR DURANTE LA IMPORTACIÓN");
  console.error(error);
  console.error("");

  process.exit(1);
});