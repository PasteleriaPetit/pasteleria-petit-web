import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp, faFacebook, faInstagram } from "@fortawesome/free-brands-svg-icons";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from "firebase/firestore";
import { toast } from "react-toastify";

export default function Home() {
  const BANNER_DESKTOP =
    "https://res.cloudinary.com/dzjupasme/image/upload/c_pad,b_gen_fill,w_1920,h_1080/v1767902535/xhsojdjr9wtrnqlohopx.jpg";

  const BANNER_MOBILE =
    "https://res.cloudinary.com/dzjupasme/image/upload/v1767894282/llruhi3rlz8eezns4tth.jpg";

  const { t } = useTranslation();

  // --- Estado comentarios ---
  const [form, setForm] = useState({ nombre: "", correo: "", mensaje: "" });
  const [sending, setSending] = useState(false);
  const [comentarios, setComentarios] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "comentarios"), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setComentarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.correo || !form.mensaje) {
      toast.warning("⚠️ Por favor completa todos los campos");
      return;
    }

    try {
      setSending(true);
      await addDoc(collection(db, "comentarios"), {
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        mensaje: form.mensaje.trim(),
        fecha: serverTimestamp(),
      });
      toast.success("✅ Comentario enviado correctamente");
      setForm({ nombre: "", correo: "", mensaje: "" });
    } catch {
      toast.error("❌ Ocurrió un error al enviar tu mensaje");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
  <section
  className="
    relative w-full
    mt-20                     /* 👈 empuja el hero debajo del header */
    h-[90vh] md:h-[90vh] lg:h-[115vh]
    overflow-hidden bg-cream
  "
>

    <img
      src={BANNER_DESKTOP}
      alt="Promoción Petit Plaisir"
      className="hidden md:block w-full h-full object-cover object-[center_top]"
    />

    <img
      src={BANNER_MOBILE}
      alt="Promoción Petit Plaisir"
      className="block md:hidden w-full h-full object-cover object-[center_top]"
    />
  </section>


      {/* ================= CONTENIDO ================= */}
      <main className="bg-cream pt-10 pb-6">
        {/* CTA Rebanada */}
  <section className="font-maison neue bg-rosepier text-wine py-10 flex flex-col items-center text-center">
    <div className="px-4 py-4">
      <img
        src="https://res.cloudinary.com/dzjupasme/image/upload/v1765908539/xm3exyhaz3sgt4rbjhkk.png"
        alt="La rebanada de tu antojo"
        className="w-full max-w-md h-auto mb-6"
      />
    </div>

    <p className="text-lg mt-2 mb-6 max-w-4xl px-4">
      {t("home.ctaRebanadaText")}
    </p>

    <a
      href="https://res.cloudinary.com/dzjupasme/image/upload/v1765899511/kxgjvmwlvdulddobsjly.pdf"
      target="_blank"
      rel="noopener noreferrer"
      className="bg-red text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition"
    >
      {t("home.ctaButton")}
    </a>

    
  </section>


        {/* Separador rombos inferior */}
        <div className="relative w-full h-12 sm:h-10 md:h-12 lg:h-16 xl:h-20 bg-cream overflow-hidden">
          <div
            className="
              absolute inset-0
              bg-[url('https://res.cloudinary.com/dzjupasme/image/upload/v1767882752/sqbbw3kig8xx4mminiwn.png')]
              bg-repeat-x
              bg-center
              bg-contain
            "
          />
          
        </div>
        {/* ICONOS DE CALIDAD */}
    <div className="flex justify-center items-center gap-18 mt-8 mb-8 px-4 overflow-x-auto">
      <img
        src="https://res.cloudinary.com/dzjupasme/image/upload/v1769476682/d0kkhcefwqvnatatmrya.png"
        alt="Sin conservadores"
        className="w-32 md:w-36 h-auto"
      />
      
      <img
        src="https://res.cloudinary.com/dzjupasme/image/upload/e_background_removal/f_png/v1769612892/x3h2dhyoe1w3tgjsglvw.jpg"
        alt="Producto artesanal"
        className="w-32 md:w-36 h-auto"
      />
      <img
        src="https://res.cloudinary.com/dzjupasme/image/upload/e_background_removal/f_png/v1769612892/hgh75ywru6ic34xbnjuf.jpg"
        alt="Ingredientes naturales"
        className="w-32 md:w-36 h-auto"
      />
    </div>
    {/* Separador rombos inferior */}
        <div className="relative w-full h-12 sm:h-10 md:h-12 lg:h-16 xl:h-20 bg-cream overflow-hidden">
          <div
            className="
              absolute inset-0
              bg-[url('https://res.cloudinary.com/dzjupasme/image/upload/v1767882752/sqbbw3kig8xx4mminiwn.png')]
              bg-repeat-x
              bg-center
              bg-contain
            "
          />
          
        </div>
    

        {/* Contacto */}
        <section className="font-maison neue bg-cream py-16">
          <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-10">
            {/* Info */}
            <div>
              <h2 className="font-bold text-3xl text-wine mb-4">
                {t("home.contactTitle")}
              </h2>

              <p className="text-wineDark/80 mb-6">
                {t("home.contactText")}
              </p>

              <ul className="space-y-3 text-wineDark">
                <li><strong>Tel:</strong> 33-3639-7058</li>
                {/* <li><strong>Cel:</strong> 33-3639-7058</li> */}
                <li><strong>Email:</strong> marketing@pasteleriaspetit.com</li>
                <li>
                  <strong>{t("home.contactAddress")}:</strong> Francisco I. Madero No. 163, Tlaquepaque Centro
                </li>

                <li>
                  <a
                    href="https://api.whatsapp.com/send?phone=5213314719680"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-700 transition"
                  >
                    <FontAwesomeIcon icon={faWhatsapp} />
                    {t("home.contactWhatsapp")}
                  </a>
                </li>

                <li className="flex gap-4">
                  <a
                    href="https://www.facebook.com/pasteleriaspetit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition"
                  >
                    <FontAwesomeIcon icon={faFacebook} />
                    Facebook
                  </a>

                  <a
                    href="https://www.instagram.com/pasteleriaspetit/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-pink-700 transition"
                  >
                    <FontAwesomeIcon icon={faInstagram} />
                    Instagram
                  </a>
                </li>
              </ul>
            </div>

            {/* Formulario */}
            <section className="max-w-lg mx-auto bg-rose/10 rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-wine mb-4 text-center">
                {t("home.commentsTitle")}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder={t("home.commentName")}
                  className="w-full border rounded-lg px-4 py-2"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />

                <input
                  type="email"
                  placeholder={t("home.commentEmail")}
                  className="w-full border rounded-lg px-4 py-2"
                  value={form.correo}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                />

                <textarea
                  rows="4"
                  placeholder={t("home.commentMessage")}
                  className="w-full border rounded-lg px-4 py-2"
                  value={form.mensaje}
                  onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                />

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-red text-white font-semibold py-2 rounded-lg hover:opacity-90"
                >
                  {sending ? "Enviando..." : "Enviar mensaje"}
                </button>
              </form>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
