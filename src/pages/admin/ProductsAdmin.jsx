import React, { useEffect, useMemo, useState } from "react";
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

// ===== Helpers i18n =====
const safeText = (v) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return v.es || v.en || "";
  return String(v);
};
const getES = (v) => (typeof v === "string" ? v : v?.es || "");
const getEN = (v) => (typeof v === "string" ? "" : v?.en || "");

// ===== Cloudinary =====
const uploadToCloudinary = async (file) => {
  const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD;
  const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET;
  if (!CLOUD || !PRESET) throw new Error("⚠️ Faltan variables de entorno de Cloudinary");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Error subiendo imagen a Cloudinary");
  const data = await res.json();
  return data.secure_url;
};

// ===== Categorías =====
const CATEGORIES = [
  { key: "productsChoco", labelEs: "Chocolate" },
  { key: "productsVainilla", labelEs: "Vainilla" },
  { key: "productsQueso", labelEs: "Queso" },
  { key: "productsTresLeches", labelEs: "Tres Leches" },
  { key: "productsCafe", labelEs: "Café" },
  { key: "productsClasico", labelEs: "Clásico" },
  { key: "productsGelatina", labelEs: "Gelatina" },
  { key: "productsAzucar", labelEs: "Sin azúcar" },
  { key: "productsPanaderia", labelEs: "Panadería" },
  { key: "productsReposteria", labelEs: "Repostería" },
  { key: "productsVelas", labelEs: "Velas" },
  { key: "productsPedidos", labelEs: "Solo por pedido" },
  { key: "productsGalleteria", labelEs: "Galletería" },
];

const labelFromKey = (key) => CATEGORIES.find((c) => c.key === key)?.labelEs || "";

// ===== Util: normalizar precios =====
const normalizePrices = (prices) => {
  if (!Array.isArray(prices)) return [];
  return prices
    .map((p) => ({
      label: String(p?.label || "").trim(),
      amount: Number(p?.amount),
    }))
    .filter((p) => p.label && Number.isFinite(p.amount) && p.amount > 0);
};

// Detecta priceUnit/priceKilo desde variantes (si existen)
const inferLegacyPrices = (prices) => {
  // Busca etiquetas tipo: Pieza, Unit, Pastel completo, etc.
  const unitRegex = /(pieza|unit|completo|pastel)/i;
  const kiloRegex = /(kilo|kg)/i;

  const priceUnit = prices.find((p) => unitRegex.test(p.label))?.amount ?? null;
  const priceKilo = prices.find((p) => kiloRegex.test(p.label))?.amount ?? null;

  return {
    priceUnit: Number.isFinite(priceUnit) ? priceUnit : null,
    priceKilo: Number.isFinite(priceKilo) ? priceKilo : null,
  };
};

