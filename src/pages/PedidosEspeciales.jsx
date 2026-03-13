// src/pages/PedidosEspeciales.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { pickLang } from "../utils/i18nContent";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { X } from "lucide-react";

import CATEGO1_IMG from "../assets/categorias-especiales/portada-dibujado.png";
import CATEGO2_IMG from "../assets/categorias-especiales/portada-15-años.png";
import CATEGO3_IMG from "../assets/categorias-especiales/portada-bodas.png";
import CATEGO4_IMG from "../assets/categorias-especiales/portada-bautizo.png";
import CATEGO5_IMG from "../assets/categorias-especiales/portada-comunion.png";
import CATEGO6_IMG from "../assets/categorias-especiales/portada-oblea.png";
import CATEGO7_IMG from "../assets/categorias-especiales/portada-fondant.png";


export default function PedidosEspeciales() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("en") ? "en" : "es";

  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeCategory, setActiveCategory] = useState("catego0");
  const [loading, setLoading] = useState(true);
  const [showCategoryGrid, setShowCategoryGrid] = useState(true);

  // ✅ Modal “Ver más”
  const [selected, setSelected] = useState(null);

  // 🔹 Categorías por clave (se traducen con i18n) 
  const categories = [ 
  "catego0", 
  "catego1",
  "catego6",  
  "catego7",
  "catego4", 
  "catego5",
  "catego2", 
  "catego3", 
  ];



const CATEGORY_IMAGES = {
  catego1: CATEGO1_IMG,
  catego2: CATEGO2_IMG,
  catego3: CATEGO3_IMG,
  catego4: CATEGO4_IMG,
  catego5: CATEGO5_IMG,
  catego6: CATEGO6_IMG,
  catego7: CATEGO7_IMG,
};

