import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCakeCandles, faMugHot, faGift, faStore } from "@fortawesome/free-solid-svg-icons";

export default function Nosotros() {
  const { t } = useTranslation();

  const STORY_IMG =
    "https://res.cloudinary.com/dzjupasme/image/upload/e_background_removal/f_png/v1766505868/kzcjbkpzvcrv7sdosaya.png";

  const PIER_IMG =
    "https://res.cloudinary.com/dzjupasme/image/upload/c_crop,w_650,h_800/v1767149183/dygjbhogjoungfwdbiha.png";

  const STORY_IMG_ALT = "";
  const STORY_IMG_LINK = ""; // opcional

  const features = [
    { icon: faCakeCandles, title: t("about.traditionTitle"), desc: t("about.traditionDesc") },
    { icon: faMugHot, title: t("about.cafeTitle"), desc: t("about.cafeDesc") },
    { icon: faGift, title: t("about.sliceTitle"), desc: t("about.sliceDesc") },
    { icon: faStore, title: t("about.branchesTitle"), desc: t("about.branchesDesc") },
  ];

  const gallery = [
    {
      src: "https://res.cloudinary.com/dzjupasme/image/upload/v1764703220/wwi99d9aizwfamwiybpo.jpg",
      alt: "imagen5",
      caption: t("about.img3"),
      className: "",
    },
    {
      src: "https://res.cloudinary.com/dzjupasme/image/upload/v1764807166/tnejiwmrjuczm0tpwfup.jpg",
      alt: "imagen3",
      caption: t("about.img4"),
      className: "row-span-2",
    },
    {
      src: "https://res.cloudinary.com/dzjupasme/image/upload/v1772668700/nw0fewaj55pvbkuv9lwq.jpg",
      alt: "imagen2",
      caption: t("about.img2"),
      className: "row-span-2",
    },
    {
      src: "https://res.cloudinary.com/dzjupasme/image/upload/v1767153429/kqvoucflsw3bhjdnnhao.jpg",
      alt: "imagen1",
      caption: t("about.img5"),
      className: "row-span-2",
    },
    {
      src: "https://res.cloudinary.com/dzjupasme/image/upload/v1764703220/i2d2ybodsdi84gpha2rm.jpg",
      alt: "imagen7",
      caption: t("about.img8"),
      className: "",
    },
    {
      src: "https://res.cloudinary.com/dzjupasme/image/upload/v1767153604/uiv4rrurommydwdwhwtu.jpg",
      alt: "imagen1",
      caption: t("about.img6"),
      className: "row-span-2",
    },
    {
      src: "https://res.cloudinary.com/dzjupasme/image/upload/v1764703219/nmjlw4dijem019km1jm8.jpg",
      alt: "imagen9",
      caption: t("about.img9"),
      className: "",
    },
    
  ];

  const StorySideImage = ({ src }) => {
    if (STORY_IMG_LINK) {
      return (
        <a href={STORY_IMG_LINK} target="_blank" rel="noopener noreferrer" className="group" title="Ver más">
          <img
            src={src}
            alt={STORY_IMG_ALT}
            className="w-56 md:w-72 h-auto bg-cream"
            loading="lazy"
            decoding="async"
          />
        </a>
      );
    }
    return (
      <img
        src={src}
        alt={STORY_IMG_ALT}
        className="w-56 md:w-72 h-auto bg-cream"
        loading="lazy"
        decoding="async"
      />
    );
  };

  return (
    <main className="bg-cream min-h-[calc(100vh-80px)] pt-[96px] pb-16">
      {/* ✅ Header estilo Products: texto + imagen a la derecha */}
      <section className="px-4 sm:px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid items-start gap-6 md:grid-cols-[1fr_220px]"
          >
            {/* Columna izquierda */}
            <div className="max-w-3xl">
              {/* ✅ Título SIEMPRE centrado */}
              <h1 className="font-maison neue font-bold text-3xl text-wine text-center mb-3">
                {t("about.title")}
              </h1>

              <p className="font-maison neue font-bold text-3x1 leading-7 text-wine leading-relaxed">
                {t("about.textbold1")}
              </p>
              <p className="font-maison neue text-sm leading-7 text-wineDark leading-relaxed text-justify">
                {t("about.subtitle1")}
              </p>
            </div>

            {/* Columna derecha: imagen sin bordes */}
            <div className="flex justify-center md:justify-end">
              <StorySideImage src={STORY_IMG} />
            </div>
          </motion.div>

          {/* ✅ Resto del texto (sin imagen) */}
          <div className="max-w-3xl mt-4">
            <p className="font-maison neue text-sm leading-7 text-wineDark leading-relaxed text-justify">
              {t("about.subtitle2")}
            </p>
            <br />
            <p className="font-maison neue text-sm leading-7 text-wineDark leading-relaxed text-justify">
              {t("about.subtitle3")}
            </p>
            <br />

            <p className="font-maison neue font-bold text-3x1 leading-7 text-wine leading-relaxed">
              {t("about.textbold2")}
            </p>
            <p className="font-maison neue text-sm leading-7 text-wineDark leading-relaxed text-justify">
              {t("about.subtitle4")}
            </p>
            <br />
            <p className="font-maison neue text-sm leading-7 text-wineDark leading-relaxed text-justify">
              {t("about.subtitle5")}
            </p>
            <br />
            <p className="font-maison neue text-sm leading-7 text-wineDark leading-relaxed text-justify">
              {t("about.subtitle6")}
            </p>
            <br />

            <p className="font-maison neue font-bold text-3x1 leading-7 text-wine leading-relaxed">
              {t("about.textbold3")}
            </p>
            <p className="font-maison neue text-sm leading-7 text-wineDark leading-relaxed text-justify">
              {t("about.subtitle7")}
            </p>
            <br />
            <p className="font-maison neue text-sm leading-7 text-wineDark leading-relaxed text-justify">
              {t("about.subtitle8")}
            </p>
            <br />

            <p className="font-maison neue font-bold text-3x1 leading-7 text-wine leading-relaxed">
              {t("about.textbold4")}
            </p>
            <p className="font-maison neue text-sm leading-7 text-wineDark leading-relaxed text-justify">
              {t("about.subtitle9")}
            </p>
            <br />

            <p className="font-maison neue font-bold text-3x1 leading-7 text-wine leading-relaxed">
              {t("about.textbold5")}
            </p>
            <p className="font-maison neue text-sm leading-7 text-wineDark leading-relaxed text-justify">
              {t("about.subtitle10")}
            </p>
            <br />

            <p className="font-maison neue font-bold text-3x1 leading-7 text-wine leading-relaxed">
              {t("about.textbold6")}
            </p>
            <p className="font-maison neue text-sm leading-7 text-wineDark leading-relaxed text-justify">
              {t("about.subtitle11")}
            </p>
            <br />
            <br />
            <p className="font-maison neue font-bold text-3x1 leading-7 text-wine leading-relaxed">
              {t("about.textbold7")}
            </p>
            <p className="font-maison neue text-sm leading-7 text-wineDark leading-relaxed text-justify">
              {t("about.subtitle12")}
            </p>
            <br />
            <br />  
            <p className="font-maison neue font-bold text-3x1 leading-7 text-wine leading-relaxed">
              {t("about.textbold8")}
            </p>
            <p className="font-maison neue text-sm leading-7 text-wineDark leading-relaxed text-justify">
              {t("about.subtitle13")}
            </p>
            <p className="font-maison neue text-sm leading-7 text-wineDark leading-relaxed text-justify">
              {t("about.subtitle14")}
            </p>
            <p className="font-maison neue text-sm leading-7 text-wineDark leading-relaxed text-justify">
              {t("about.subtitle15")}
            </p>
          </div>

          {/* ✅ Cierre: texto + PIER_IMG a la derecha (igual que arriba) */}
          <div className="mt-2 grid items-start gap-6 md:grid-cols-[1fr_220px]">
            {/* izquierda */}
            <div className="max-w-3xl">
              <p className="font-maison neue font-bold text-3x1 leading-7 text-wine leading-relaxed">
                {t("about.textbold9")}
              </p>
              <p className="font-maison neue text-sm leading-7 text-wineDark leading-relaxed text-justify">
                {t("about.subtitle16")}
              </p>
            </div>

            {/* derecha */}
          <div className="flex justify-center md:justify-end items-center">
            <div className="flex justify-center md:justify-end">
              <StorySideImage src={PIER_IMG}
              alt="Pierre"
              className="w-full h-auto object-contain" />
            </div>
          </div>

          </div>
        </div>
      </section>

      {/* 2) Galería */}
      <section className="px-4 sm:px-6 lg:px-12 mt-16">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45 }}
            className="
              grid gap-4
              grid-cols-2 sm:grid-cols-3 lg:grid-cols-4
              auto-rows-[160px] sm:auto-rows-[180px] lg:auto-rows-[190px]
            "
          >
            {gallery.map((img) => (
              <figure
                key={img.src}
                className={`relative w-full h-full overflow-hidden rounded-xl border border-rose/20 shadow-sm ${img.className}`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
                <figcaption
                  className="
                    absolute inset-x-0 bottom-0 text-center
                    px-3 py-2
                    text-cream text-xs sm:text-sm font-maison neue
                    drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]
                    bg-gradient-to-t from-wine/80 via-wine/40 to-transparent
                  "
                >
                  {img.caption}
                </figcaption>
              </figure>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 3) Texto + Audio */}
      <section className="px-4 sm:px-6 lg:px-12 mt-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45 }}
          >
            <h2 className="font-maison neue font-bold text-3xl text-wine mb-3">{t("about.sliceHeading")}</h2>
            <p className="font-maison neue text-sm leading-7 text-wineDark">{t("about.sliceText")}</p>

            <div className="mt-4 w-full flex justify-center">
              <audio controls className="w-full max-w-md rounded-xl border border-rose/30 shadow-sm">
                <source
                  src="https://res.cloudinary.com/dzjupasme/video/upload/v1765833581/kra3rfg0ukvdc06udkd1.wav"
                  type="audio/wav"
                />
                {t("about.audioNotSupported")}
              </audio>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature blocks */}
      <section className="px-4 sm:px-6 lg:px-12 mt-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl border border-rose/30 p-5 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-rose/20 text-wine flex items-center justify-center mb-3">
                <FontAwesomeIcon icon={f.icon} />
              </div>
              <h3 className="text-wine font-maison neue font-bold text-1xl mb-2">{f.title}</h3>
              <p className="text-sm font-maison neue text-wineDark/80 mt-1">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 lg:px-12 mt-16">
        <div className="bg-wine text-cream rounded-2xl p-6 text-center shadow-sm">
          <h3 className="font-maison neue font-bold text-2xl mb-2">{t("about.ctaTitle")}</h3>
          <p className="font-maison neue opacity-90">{t("about.ctaSubtitle")}</p>
          <br />
          <a
            href="/UmEFSY7AZFKVrotZ6mtdTWU5vthcO4fPeRgHPykBVUVuXFBOxELqnMJqYTHYkZvz"
            className="bg-red px-6 py-3 rounded-lg font-maison neue hover:opacity-90 transition"
          >
            {t("home.bannerButton")}
          </a>
        </div>
      </section>
    </main>
  );
}
