import admin from "firebase-admin";
import fs from "fs";
import xlsx from "xlsx";

if (!admin.apps.length) {
  // Manejo flexible: lee desde variables de entorno o archivo serviceAccountKey
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } else {
    const serviceAccount = JSON.parse(
      fs.readFileSync(new URL("../serviceAccountKey.json", import.meta.url))
    );
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
}

const db = admin.firestore();
const COLLECTION_NAME = "deliveryCoverage";
const EXCEL_FILE = "Cobertura SAD pagina web.xlsx";

function normalizeBranch(name = "") {
  const clean = String(name || "").trim().toLowerCase();
  if (clean.includes("tonala")) return { name: "Tonalá", key: "tonala" };
  if (clean.includes("minerva")) return { name: "Minerva", key: "minerva" };
  if (clean.includes("circunva")) return { name: "Circunvalación", key: "circunvalacion" };
  if (clean.includes("obsidiana")) return { name: "Obsidiana", key: "obsidiana" };
  if (clean.includes("tlaquepaque")) return { name: "Tlaquepaque", key: "tlaquepaque" };
  if (clean.includes("zapopan")) return { name: "Zapopan", key: "zapopan" };
  if (clean.includes("rio nilo")) return { name: "Río Nilo", key: "rio-nilo" };
  if (clean.includes("salto")) return { name: "El Salto", key: "el-salto" };
  if (clean.includes("bosco")) return { name: "San Juan Bosco", key: "san-juan-bosco" };
  if (clean.includes("country")) return { name: "Country", key: "country" };
  if (clean.includes("revolucion")) return { name: "Revolución", key: "revolucion" };
  return { name: String(name || "").replace(/^Tienda\s+/i, "").trim(), key: clean.replace(/\s+/g, "-") };
}

async function cleanBadDocs() {
  console.log("🧹 Eliminando registros erróneos creados anteriormente...");
  const snapshot = await db.collection(COLLECTION_NAME).get();
  let batch = db.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    // Detecta documentos erróneos como "00001", "# DE COLONIAS", etc.
    if (doc.id.startsWith("000") || doc.id.includes("#") || isNaN(Number(doc.id))) {
      batch.delete(doc.ref);
      count++;
      if (count % 400 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
  }
  if (count % 400 !== 0) {
    await batch.commit();
  }
  console.log(`🗑️ Se eliminaron ${count} documentos erróneos.`);
}

async function run() {
  await cleanBadDocs();

  console.log(`\n📖 Leyendo '${EXCEL_FILE}' con encabezados mapeados...`);
  const workbook = xlsx.readFile(EXCEL_FILE);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // Lee el archivo como objetos JSON tomando la fila 2 (índice 1) como nombres de columna
  const records = xlsx.utils.sheet_to_json(sheet, { range: 1 });
  console.log(`🔍 Total de filas válidas en Excel: ${records.length}`);

  let batch = db.batch();
  let count = 0;
  let batchCount = 0;

  for (const row of records) {
    const rawCp = row["CP"];
    if (!rawCp || String(rawCp).trim().toUpperCase() === "CP") continue;

    const postalCode = String(rawCp).trim().padStart(5, "0");
    const municipality = String(row["MUNICIPIO"] || "").trim();
    const coloniesCount = Number(row["# DE COLONIAS"]) || 0;
    const distanceKm = Number(row["KM DISTANCIA"]) || 0;
    const branchRaw = String(row["SUCURSAL MAS CERCANA"] || "").trim();
    const costRaw = String(row["COSTO DE ENVIO"] || "").trim();

    const isNoCoverage = costRaw.toUpperCase().includes("SIN COBERTURA");
    const amount = isNoCoverage ? 0 : Number(costRaw) || 0;
    const branchInfo = normalizeBranch(branchRaw);

    const docRef = db.collection(COLLECTION_NAME).doc(postalCode);

    const payload = {
      postalCode,
      municipality,
      coloniesCount,
      distanceKm,
      branchName: branchInfo.name,
      branchKey: branchInfo.key,
      amount,
      covered: !isNoCoverage,
      source: EXCEL_FILE,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    batch.set(docRef, payload, { merge: true });
    count++;
    batchCount++;

    if (batchCount === 400) {
      console.log(`💾 Guardando lote de ${batchCount} registros en '${COLLECTION_NAME}'...`);
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    console.log(`💾 Guardando lote final de ${batchCount} registros...`);
    await batch.commit();
  }

  console.log(`\n🎉 Sincronización exitosa: ${count} códigos postales reales guardados en '${COLLECTION_NAME}'.`);
}

run().catch(console.error);