// ===== Componente =====
export default function ProductsAdmin() {
  const [items, setItems] = useState([]);

  // Form bilingüe + precios flexibles
  const [form, setForm] = useState({
    titleEs: "",
    titleEn: "",
    descEs: "",
    descEn: "",
    categoryKey: "",
    img: "",
    prices: [
      { label: "Pieza", amount: "" }, // default útil
    ],
  });

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [activeLangTab, setActiveLangTab] = useState("es");

  // Listado en vivo
  useEffect(() => {
    const refCol = collection(db, "products");
    const unsub = onSnapshot(refCol, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ===== Validación =====
  const validate = () => {
    if (!form.titleEs.trim()) {
      toast.warning("⚠️ El producto debe tener un título (ES).");
      return false;
    }
    if (!form.categoryKey) {
      toast.warning("⚠️ Selecciona una categoría.");
      return false;
    }

    const prices = normalizePrices(form.prices);
    if (prices.length === 0) {
      toast.warning("⚠️ Agrega al menos una variante de precio válida.");
      return false;
    }

    // Evitar etiquetas repetidas
    const labels = prices.map((p) => p.label.toLowerCase());
    const unique = new Set(labels);
    if (unique.size !== labels.length) {
      toast.warning("⚠️ No repitas etiquetas de precio (ej. dos 'Rebanada').");
      return false;
    }

    return true;
  };

  // ===== Acciones precios dinámicos =====
  const addPriceRow = () => {
    setForm((prev) => ({
      ...prev,
      prices: [...prev.prices, { label: "", amount: "" }],
    }));
  };

  const removePriceRow = (idx) => {
    setForm((prev) => ({
      ...prev,
      prices: prev.prices.filter((_, i) => i !== idx),
    }));
  };

  const updatePriceRow = (idx, patch) => {
    setForm((prev) => ({
      ...prev,
      prices: prev.prices.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));
  };

  // ===== Guardar =====
  const save = async () => {
    try {
      if (!validate()) return;
      setUploading(true);

      let imageUrl = form.img || "";
      if (file) imageUrl = await uploadToCloudinary(file);
      if (!imageUrl) {
        imageUrl = "https://res.cloudinary.com/drdabinip/image/upload/v1/placeholder_petit.jpg";
      }

      const pricesNormalized = normalizePrices(form.prices);

      // Mantener compatibilidad:
      // si hay prices[] -> inferimos priceUnit/priceKilo (opcional)
      const legacy = inferLegacyPrices(pricesNormalized);

      const payload = {
        title: { es: form.titleEs.trim(), en: form.titleEn.trim() },
        desc: { es: form.descEs.trim(), en: form.descEn.trim() },
        categoryKey: form.categoryKey || "",
        category: labelFromKey(form.categoryKey),
        img: imageUrl,

        // ✅ NUEVO
        prices: pricesNormalized,

        // ✅ LEGACY (para que nada se rompa en otras partes)
        priceUnit: legacy.priceUnit, // puede quedar null si no existe etiqueta de unit
        priceKilo: legacy.priceKilo, // puede quedar null

        updatedAt: serverTimestamp(),
        ...(editingId ? {} : { createdAt: serverTimestamp() }),
      };

      if (editingId) {
        await updateDoc(doc(db, "products", editingId), payload);
        toast.success("✏️ Producto actualizado con éxito");
      } else {
        await addDoc(collection(db, "products"), payload);
        toast.success("✅ Producto agregado con éxito");
      }

      resetForm();
    } catch (err) {
      console.error("❌ Error guardando producto:", err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // ===== Reset =====
  const resetForm = () => {
    setForm({
      titleEs: "",
      titleEn: "",
      descEs: "",
      descEn: "",
      categoryKey: "",
      img: "",
      prices: [{ label: "Pieza", amount: "" }],
    });
    setFile(null);
    setPreview(null);
    setEditingId(null);
    setActiveLangTab("es");
  };

  // ===== Eliminar =====
  const confirmDelete = (product) => {
    setProductToDelete(product);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteDoc(doc(db, "products", productToDelete.id));
      const name = safeText(productToDelete.title);
      toast.success(`🗑️ Producto "${name}" eliminado`);
    } catch (err) {
      console.error("Error eliminando producto:", err);
      toast.error("❌ No se pudo eliminar el producto");
    } finally {
      setConfirmOpen(false);
      setProductToDelete(null);
    }
  };

  const headerTitle = useMemo(() => (editingId ? "Editar producto" : "Nuevo producto"), [editingId]);

  return (
    <main className="bg-cream min-h-screen py-6">
      <div className="max-w-5xl mx-auto bg-cream p-4 sm:p-6 rounded-2xl shadow space-y-8">
        <h1 className="font-display text-3xl text-wine">Administrar Pastelería</h1>

        {/* Formulario */}
        <section className="bg-white border border-rose/30 rounded-xl p-4 sm:p-6 grid gap-4">
          {/* Tabs idioma */}
          <div className="flex items-center gap-2">
            <span className="font-display text-xl text-wine">{headerTitle}</span>
            <div className="ml-auto inline-flex rounded-lg overflow-hidden border border-wine/20">
              <button
                type="button"
                className={`px-3 py-1 text-sm ${activeLangTab === "es" ? "bg-rose/30 font-semibold" : "bg-white"}`}
                onClick={() => setActiveLangTab("es")}
              >
                ES
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-sm ${activeLangTab === "en" ? "bg-rose/30 font-semibold" : "bg-white"}`}
                onClick={() => setActiveLangTab("en")}
              >
                EN
              </button>
            </div>
          </div>

          {/* Campos idioma */}
          {activeLangTab === "es" ? (
            <>
              <input
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Nombre (ES)"
                value={form.titleEs}
                onChange={(e) => setForm({ ...form, titleEs: e.target.value })}
              />
              <textarea
                className="border rounded-lg px-3 py-2 w-full"
                rows={3}
                placeholder="Descripción (ES)"
                value={form.descEs}
                onChange={(e) => setForm({ ...form, descEs: e.target.value })}
              />
            </>
          ) : (
            <>
              <input
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Name (EN)"
                value={form.titleEn}
                onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
              />
              <textarea
                className="border rounded-lg px-3 py-2 w-full"
                rows={3}
                placeholder="Description (EN)"
                value={form.descEn}
                onChange={(e) => setForm({ ...form, descEn: e.target.value })}
              />
            </>
          )}

          {/* Categoría */}
          <select
            className="border rounded-lg px-3 py-2 w-full"
            value={form.categoryKey}
            onChange={(e) => setForm({ ...form, categoryKey: e.target.value })}
          >
            <option value="">Selecciona categoría</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.labelEs}
              </option>
            ))}
          </select>

          {/* ✅ Variantes de precio (Opción B) */}
          <div className="border border-rose/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold text-wine">Variantes de precio</h3>
              <button
                type="button"
                onClick={addPriceRow}
                className="ml-auto bg-red text-cream px-3 py-1 rounded-lg hover:opacity-90 transition"
              >
                + Agregar variante
              </button>
            </div>

            <div className="grid gap-2">
              {form.prices.map((row, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_140px_44px] gap-2 items-center">
                  <input
                    className="border rounded-lg px-3 py-2 w-full"
                    placeholder='Ej. "Rebanada", "Caja 6", "300 g", "Pastel completo"'
                    value={row.label}
                    onChange={(e) => updatePriceRow(idx, { label: e.target.value })}
                  />
                  <input
                    type="number"
                    className="border rounded-lg px-3 py-2 w-full"
                    placeholder="Precio"
                    value={row.amount}
                    onChange={(e) => updatePriceRow(idx, { amount: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removePriceRow(idx)}
                    className="border border-red text-red rounded-lg h-[42px] hover:bg-red/10 transition"
                    title="Eliminar variante"
                    disabled={form.prices.length === 1}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xs text-wineDark/70 mt-2">
              Tip: Si agregas una variante con etiqueta “Kilo” o “Kg”, el sistema podrá inferir <em>priceKilo</em>.
              Si agregas “Pieza / Pastel / Completo”, podrá inferir <em>priceUnit</em>.
            </p>
          </div>

          {/* Imagen */}
          <input
            type="file"
            accept="image/*"
            className="block w-full text-sm text-wineDark
              file:mr-3 file:py-2 file:px-3
              file:rounded-md file:border-0
              file:bg-red file:text-cream
              hover:file:bg-red/80"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFile(f || null);
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />

          {(preview || form.img) && (
            <img
              src={preview || cld(form.img, { w: 900, h: 675, ar: "4:3", fit: "fill", g: "auto" })}
              alt="preview"
              className="w-full aspect-[4/3] object-cover rounded-lg border bg-cream"
            />
          )}

          {/* Acciones */}
          <div className="flex flex-wrap gap-3">
            <button
              disabled={uploading}
              onClick={save}
              className={`${uploading ? "bg-gray-400" : "bg-red"} text-cream px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition`}
            >
              {uploading ? "Subiendo..." : editingId ? "Guardar cambios" : "Agregar"}
            </button>
            {editingId && (
              <button
                className="px-6 py-2 rounded-lg border border-rose hover:bg-rose/10"
                onClick={resetForm}
              >
                Cancelar
              </button>
            )}
          </div>
        </section>

        {/* Listado */}
        <section>
          <h2 className="font-display text-2xl text-wine mb-4">Listado</h2>
          <div className="grid gap-4">
            {items.map((p) => {
              const titleEs = safeText(p.title);
              const descEs = safeText(p.desc);
              const catLabel = p.category || labelFromKey(p.categoryKey) || "";

              const prices = Array.isArray(p.prices) ? p.prices : [];
              const pricesPreview =
                prices.length > 0
                  ? prices.slice(0, 3).map((x) => `${x.label}: $${x.amount}`).join(" · ")
                  : `Pieza: $${p.priceUnit ?? "—"} · Kilo: ${p.priceKilo ? `$${p.priceKilo}` : "—"}`;

              return (
                <div
                  key={p.id}
                  className="bg-white border border-wine/20 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-wine break-words">{titleEs}</h3>
                    <p className="text-sm text-wineDark/70 break-words">{descEs}</p>
                    <p className="text-xs text-wineDark/60 mt-1">{catLabel}</p>
                    <p className="text-xs text-wineDark/70 mt-2">{pricesPreview}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 rounded border border-rose hover:bg-rose/10"
                      onClick={() => {
                        // editar: normaliza precios desde prices[] o legacy
                        const normalizedFromDoc =
                          Array.isArray(p.prices) && p.prices.length
                            ? p.prices.map((x) => ({ label: x.label || "", amount: x.amount ?? "" }))
                            : [
                                { label: "Pieza", amount: p.priceUnit ?? "" },
                                ...(p.priceKilo ? [{ label: "Kilo", amount: p.priceKilo }] : []),
                              ];

                        setForm({
                          titleEs: getES(p.title),
                          titleEn: getEN(p.title),
                          descEs: getES(p.desc),
                          descEn: getEN(p.desc),
                          categoryKey: p.categoryKey || "",
                          img: p.img || "",
                          prices: normalizedFromDoc.length ? normalizedFromDoc : [{ label: "Pieza", amount: "" }],
                        });

                        setEditingId(p.id);
                        setPreview(p.img || null);
                        setActiveLangTab("es");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Editar
                    </button>

                    <button
                      className="px-3 py-1 rounded border border-red text-red hover:bg-red/10"
                      onClick={() => confirmDelete(p)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Modal confirmación */}
        {confirmOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-3">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-lg">
              <h3 className="text-lg font-semibold text-wine mb-4">¿Eliminar producto?</h3>
              <p className="text-sm text-wineDark mb-6 break-words">
                Estás a punto de eliminar <strong>{safeText(productToDelete?.title)}</strong>. Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 rounded-lg border border-wine/30 hover:bg-rose/20"
                  onClick={() => setConfirmOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-red text-cream hover:opacity-90"
                  onClick={handleDelete}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