const categoryCards = categories
  .filter((k) => k !== "catego0")
  .map((k) => ({
    key: k,
    label: t(`special.${k}`),
    img: CATEGORY_IMAGES[k],
  }));


  // 🔹 Cargar productos desde Firestore (colección "pedidosEspeciales")
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pedidosEspeciales"), (snap) => {
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Ordenar: destacados primero
      const sorted = docs.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));

      setItems(sorted);
      setFiltered(sorted);
      setLoading(false);
    });

    return () => unsub();
  }, []);

    // 🔹 Filtrar por categoría (usando la clave)
  const filterByCategory = (catKey) => {
    setActiveCategory(catKey);

    if (catKey === "catego0") {
      setFiltered(items);
      setShowCategoryGrid(true); // 👈 vuelve a vitrinas
      return;
    }

    setShowCategoryGrid(false); // 👈 entra a categoría

    setFiltered(
      items.filter((p) => p.category === catKey || p.categoryKey === catKey)
    );
  };


  // 🔹 Link de WhatsApp general (Pedidos Especiales)
  const whatsappGeneral =
    "https://api.whatsapp.com/send?phone=5213318501155&text=Hola!%20Me%20gustaria%20hacer%20un%20pedido%20especial.%20¿Podrian%20apoyarme?";

  // ✅ Cerrar modal con ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setSelected(null);
    };
    if (selected) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <main className="bg-cream min-h-screen px-4 sm:px-6 lg:px-12 pt-24 pb-16">
      {/* Encabezado */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <h1 className="font-maison neue font-bold text-4xl text-wine mb-4">
          {t("special.title", "Pedidos Especiales")}
        </h1>
        <p className="font-maison neue text-wineDark/80 max-w-2xl mx-auto">
          {t(
            "special.subtitle",
            "Celebra tus momentos más importantes con un pastel único, hecho especialmente para ti. Consulta nuestras categorías y contáctanos por WhatsApp para cotizar tu pedido."
          )}
        </p>
      </motion.div>

      {/* Filtros */}
      {!showCategoryGrid && (
  <>
    
      <div className="font-maison neue flex flex-wrap justify-center gap-3 mb-10">
        {categories.map((catKey) => (
          <button
            key={catKey}
            onClick={() => filterByCategory(catKey)}
            className={`px-4 py-2 rounded-full border transition font-medium ${
              activeCategory === catKey
                ? "bg-red text-white border-red"
                : "bg-marfil border-wine/30 text-wine hover:bg-rose/30"
            }`}
          >
            {t(`special.${catKey}`, catKey)}
          </button>
        ))}
      </div>
  </>
)}

      {/* CTA WhatsApp general */}
      <div className="font-maison neue text-center mt-8 mb-8">
        <a
          href={whatsappGeneral}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-green-600 text-white text-lg font-semibold px-8 py-4 rounded-full hover:bg-green-700 shadow-md transition"
        >
          <FontAwesomeIcon icon={faWhatsapp} className="w-6 h-6" />
          {t("special.cta", "Realiza tu pedido especial")}
        </a>
      </div>

      {showCategoryGrid && (
    <div className="max-w-6xl mx-auto mb-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categoryCards.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => filterByCategory(cat.key)}
            className="group text-left border rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition bg-white"
          >
            <div className="relative">
              <img
                src={cat.img}
                alt={cat.label}
                className="w-full aspect-[4/3] object-cover bg-cream group-hover:scale-[1.02] transition-transform"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <h3 className="text-white text-2xl font-semibold tracking-wide px-4 text-center">
                  {cat.label}
                </h3>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )}


      {/* Productos */}
    {!showCategoryGrid && (
      <section className="font-maison neue max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence>
          {loading ? (
            <p className="font-maison neue text-center text-wineDark/70 col-span-full">
              {t("special.loading", "Cargando pasteles especiales...")}
            </p>
          ) : filtered.length > 0 ? (
            filtered.map((item) => {
              const name = pickLang(item.title || item.name, lang);
              const desc = pickLang(item.desc, lang);
              const imgSrc = item.img || item.imagen;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                  className="font-maison neue bg-cream border border-rose/30 rounded-2xl overflow-hidden shadow hover:shadow-lg transition"
                >
                  {/* Imagen (clic abre modal) */}
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className="h-60 w-full overflow-hidden relative group text-left"
                    title={t("special.viewMore", "Ver más")}
                  >
                    <img
                      src={imgSrc}
                      alt={name || item.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                    {/* overlay sutil para indicar clic */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                    <div className="absolute bottom-3 right-3 bg-white/85 backdrop-blur-sm text-wine text-xs px-3 py-1 rounded-full shadow">
                      {t("special.viewMore", "Ver más")}
                    </div>
                  </button>

                  {/* Info */}
                  <div className="font-maison neue p-5 text-center flex flex-col justify-between h-full">
                    <div>
                      <h3 className="font-display text-xl text-wine mb-2">
                        {name || item.nombre}
                      </h3>
                      <p className="text-sm text-wineDark/70 line-clamp-3">
                        {desc || item.descripcion}
                      </p>

                      {/* Categoría traducida */}
                      {item.category && (
                        <p className="mt-2 text-xs text-wineDark/60 italic">
                          {t(`special.${item.category}`, item.category)}
                        </p>
                      )}
                    </div>

                    {/* Precio (opcional) */}
                    {item.price && (
                      <p className="mt-3 font-semibold text-wineDark">
                        ${Number(item.price).toFixed(2)} MXN
                      </p>
                    )}

                    {/* Botón WhatsApp */}
                    <a
                      href={`https://api.whatsapp.com/send?phone=5213318501155&text=Hola!%20Estoy%20interesado%20en%20el%20${encodeURIComponent(
                        name || item.nombre
                      )}.%20%F0%9F%8E%82`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-4 bg-green-600 text-white px-5 py-2 rounded-full font-semibold hover:bg-green-700 transition"
                    >
                      <FontAwesomeIcon icon={faWhatsapp} className="mr-2" />
                      {t("special.ctaProduct", "Consultar por este pastel")}
                    </a>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <p className="text-center text-wineDark/70 col-span-full">
              {t("special.noResults", "No hay productos en esta categoría todavía.")}
            </p>
          )}
        </AnimatePresence>
      </section>
    )}

      {/* ✅ Modal tipo Products */}
      <AnimatePresence>
        {selected && (
          <SpecialModal
            item={selected}
            lang={lang}
            t={t}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function SpecialModal({ item, lang, t, onClose }) {
  const name = pickLang(item.title || item.name, lang) || item.nombre || "Producto";
  const desc = pickLang(item.desc, lang) || item.descripcion || "";
  const imgSrc = item.img || item.imagen;

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl max-w-md w-full p-6 relative overflow-hidden shadow-xl"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-wine hover:text-red">
          <X size={22} />
        </button>

        <div className="w-full bg-cream rounded-xl border border-rose/20 p-2 mb-4">
          <img
            src={imgSrc}
            alt={name}
            className="w-full max-h-[70vh] object-contain rounded-lg"
            loading="eager"
            decoding="async"
          />
        </div>


        <h2 className="text-2xl font-display text-wine mb-2 text-center">{name}</h2>

        {item.category && (
          <p className="text-xs text-wineDark/60 italic text-center mb-2">
            {t(`special.${item.category}`, item.category)}
          </p>
        )}

        <p className="text-wineDark/80 text-sm mb-4 text-justify">{desc}</p>

        {item.price && (
          <p className="text-center font-semibold text-wine mb-4">
            ${Number(item.price).toFixed(2)} MXN
          </p>
        )}

        <a
          href={`https://api.whatsapp.com/send?phone=5213318501155&text=Hola!%20Estoy%20interesado%20en%20el%20${encodeURIComponent(
            name
          )}.%20%F0%9F%8E%82`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-green-700 transition"
        >
          <FontAwesomeIcon icon={faWhatsapp} />
          {t("special.ctaProduct", "Consultar por este pastel")}
        </a>

        <button
          onClick={onClose}
          className="w-full mt-3 bg-red text-cream px-5 py-3 rounded-xl font-semibold hover:opacity-90 transition"
        >
          {t("special.close", "Cerrar")}
        </button>
      </motion.div>
    </motion.div>
  );
}
