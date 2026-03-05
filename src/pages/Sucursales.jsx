import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Sucursales() {
  const { t } = useTranslation();

  const sucursales = [
    {
      id: "san-juan-bosco",
      name: "San Juan Bosco",
      address: "C. Juan de Dios Robledo 403, Las Huertas, 44739 Guadalajara, Jal",
      horario: "8:00 AM – 7:00 PM",
      img: "",
      map: "https://maps.app.goo.gl/gVxk8zHbCwQdow1u7",
      rebanada: true,
      rappi: true,
    },
    {
      id: "circunvalacion",
      name: "Circunvalación",
      address: "Av. Cvln. División del Nte. 67, Independencia, 44379 Guadalajara, Jal.",
      horario: "8:30 AM – 9:00 PM",
      img: "https://res.cloudinary.com/dzjupasme/image/upload/v1763401009/ty6zcjerns8cekfc2mij.png",
      map: "https://maps.app.goo.gl/WnZpenK116GT7Ctw9",
      rebanada: true,
      rappi: true,
    },
    {
      id: "el-salto",
      name: "El Salto",
      address: "Libramiento Juanacatlán #40-C, El Salto, Jalisco 45680",
      horario: "8:30 AM – 9:00 PM",
      img: "https://res.cloudinary.com/dzjupasme/image/upload/v1760916617/agzlotvnwtgspa1fcrjz.png",
      map: "https://maps.app.goo.gl/ZtjgUwLGVxhxL8yN9",
      rebanada: true,
      cafeteria: true,
    },
    {
      id: "obsidiana",
      name: "Obsidiana",
      address: "Obsidiana #3805 A Esq. Av Conchita, Loma Bonita, Zapopan, Jal. 45086",
      horario: "8:30 AM – 9:00 PM",
      img: "https://res.cloudinary.com/dzjupasme/image/upload/v1760916618/jgpskyukptl956h14odi.png",
      map: "https://maps.app.goo.gl/Laqe6dXDcKfmnVSD6",
      rebanada: true,
      cafeteria: true,
      rappi: true,
    },
    {
      id: "minerva",
      name: "Minerva",
      address: "Av. Ignacio L. Vallarta #2420-B, Guadalajara, Jal. 44690",
      horario: "Lun–Sáb: 8:30 AM – 9:00 PM · Dom: 8:30 AM – 8:00 PM",
      img: "https://res.cloudinary.com/dzjupasme/image/upload/v1760671329/fk8npzd72yr3ccruqts1.png",
      map: "https://maps.app.goo.gl/LoKzj9G7trbRPG1VA",
      rebanada: true,
      cafeteria: true,
      rappi: true,
    },
    {
      id: "tlaquepaque",
      name: "Tlaquepaque",
      address: "Calle Francisco I. Madero #163, Tlaquepaque, Jal. 45500",
      horario: "8:30 AM – 9:00 PM",
      img: "https://res.cloudinary.com/dzjupasme/image/upload/v1760916617/sid6foctu3kbmiaoscsa.png",
      map: "https://maps.app.goo.gl/kjWHyEWyhffCGq8V7",
      rebanada: true,
      rappi: true,
    },
    {
      id: "rio-nilo",
      name: "Río Nilo",
      address: "Av. Río Nilo #2916, Jardines de la Paz, Jal.",
      horario: "8:30 AM – 9:00 PM",
      img: "https://res.cloudinary.com/dzjupasme/image/upload/v1760671329/ejhq1mvjzbuphbstc3lx.png",
      map: "https://maps.app.goo.gl/xd4sFsUQgwcJxbAM8",
      rebanada: true,
      cafeteria: true,
      rappi: true,
    },
    {
      id: "revolucion",
      name: "Revolución",
      address: "Calz. Revolución #1856, Universitaria, Guadalajara 44840",
      horario: "8:30 AM – 9:00 PM",
      img: "https://res.cloudinary.com/dzjupasme/image/upload/v1760916617/vzoumsonyhkbzjfkktrd.png",
      map: "https://maps.app.goo.gl/Rbp3Qgntn1LC2Mww6",
      rebanada: true,
      rappi: true,
    },
    {
      id: "plan-san-luis",
      name: "Plan de San Luis",
      address: "Av. Plan de San Luis No. 1591-A, Mezquitán Country 44260",
      horario: "8:30 AM – 9:00 PM",
      img: "https://res.cloudinary.com/dzjupasme/image/upload/v1760916616/b0vu04bcejmqivhhuoyy.jpg",
      map: "https://maps.app.goo.gl/jdK9vjyMZvysAsob6",
      rebanada: true,
      rappi: true,
    },
    {
      id: "zapopan",
      name: "Zapopan",
      address: "Francisco Javier Mina No. 204, Zapopan Centro, Jal. 45100",
      horario: "8:30 AM – 9:00 PM",
      img: "https://res.cloudinary.com/dzjupasme/image/upload/v1760671329/hpz2keuyaqnrv1lcsjgn.png",
      map: "https://maps.app.goo.gl/2eRC2uXvHEvAopiH6",
      rebanada: true,
      cafeteria: true,
      rappi: true,
    },
    {
      id: "patria",
      name: "Patria",
      address: "Av. Patria No. 4926, Jardines Universidad, Zapopan, Jal. 45110",
      horario: "8:30 AM – 9:00 PM",
      img: "https://res.cloudinary.com/dzjupasme/image/upload/v1760916617/qkyi1hdnlq58mjxdqjhr.png",
      map: "https://maps.app.goo.gl/DmtFn8Kot4dVeHPr5",
      rebanada: true,
      rappi: true,
    },
  ];

  return (
    <main className="bg-cream min-h-[calc(100vh-80px)] pt-[88px] px-4 sm:px-6 lg:px-12 pb-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h1 className="font-maison neue font-bold text-4xl text-wine mb-3">
          {t("sucursales.sucursalesTitle")}
        </h1>
        <p className="font-maison neue text-wineDark/80 max-w-2xl mx-auto">
          {t("sucursales.sucursalesSubTitle")}
        </p>
      </motion.div>

      <section className="font-maison neue max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {sucursales.map((s) => (
          <motion.div
            key={s.id}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
            className="bg-marfil rounded-2xl border border-rose/30 shadow-soft hover:shadow-lg transition p-5 flex flex-col text-center"
          >
            <h3 className="font-maison neue font-bold text-2xl text-wine mb-2">{s.name}</h3>
            <p className="text-sm text-wineDark/80 mb-2">{s.address}</p>
            <p className="text-sm text-wineDark/70 mb-3">{s.horario}</p>

            <a
              href={s.map}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 bg-wine text-cream px-4 py-2 rounded-lg text-sm font-maison neue font-bold hover:bg-wineDark transition"
            >
              {t("sucursales.sucursalesButton")}
            </a>

            <div className="flex justify-center gap-3 mt-4">
              {s.rebanada && (
                <img
                  src="https://res.cloudinary.com/dzjupasme/image/upload/v1765560283/z3bonz0a3rfeaotmzsk7.png"
                  alt="Rebanada"
                  className="h-14 w-14 object-contain"
                />
              )}
              {s.cafeteria && (
                <img
                  src="https://res.cloudinary.com/dzjupasme/image/upload/v1760750658/xqav4uk0dkmxfnyymzdz.png"
                  alt="Cafetería"
                  className="h-14 w-14 object-contain"
                />
              )}
              {s.rappi && (
                <img
                  src="https://res.cloudinary.com/dzjupasme/image/upload/v1760751843/ap94iwehcefphojg7nnh.png"
                  alt="Rappi"
                  className="h-14 w-14 object-contain"
                />
              )}
            </div>
          </motion.div>
        ))}
      </section>
    </main>
  );
}
