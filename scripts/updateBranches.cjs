const admin = require("firebase-admin");
const path = require("path");

// ========================================
// Cargar .env.local
// ========================================

const ENV_PATH = path.join(__dirname, "..", ".env.local");
require("dotenv").config({ path: ENV_PATH });

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} = process.env;

if (
  !FIREBASE_PROJECT_ID ||
  !FIREBASE_CLIENT_EMAIL ||
  !FIREBASE_PRIVATE_KEY
) {
  console.error(
    "❌ Faltan las credenciales de Firebase Admin en .env.local"
  );
  process.exit(1);
}

// ========================================
// Inicializar Firebase Admin
// ========================================

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID.trim(),
      clientEmail: FIREBASE_CLIENT_EMAIL.trim(),
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

// ========================================
// Datos de sucursales
// ========================================

const branches = {
  "san-juan-bosco": {
    id: "san-juan-bosco",
    active: true,

    address: {
      street: "C. Juan de Dios Robledo",
      extNumber: "403",
      neighborhood: "Las Huertas",
      postalCode: "44739",
      city: "Guadalajara",
      state: "Jalisco",
      country: "México",

      formatted:
        "C. Juan de Dios Robledo 403, Las Huertas, 44739 Guadalajara, Jal., México",
    },
  },

  "circunvalacion": {
    id: "circunvalacion",
    active: true,

    address: {
      street: "Av. Circunvalación División del Norte",
      extNumber: "67",
      neighborhood: "Independencia",
      postalCode: "44379",
      city: "Guadalajara",
      state: "Jalisco",
      country: "México",

      formatted:
        "Av. Circunvalación División del Norte 67, Independencia, 44379 Guadalajara, Jal., México",
    },
  },

  "el-salto": {
    id: "el-salto",
    active: true,

    address: {
      street: "A Juanacatlán",
      extNumber: "40C",
      neighborhood: "El Potrero",
      postalCode: "45680",
      city: "El Salto",
      state: "Jalisco",
      country: "México",

      formatted:
        "A Juanacatlán 40C, El Potrero, 45680 El Salto, Jal., México",
    },
  },

  "obsidiana": {
    id: "obsidiana",
    active: true,

    address: {
      street: "Obsidiana",
      extNumber: "3805 A",
      neighborhood: "Loma Bonita",
      postalCode: "45086",
      city: "Zapopan",
      state: "Jalisco",
      country: "México",

      formatted:
        "Obsidiana 3805 A, Esq. Av. Conchita, Loma Bonita, 45086 Zapopan, Jal., México",
    },
  },

  "minerva": {
    id: "minerva",
    active: true,

    address: {
      street: "Av. Ignacio L. Vallarta 2916",
      extNumber: "2420-B",
      neighborhood: "Vallarta Nte",
      postalCode: "44690",
      city: "Guadalajara",
      state: "Jalisco",
      country: "México",

      formatted:
        "Av. Ignacio L. Vallarta 2916, 2420-B, Vallarta Nte, 44690 Guadalajara, Jal., México",
    },
  },

  "tlaquepaque": {
    id: "tlaquepaque",
    active: true,

    address: {
      street: "C. Francisco I. Madero",
      extNumber: "163",
      neighborhood: "San Juan",
      postalCode: "45500",
      city: "Tlaquepaque",
      state: "Jalisco",
      country: "México",

      formatted:
        "C. Francisco I. Madero 163, 45500 Tlaquepaque, Jal., México",
    },
  },

  "rio-nilo": {
    id: "rio-nilo",
    active: true,

    address: {
      street: "Av. Río Nilo",
      extNumber: "2916",
      neighborhood: "Jardines de la Paz",
      postalCode: "44860",
      city: "Guadalajara",
      state: "Jalisco",
      country: "México",

      formatted:
        "Av. Río Nilo 2916, Jardines de la Paz, 44860 Guadalajara, Jal., México",
    },
  },

  "revolucion": {
    id: "revolucion",
    active: true,

    address: {
      street: "Av. Revolución",
      extNumber: "1856",
      neighborhood: "Universitaria",
      postalCode: "44840",
      city: "Guadalajara",
      state: "Jalisco",
      country: "México",

      formatted:
        "Av. Revolución 1856, Universitaria, 44840 Guadalajara, Jal., México",
    },
  },

  "san-luis": {
    id: "san-luis",
    active: true,

    address: {
      street: "Av. Plan de San Luis",
      extNumber: "1591-A",
      neighborhood: "Mezquitán Country",
      postalCode: "44260",
      city: "Guadalajara",
      state: "Jalisco",
      country: "México",

      formatted:
        "Av. Plan de San Luis 1591-A, Mezquitán Country, 44260 Guadalajara, Jal., México",
    },
  },

  "zapopan": {
    id: "zapopan",
    active: true,

    address: {
      street: "Javier Mina",
      extNumber: "204",
      neighborhood: "Loma Blanca",
      postalCode: "45100",
      city: "Zapopan",
      state: "Jalisco",
      country: "México",

      formatted:
        "Javier Mina 204, Loma Blanca, 45100 Zapopan, Jal., México",
    },
  },

  "patria": {
    id: "patria",
    active: true,

    address: {
      street: "Av. Patria",
      extNumber: "4926",
      neighborhood: "Jardines Universidad",
      postalCode: "45110",
      city: "Zapopan",
      state: "Jalisco",
      country: "México",

      formatted:
        "Av. Patria 4926, Jardines Universidad, 45110 Zapopan, Jal., México",
    },
  },
};

// ========================================
// Actualizar Firestore
// ========================================

async function updateBranches() {
  console.log("");
  console.log("======================================");
  console.log("  Actualización de sucursales Petit");
  console.log("======================================");
  console.log("");

  let updated = 0;
  let errors = 0;

  for (const [branchId, data] of Object.entries(branches)) {
    try {
    const ref = db.collection("branches").doc(branchId);

    const existing = await ref.get();

    if (!existing.exists) {
        console.warn(
        `⚠️ La sucursal "${branchId}" no existe. No se modificó.`
        );
        errors++;
        continue;
    }

    await ref.set(data, {
        merge: true,
    });

        updated++;

        console.log(
        `✅ ${branchId} actualizada correctamente`
        );
    } catch (error) {
        errors++;

        console.error(
        `❌ Error actualizando ${branchId}:`,
        error.message
        );
    }
    }

    console.log("");
    console.log("======================================");
    console.log(`Actualizadas: ${updated}`);
    console.log(`Errores:      ${errors}`);
    console.log("======================================");
    console.log("");

    if (errors === 0 && updated === 11) {
    console.log(
        "🎉 Las 11 sucursales quedaron preparadas."
    );
    }

    process.exit(errors > 0 ? 1 : 0);
}

updateBranches();