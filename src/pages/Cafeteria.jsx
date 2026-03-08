// src/pages/Cafeteria.jsx
import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Cafeteria() {
  const { t } = useTranslation();

  // 🔹 Sucursales con cafetería
  /* const sucursalesCafeteria = [
    {
      id: "rio-nilo",
      name: "" + t("cafe.cafeteriaBranch1"),
      address: "Av. Río Nilo #2916, Jardines de la Paz, Guadalajara, Jalisco",
      horario: "Lunes a Domingo · 8:30 AM – 9:00 PM",
      img: "https://res.cloudinary.com/dzjupasme/image/upload/v1760671329/ejhq1mvjzbuphbstc3lx.png",
      map: "https://maps.app.goo.gl/axywP3bFcfZMwCsS9",
    },
    {
      id: "zapopan",
      name: "" + t("cafe.cafeteriaBranch2"),
      address:
        "Francisco Javier Mina No. 204, Zapopan Centro, Zapopan, Jalisco 4510",
      horario: "Lunes a Domingo · 8:30 AM – 9:00 PM",
      img: "https://res.cloudinary.com/dzjupasme/image/upload/v1760671329/hpz2keuyaqnrv1lcsjgn.png",
      map: "https://maps.app.goo.gl/7ga6Dsie43Q4kYfE9",
    },
    {
      id: "minerva",
      name: "" + t("cafe.cafeteriaBranch3"),
      address:
        "Av. López Mateos Nte. 1248, Col. Italia Providencia, Guadalajara, Jalisco",
      horario: "Lunes a Sabado · 8:30 AM – 9:00 PM Domingo 8:30 AM - 8:00 PM",
      img: "https://res.cloudinary.com/dzjupasme/image/upload/v1760671329/fk8npzd72yr3ccruqts1.png",
      map: "https://maps.app.goo.gl/bK5pZN2rKKaPdgU97",
    },
  ]; */

  const MENU_IMG_URL =
    "https://res.cloudinary.com/dzjupasme/image/upload/v1764802574/oka2ql13jj2re6ajruhm.jpg";

  return (
    <main className="bg-cream min-h-[calc(100vh-80px)] pt-[88px] px-4 sm:px-6 lg:px-12 pb-6">
      {/* ENCABEZADO */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <h1 className="font-maison neue font-bold text-4xl text-wine mb-4">
          {t("cafe.cafeteriaTitle")}
        </h1>
        <p className="font-maison neue text-wineDark/80 max-w-2xl mx-auto">
          {t("cafe.cafeteriaSubTitle")}
        </p>
      </motion.div>

      {/* MENÚ COMO IMAGEN ÚNICA */}
      <section className="max-w-4xl mx-auto mb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-soft border border-rose/30 overflow-hidden"
        >
          <div className="w-full">
            <img
              src={MENU_IMG_URL}
              alt={t(
                "cafe.cafeteriaMenuAlt",
                "Menú de bebidas de la cafetería Petit Plaisir"
              )}
              className="w-full h-auto object-contain"
            />
          </div>
        </motion.div>
      </section>

      {/* SUCURSALES CON CAFETERÍA SIN FOTO */}
      <section className="item-center max-w-6xl mx-auto mt-8">
        <h2 className="item-center font-maison neue font-bold text-3xl text-center text-wineDark mb-10">
          {t("cafe.cafeteriaSucursales")}
        </h2>

       {/*  <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-8">
          {sucursalesCafeteria.map((s) => (
            <motion.div
              key={s.id}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="bg-marfil rounded-2xl shadow-soft border border-rose/30 hover:shadow-lg p-5 flex flex-col justify-between"
            >
              <div className="text-center">
                <h3 className="font-display text-xl text-wineBrand mb-1">
                  {s.name}
                </h3>
                <p className="text-sm text-wineDark/80">{s.address}</p>
                <p className="text-sm text-wineDark/70 mt-1">{s.horario}</p>
              </div>

              <a
                href={s.map}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-center bg-red text-white px-5 py-2 rounded-full font-semibold hover:bg-red/80 transition"
              >
                {t("cafe.cafeteriaSucursalesButton")}
              </a>
            </motion.div>
          ))}
        </div> */}
      <div className="flex justify-center mt-8">
        <a
          href="/sucursales"
          className="inline-flex items-center justify-center bg-red text-white px-8 py-3 rounded-xl font-maison neue hover:opacity-90 transition"
        >
          {t("cafe.cafeteriaBranchButton")}
        </a>
      </div>
      </section>
    </main>
  );
}
