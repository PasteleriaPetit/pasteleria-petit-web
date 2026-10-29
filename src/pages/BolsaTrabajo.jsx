import { useState } from "react"
import { db } from "../lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { toast } from "react-toastify"
import { useTranslation } from "react-i18next"

export default function BolsaTrabajo() {
const { t, i18n } = useTranslation()
const [sending, setSending] = useState(false)

const [form, setForm] = useState({
    nombre: "",
    fechaNacimiento: "",
    telefono: "",
    motivo: "",
    experiencia: "",
    area: "",
    correo: "",
    sucursal: "",
    cv: null,
})

const handleChange = (e) => {
    const { name, value, files } = e.target
    setForm((f) => ({ ...f, [name]: files ? files[0] : value }))
}

const uploadCV = async (file) => {
    const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD
    const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET_JOBS
    if (!CLOUD || !PRESET) throw new Error("⚠️ Faltan variables de entorno Cloudinary")

    const data = new FormData()
    data.append("file", file)
    data.append("upload_preset", PRESET)

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/raw/upload`, {
    method: "POST",
    body: data,
    })
    if (!res.ok) throw new Error("Error subiendo archivo")
    return res.json()
}

const handleSubmit = async (e) => {
    e.preventDefault()
    if (
    !form.nombre ||
    !form.fechaNacimiento ||
    !form.telefono ||
    !form.correo ||
    !form.area ||
    !form.sucursal ||
    !form.cv
    ) {
    toast.warning("⚠️ Completa todos los campos obligatorios.")
    return
    }

    setSending(true)
    try {
    const upload = await uploadCV(form.cv)
    await addDoc(collection(db, "jobApplications"), {
        nombre: form.nombre.trim(),
        fechaNacimiento: form.fechaNacimiento,
        telefono: form.telefono.trim(),
        motivo: form.motivo.trim(),
        experiencia: form.experiencia.trim(),
        area: form.area,
        correo: form.correo.trim(),
        sucursal: form.sucursal,
        cvUrl: upload.secure_url,
        cvId: upload.public_id,
        idioma: i18n.language,
        creadoEn: serverTimestamp(),
        estado: "recibido",
    })

    toast.success("✅ Solicitud enviada con éxito.")
    setForm({
        nombre: "",
        fechaNacimiento: "",
        telefono: "",
        motivo: "",
        experiencia: "",
        area: "",
        correo: "",
        sucursal: "",
        cv: null,
    })
    } catch (err) {
    console.error(err)
    toast.error("❌ Error al enviar la solicitud.")
    } finally {
    setSending(false)
    }

    // Validar que la fecha de nacimiento no sea de hoy ni menor a 15 años
    const anioNacimiento = new Date(form.fechaNacimiento).getFullYear();
    const anioActual = new Date().getFullYear();

    if (anioActual - anioNacimiento < 15) {
    toast.warning("⚠️ Por favor ingresa una fecha de nacimiento válida (año en que naciste).");
    return;
    }
}

const areas = [
    t("jobs.areas.store", "Encargado de Tienda"),
    t("jobs.areas.sales", "Auxiliar de Ventas"),
    t("jobs.areas.home", "Servicio a Domicilio"),
    t("jobs.areas.production", "Producción"),
    t("jobs.areas.almacen", "Almacén"),
    t("jobs.areas.distribution", "Distribución"),
    t("jobs.areas.management", "Administración"), 
]

const sucursales = [
    "San Juan Bosco",
    "Circunvalación",
    "Tlaquepaque",
    "Río Nilo",
    "Revolución",
    "Country",
    "Patria",
    "Zapopan",
    "Minerva",
    "Obsidiana",
    "El Salto",
]

return (
    <main className="bg-cream min-h-[calc(100vh-80px)] pt-[88px] px-4 sm:px-6 lg:px-12 pb-10">
    <section className="max-w-3xl mx-auto bg-rose/10 rounded-2xl shadow-md p-6 border border-rose/20">
        <h1 className="font-maison neue font-bold text-3xl text-wine mb-2 text-center">
        {t("jobs.title", "Bolsa de trabajo")}
        </h1>
        <p className="font-maison neue text-center text-wineDark/80 mb-6">
        {t(
            "jobs.subtitle",
            "Forma parte de la familia Petit Plaisir completando el siguiente formulario."
        )}
        </p>

        <form onSubmit={handleSubmit} className="font-maison neue space-y-4">
         {/* Nombre y fecha de nacimiento */}
<div className="grid md:grid-cols-2 gap-4">
  <div>
    <label htmlFor="nombre" className="block text-xs font-semibold text-wine mb-1">
      {t("jobs.nameLabel", "Nombre completo *")}
    </label>
        <input
        id="nombre"
        name="nombre"
        value={form.nombre}
        onChange={handleChange}
        placeholder={t("jobs.name", "Nombre completo *")}
        className="border border-wine/20 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose w-full bg-white text-wineDark"
        />
    </div>

    <div>
        <label htmlFor="fechaNacimiento" className="block text-xs font-semibold text-wine mb-1">
        {t("jobs.birthdayLabel", "Fecha de nacimiento / Cumpleaños *")}
        </label>
        <input
        id="fechaNacimiento"
        name="fechaNacimiento"
        type="date"
        max={new Date(new Date().setFullYear(new Date().getFullYear() - 15)).toISOString().split("T")[0]} 
        value={form.fechaNacimiento}
        onChange={handleChange}
        className="border border-wine/20 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose w-full bg-white text-wineDark"
        />
        <span className="text-[11px] text-wineDark/60 block mt-1">
        {t("jobs.birthdayHint", "Indica el día, mes y año en que naciste.")}
        </span>
    </div>
    </div>

          {/* Teléfono y correo */}
        <div className="grid md:grid-cols-2 gap-4">
            <input
            name="telefono"
            value={form.telefono}
            onChange={handleChange}
              placeholder={t("jobs.phone", "Teléfono *")}
            className="border border-wine/20 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose w-full"
            />
            <input
            name="correo"
            type="email"
            value={form.correo}
            onChange={handleChange}
            placeholder={t("jobs.email", "Correo electrónico *")}
            className="border border-wine/20 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose w-full"
            />
        </div>

          {/* Motivo */}
        <textarea
            name="motivo"
            value={form.motivo}
            onChange={handleChange}
            rows="3"
            placeholder={t("jobs.why", "¿Por qué te gustaría formar parte de la familia Petit? *")}
            className="border border-wine/20 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose w-full"
        ></textarea>

          {/* Experiencia */}
        <textarea
            name="experiencia"
            value={form.experiencia}
            onChange={handleChange}
            rows="3"
            placeholder={t("jobs.experience", "Cuéntanos brevemente sobre tu experiencia profesional *")}
            className="border border-wine/20 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose w-full"
        ></textarea>

          {/* Área de interés */}
        <div>
            <label className="font-semibold text-wine text-sm block mb-2">
              {t("jobs.area", "Área en la que te gustaría trabajar *")}
            </label>
            <div className="grid sm:grid-cols-2 gap-2">
            {areas.map((a) => (
                <label key={a} className="flex items-center gap-2 text-wineDark/80">
                <input
                    type="radio"
                    name="area"
                    value={a}
                    checked={form.area === a}
                    onChange={handleChange}
                    className="accent-red"
                />
                {a}
                </label>
            ))}
            </div>
        </div>

          {/* Sucursal */}
        <div>
            <label className="font-semibold text-wine text-sm block mb-2">
              {t("jobs.location", "¿Cuál de las sucursales te interesa? *")}
            </label>
            <div className="grid sm:grid-cols-2 gap-2">
            {sucursales.map((s) => (
                <label key={s} className="flex items-center gap-2 text-wineDark/80">
                <input
                    type="radio"
                    name="sucursal"
                    value={s}
                    checked={form.sucursal === s}
                    onChange={handleChange}
                    className="accent-red"
                />
                {s}
                </label>
            ))}
            </div>
        </div>

          {/* CV */}
        <label className="font-maison neue font-semibold text-wine text-sm block mb-2">
              {t("jobs.cv", "Compartenos tu CV (Este debe ser un PDF y no tener un peso superior a 10MB) *")}
            </label>
        <div className="flex flex-col sm:flex-row items-center gap-3">
            
            <input
            type="file"
            name="cv"
            accept=".pdf,.doc,.docx"
            onChange={handleChange}
            className="text-sm text-wineDark"
            />
            {form.cv && (
            <span className="text-xs text-wineDark/70 truncate">{form.cv.name}</span>
            )}
        </div>

          {/* Botón */}
        <button
            type="submit"
            disabled={sending}
            className={`w-full ${
            sending ? "bg-gray-400" : "bg-red"
            } text-cream font-maison neue font-semibold py-2 rounded-lg hover:opacity-90 transition`}
        >
            {sending ? t("jobs.sending", "Enviando...") : t("jobs.submit", "Enviar solicitud")}
        </button>
        </form>

        <p className="text-xs text-wineDark/50 mt-4 text-center">
        {t("jobs.privacy", "Tu información será tratada de forma confidencial y usada solo para fines de reclutamiento.")}
        </p>
    </section>
    </main>
)
}
