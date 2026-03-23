import { Link } from "react-router-dom"

export default function Dashboard() {
  return (
    <main className="bg-cream min-h-[calc(100vh-80px)] pt-[88px] px-4 sm:px-6 lg:px-12 pb-6">
    <h1 className="font-display text-3xl text-wine mb-6">Panel de Admin</h1>
      <div className="grid sm:grid-cols-3 gap-6">
        {/* Productos */}
        <Link
          to="/Fcm5Qpimck7lCl+L35tOt3qNoIe0FVVSmhdFs/aik+Xn3k+ZcwPpYgjUmlwytLRd"
          className="bg-white p-6 rounded-2xl border border-rose/30 text-center hover:bg-rose/20 transition"
        >
          <h2 className="text-xl text-center font-semibold text-wine mb-2">🧁 Pasteleria</h2>
          <p className="text-sm text-center text-wineDark/70">Agrega y edita los productos del menú de pasteles.</p>
        </Link>
        {/*Pastekeria*/}
        {/* <Link
          to="/WvSIxhg7Zi0x2P0+vwlvRVxU5qqY4p5T/A10OYD0ajivoZ58dIcjpjZvGb7+MlSK"
          className="bg-white border border-roseBrand/30 rounded-xl p-6 shadow-soft hover:shadow-md transition"
        >
          <h2 className="text-xl text-center font-semibold text-wine mb-2">☕ Cafetería</h2>
          <p className="text-sm text-center text-wineDark/70">Agrega y edita los productos del menú.</p>
        </Link> */}
        <Link
          to="/rbuvrD9G0kE6JYHvC39TuU0g8Lfj97IByG/45n6NfcPDShkIdeuc4Tv7CtY9zyTpnhCyxRImHyZLPDLXsHInpw"
          className="bg-white border border-roseBrand/30 rounded-xl p-6 shadow-soft hover:shadow-md transition"
        >
          <h2 className="text-xl text-center font-semibold text-wine mb-2">🎂 Pedidos Especiales</h2>
          <p className="text-sm text-center text-wineDark/70">Agrega y edita los pasteles especiales para esos dias unicos.</p>
        </Link>
        <Link
          to="/e/gwQysFs3gp3skmr7JaaQbw9Ehet1NTVeXeqROMFPrk1nu/A80K86WwSvMNwc56tcByHjA4KAhUjJgAohtbrA"
          className="bg-white border border-roseBrand/30 rounded-xl p-6 shadow-soft hover:shadow-md transition"
        >
          <h2 className="text-xl text-center font-semibold text-wine mb-2">📋 Bolsa de Trabajo</h2>
          <p className="text-sm text-center text-wineDark/70">Mira laas solicitudes de trabajo y encuentra al mejor candidato</p>
        </Link>
        {/* <Link
          to="/chWDrcJtqc4R7GqAaRD84hTBtiIVBVr7pRNnysODTRZYUM70/Bx/DUEhmZF9nDPpJn6ZVvER6CQW1iK5VbWEw"
          className="bg-white border border-roseBrand/30 rounded-xl p-6 shadow-soft hover:shadow-md transition"
        >
          <h2 className="text-xl text-center font-semibold text-wine mb-2">💰 Facturación</h2>
          <p className="text-sm text-center text-wineDark/70">Mira y lleva el control de las facturas.</p>
        </Link> */}
        <Link
          to="/hyrfr/gwQysFs3gp3skmr7JaaQbw9Ehet1NTVeXeqROMFPrk1nu/A80K86WwSvMNwc56tcByHjA4KAhUjJgAohtbrA"
          className="bg-white border border-roseBrand/30 rounded-xl p-6 shadow-soft hover:shadow-md transition"
        >
          <h2 className="text-xl text-center font-semibold text-wine mb-2">📰 Novedades</h2>
          <p className="text-sm text-center text-wineDark/70">Mira las novedades por temporada.</p>
        </Link>
        <Link
          to="/heoie/gwQysFs3gp3skmr7JaaQbw9Ehet1NTVeXeqROMFPrk1nu/A80K86WwSvMNwc56tcByHjA4KAhUjJgAohtbrA"
          className="bg-white border border-roseBrand/30 rounded-xl p-6 shadow-soft hover:shadow-md transition"
        >
          <h2 className="text-xl text-center font-semibold text-wine mb-2">📦 Pedidos</h2>
          <p className="text-sm text-center text-wineDark/70">Revisa y administra los pedidos en línea.</p>
        </Link>

      </div>
    </main>
  )
}
