import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export async function exportZipCodesToExcel() {
  try {
    const querySnapshot = await getDocs(collection(db, "zipCodes"));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Códigos Postales");

    // Definir columnas
    worksheet.columns = [
      { header: "Código Postal", key: "zip", width: 15 },
      { header: "Ciudad", key: "city", width: 25 },
      { header: "Estado", key: "state", width: 20 },
      { header: "Fecha", key: "createdAt", width: 25 },
    ];

    // Estilo encabezados
    worksheet.getRow(1).font = { bold: true };

    // Llenar datos
    querySnapshot.forEach((doc) => {
      const d = doc.data();

      worksheet.addRow({
        zip: d.zip || "",
        city: d.city || "",
        state: d.state || "",
        createdAt: d.createdAt
          ? new Date(d.createdAt.seconds * 1000)
          : "",
      });
    });

    // Formato de fecha
    worksheet.getColumn("createdAt").numFmt = "dd/mm/yyyy hh:mm";

    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "codigos_postales.xlsx");
  } catch (error) {
    console.error("Error exportando:", error);
  }
}