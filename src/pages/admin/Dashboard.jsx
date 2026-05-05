import { Link } from "react-router-dom";
import { exportZipCodesToExcel } from "../../utils/exportZipCodes";
import ZipMap from "../../pages/admin/ZipMap";
import { useState } from "react";

export default function Dashboard() {

  const [showMap, setShowMap] = useState(false);

  return (
    <main className="bg-cream min-h-[calc(100vh-80px)] pt-[88px] px-4 sm:px-6 lg:px-12 pb-6">
      
      <h1 className="font-display text-3xl text-wine mb-6">
        Panel de Admin
      </h1>

      {/* GRID PRINCIPAL */}
      <div className="grid sm:grid-cols-3 gap-6">

        {/* Productos */}
        <Link
          to="/Fcm5Qpimck7lCl+L35tOt3qNoIe0FVVSmhdFs/aik+Xn3k+ZcwPpYgjUmlwytLRd"
          className="bg-white p-6 rounded-2xl border border-rose/30 text-center hover:bg-rose/20 transition"
        >
          <h2 className="text-xl font-semibold text-wine mb-2">🧁 Pastelería</h2>
          <p className="text-sm text-wineDark/70">
            Agrega y edita los productos del menú de pasteles.
          </p>
        </Link>

        {/* Pedidos Especiales */}
        <Link
          to="/rbuvrD9G0kE6JYHvC39TuU0g8Lfj97IByG/45n6NfcPDShkIdeuc4Tv7CtY9zyTpnhCyxRImHyZLPDLXsHInpw"
          className="bg-white border border-roseBrand/30 text-center rounded-xl p-6 shadow-soft hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold text-wine mb-2">🎂 Pedidos Especiales</h2>
          <p className="text-sm text-wineDark/70">
            Administra los pasteles especiales.
          </p>
        </Link>

        {/* Bolsa de Trabajo */}
        <Link
          to="/e/gwQysFs3gp3skmr7JaaQbw9Ehet1NTVeXeqROMFPrk1nu/A80K86WwSvMNwc56tcByHjA4KAhUjJgAohtbrA"
          className="bg-white border border-roseBrand/30 rounded-xl p-6 text-center shadow-soft hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold text-wine mb-2">📋 Bolsa de Trabajo</h2>
          <p className="text-sm text-wineDark/70">
            Revisa solicitudes de empleo.
          </p>
        </Link>

        {/* Novedades */}
        <Link
          to="/hyrfr/gwQysFs3gp3skmr7JaaQbw9Ehet1NTVeXeqROMFPrk1nu/A80K86WwSvMNwc56tcByHjA4KAhUjJgAohtbrA"
          className="bg-white border border-roseBrand/30 text-center rounded-xl p-6 shadow-soft hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold text-wine mb-2">📰 Novedades</h2>
          <p className="text-sm text-wineDark/70">
            Gestiona contenido por temporada.
          </p>
        </Link>

        {/* Pedidos */}
        <Link
          to="/heoie/gwQysFs3gp3skmr7JaaQbw9Ehet1NTVeXeqROMFPrk1nu/A80K86WwSvMNwc56tcByHjA4KAhUjJgAohtbrA"
          className="bg-white border border-roseBrand/30 text-center rounded-xl p-6 shadow-soft hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold text-wine mb-2">📦 Pedidos</h2>
          <p className="text-sm text-wineDark/70">
            Administra pedidos en línea.
          </p>
        </Link>

        {/* Exportar ZIPs */}
        <button
          onClick={exportZipCodesToExcel}
          className="bg-white border border-roseBrand/30 text-center rounded-xl p-6 shadow-soft hover:shadow-md transition text-center"
        >
          <h2 className="text-xl font-semibold text-wine mb-2">
            📥 Exportar códigos postales
          </h2>
          <p className="text-sm text-wineDark/70">
            Descarga los códigos postales registrados
          </p>
        </button>

        
        <button
          onClick={() => setShowMap(!showMap)}
          className="bg-white border border-roseBrand/30 text-center rounded-xl p-6 shadow-soft hover:shadow-md transition text-center"
        >
          <h2 className="text-xl font-semibold text-wine mb-2">
            🗺️ Mapa de Clientes
          </h2>
          <p className="text-sm text-wineDark/70">
            Visualiza desde dónde visitan tu página
          </p>
        </button>

      </div>

      {showMap && (
        <div className="mt-8">
          <ZipMap />
        </div>
      )}

    </main>
  );
}