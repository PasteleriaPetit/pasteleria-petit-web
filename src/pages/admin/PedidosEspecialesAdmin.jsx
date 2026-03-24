// src/pages/admin/PedidosEspecialesAdmin.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { cld } from "../../utils/cloudinary";
import { useTranslation } from "react-i18next";

// Helpers i18n
const safeText = (v) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return v.es || v.en || "";
  return String(v);
};
const getES = (v) => (typeof v === "string" ? v : v?.es || "");
const getEN = (v) => (typeof v === "string" ? "" : v?.en || "");

// Subida a Cloudinary
const uploadToCloudinary = async (file) => {
  const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD;
  const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET;

  if (!CLOUD || !PRESET) {
    throw new Error("⚠️ Faltan variables de entorno para Cloudinary");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) throw new Error("Error subiendo imagen a Cloudinary");

  const data = await res.json();
  if (!data.secure_url) throw new Error("Respuesta inválida de Cloudinary");
  return data.secure_url;
};

const emptyForm = {
  titleEs: "",
  titleEn: "",
  descEs: "",
  descEn: "",
  category: "",
  price: "",
  img: "",
};

export default function PedidosEspecialesAdmin() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeLangTab, setActiveLangTab] = useState("es"); // ES | EN

  // 🔹 Claves de categoría (se traducen con i18n, igual que en la página pública)
  const categories = [
    "catego1",
    "catego2",
    "catego3",
    "catego4",
    "catego5",
    "catego6",
    "catego7",
  ];

  // Escuchar Firestore
  useEffect(() => {
    const colRef = collection(db, "pedidosEspeciales");
    const unsub = onSnapshot(colRef, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(docs);
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setFile(null);
    setPreview(null);
    setEditingId(null);
    setActiveLangTab("es");
  };

  // Guardar / actualizar
  const handleSave = async (e) => {
    e.preventDefault();

    try {
      if (!form.titleEs.trim()) {
        toast.warning("⚠️ Debes ingresar el nombre (ES) del producto.");
        return;
      }

      setUploading(true);

      let imageUrl = form.img || "";

      if (file) {
        imageUrl = await uploadToCloudinary(file);
      }

      if (!imageUrl) {
        imageUrl =
          "https://res.cloudinary.com/drdabinip/image/upload/v1/placeholder_petit.jpg";
      }

      const payload = {
        title: { es: form.titleEs.trim(), en: form.titleEn.trim() },
        desc: { es: form.descEs.trim(), en: form.descEn.trim() },
        name: form.titleEs.trim(),
        // 🔹 Guardamos la clave de categoría (catego1, catego2, etc.)
        category: form.category.trim(),
        price: form.price ? Number(form.price) : null,
        img: imageUrl,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "pedidosEspeciales", editingId), payload);
        toast.success("🎂 Producto actualizado con éxito");
      } else {
        await addDoc(collection(db, "pedidosEspeciales"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast.success("🎂 Producto agregado con éxito");
      }

      resetForm();
    } catch (err) {
      console.error("❌ Error guardando producto:", err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await deleteDoc(doc(db, "pedidosEspeciales", id));
      toast.info("🗑️ Producto eliminado");
      if (editingId === id) resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Error al eliminar");
    }
  };

  const handleEdit = (item) => {
    setForm({
      titleEs: getES(item.title) || item.name || "",
      titleEn: getEN(item.title),
      descEs: getES(item.desc) || item.desc || "",
      descEn: getEN(item.desc),
      category: item.category || "",
      price: item.price || "",
      img: item.img || "",
    });
    setEditingId(item.id);
    setPreview(item.img || null);
    setActiveLangTab("es");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  return (
    <main className="bg-cream min-h-screen px-4 sm:px-6 lg:px-12 pt-20 pb-10">
      {/* FORMULARIO */}
      <section className="max-w-3xl mx-auto bg-white border border-wineDark/30 rounded-2xl p-5 sm:p-6 shadow-sm mb-10">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="font-display text-2xl text-wine">
            {editingId ? "Editar producto" : "Nuevo producto especial"}
          </h2>
          <div className="ml-auto inline-flex rounded-lg overflow-hidden border border-wine/20">
            <button
              type="button"
              className={`px-3 py-1 text-sm ${
                activeLangTab === "es" ? "bg-rose/30 font-semibold" : "bg-white"
              }`}
              onClick={() => setActiveLangTab("es")}
            >
              ES
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-sm ${
                activeLangTab === "en" ? "bg-rose/30 font-semibold" : "bg-white"
              }`}
              onClick={() => setActiveLangTab("en")}
            >
              EN
            </button>
          </div>
        </div>

        <form className="space-y-3" onSubmit={handleSave}>
          {/* Nombre (según idioma) */}
          {activeLangTab === "es" ? (
            <input
              className="w-full border border-wine/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-wine/50"
              placeholder="Nombre del pastel (ES)"
              value={form.titleEs}
              onChange={(e) =>
                setForm((f) => ({ ...f, titleEs: e.target.value }))
              }
            />
          ) : (
            <input
              className="w-full border border-wine/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-wine/50"
              placeholder="Cake name (EN)"
              value={form.titleEn}
              onChange={(e) =>
                setForm((f) => ({ ...f, titleEn: e.target.value }))
              }
            />
          )}

          {/* Categoría (clave -> texto traducido) */}
          <select
            className="w-full border border-wine/20 rounded-lg px-3 py-2 text-sm text-wineDark focus:outline-none focus:ring-1 focus:ring-wine/50"
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
          >
            <option value="">Selecciona categoría</option>
            {categories.map((catKey) => (
              <option key={catKey} value={catKey}>
                {t(`special.${catKey}`, catKey)}
              </option>
            ))}
          </select>

          <input
            type="number"
            className="w-full border border-wine/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-wine/50"
            placeholder="Precio (opcional)"
            value={form.price}
            onChange={(e) =>
              setForm((f) => ({ ...f, price: e.target.value }))
            }
          />

          {/* Descripción según idioma */}
          {activeLangTab === "es" ? (
            <textarea
              className="w-full border border-wine/20 rounded-lg px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:ring-1 focus:ring-wine/50"
              rows={3}
              placeholder="Descripción del producto (ES)"
              value={form.descEs}
              onChange={(e) =>
                setForm((f) => ({ ...f, descEs: e.target.value }))
              }
            />
          ) : (
            <textarea
              className="w-full border border-wine/20 rounded-lg px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:ring-1 focus:ring-wine/50"
              rows={3}
              placeholder="Product description (EN)"
              value={form.descEn}
              onChange={(e) =>
                setForm((f) => ({ ...f, descEn: e.target.value }))
              }
            />
          )}

          {/* INPUT DE ARCHIVO CUSTOM */}
          <div className="space-y-2">
            <span className="block text-sm font-medium text-wine/80">
              Imagen
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="inline-flex items-center px-3 py-2 rounded-lg bg-red text-cream text-sm cursor-pointer hover:bg-red/90">
                Subir imagen
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <span className="text-xs text-wineDark/70 truncate max-w-[170px] sm:max-w-xs">
                {file?.name || "Ningún archivo seleccionado"}
              </span>
            </div>

            {preview && (
              <img
                src={preview}
                alt="preview"
                className="mt-2 w-full max-w-xs h-32 object-cover rounded-lg border border-rose/30"
              />
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={uploading}
              className={`w-full sm:w-auto ${
                uploading ? "bg-gray-400" : "bg-red"
              } text-cream px-5 py-2 rounded-lg font-semibold hover:opacity-90 transition`}
            >
              {uploading
                ? "Subiendo..."
                : editingId
                ? "Guardar cambios"
                : "Agregar"}
            </button>

            {editingId && (
              <button
                type="button"
                className="w-full sm:w-auto border border-wine/30 px-5 py-2 rounded-lg hover:bg-rose/20 transition"
                onClick={resetForm}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      {/* LISTADO */}
      <section className="max-w-5xl mx-auto">
        <h2 className="font-display text-2xl text-wine mb-4">Listado</h2>
        <div className="grid gap-4">
          {items.map((p) => {
            const title = safeText(p.title) || p.name || "";
            const desc = safeText(p.desc);
            return (
              <div
                key={p.id}
                className="bg-cream border border-wineDark/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm"
              >
                {p.img && (
                  <img
                    src={cld(p.img, { w: 160, h: 160 })}
                    alt={title}
                    className="w-24 h-24 object-cover rounded-lg border flex-shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-wine break-words">
                    {title}
                    {p.price && (
                      <span className="text-wineDark/60"> — ${p.price}</span>
                    )}
                  </div>
                  <div className="text-sm text-wineDark/70 break-words mt-1">
                    {/* categoría traducida */}
                    {p.category &&
                      `${t(`special.${p.category}`, p.category)} — `}

                    {desc}
                  </div>
                </div>

                <div className="flex gap-2 mt-2 sm:mt-0">
                  <button
                    className="border border-wine/30 px-3 py-1 rounded-lg text-sm hover:bg-rose/20"
                    onClick={() => handleEdit(p)}
                  >
                    Editar
                  </button>

                  <button
                    className="border border-wine/30 px-3 py-1 rounded-lg text-sm hover:bg-rose/20 text-red-600"
                    onClick={() => handleDelete(p.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
