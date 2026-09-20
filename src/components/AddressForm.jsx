import React, { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../auth/AuthProvider";
import { required, isValidPostalCodeMX, isValidPhoneMX } from "../utils/mx-address";

export default function AddressForm({ onSelected }) {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [useNew, setUseNew] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    street: "",
    extNumber: "",
    intNumber: "",
    neighborhood: "",
    postalCode: "",
    city: "",
    state: "",
    country: "México",
    references: "",
  });
  const [errors, setErrors] = useState({});

  // Cargar direcciones guardadas del usuario
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const q = query(collection(db, `users/${user.uid}/addresses`));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setList(data);
      if (data.length > 0) {
        setUseNew(false);
        setSelectedAddressId(data[0].id);
        onSelected?.(data[0]);
      } else {
        setUseNew(true);
        setSelectedAddressId("");
        onSelected?.(null);
      }

      setLoading(false);
    })();
  }, [user]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const validate = () => {
    const e = {};
    if (!required(form.fullName)) e.fullName = "Requerido";
    if (!isValidPhoneMX(form.phone)) e.phone = "Teléfono inválido";
    if (!required(form.street)) e.street = "Requerido";
    if (!required(form.extNumber)) e.extNumber = "Requerido";
    if (!required(form.neighborhood)) e.neighborhood = "Requerido";
    if (!isValidPostalCodeMX(form.postalCode)) e.postalCode = "CP inválido (5 dígitos)";
    if (!required(form.city)) e.city = "Requerido";
    if (!required(form.state)) e.state = "Requerido";
    if (!required(form.country)) e.country = "Requerido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!user) return;
    if (!validate()) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, `users/${user.uid}/addresses`), {
        ...form,
        createdAt: new Date(),
      });
      const saved = { id: ref.id, ...form };

      setList(prev => [saved, ...prev]);
      setUseNew(false);
      setSelectedAddressId(saved.id);

      onSelected?.(saved);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return <div className="p-4 border rounded-md text-wineDark/80">Inicia sesión para capturar tu dirección.</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-rose/30 p-4 shadow-sm">
      <h3 className="text-wine text-lg font-semibold mb-3">Dirección de envío</h3>

      {/* Selector de direcciones existentes */}
      {!loading && list.length > 0 && (
        <div className="mb-4">
          <label className="text-sm text-wineDark/80 mb-1 block">Seleccionar una dirección guardada</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            value={useNew ? "" : selectedAddressId}
            onChange={(e) => {
              const id = e.target.value;

              if (!id) {
                setUseNew(true);
                setSelectedAddressId("");
                onSelected?.(null);
                return;
              }

              const found = list.find(
                (address) => address.id === id
              );

              if (found) {
                setUseNew(false);
                setSelectedAddressId(id);
                onSelected?.(found);
              }
            }}
          >
            <option value="">— Nueva dirección —</option>
            {list.map(a => (
              <option key={a.id} value={a.id}>
                {a.fullName} · {a.street} {a.extNumber}, {a.neighborhood}, CP {a.postalCode}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Formulario de nueva dirección */}
      {useNew && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm">Nombre completo</label>
              <input className="w-full border rounded-md px-3 py-2" value={form.fullName} onChange={e=>set("fullName", e.target.value)} />
              {errors.fullName && <p className="text-red text-xs mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <label className="block text-sm">Teléfono</label>
              <input className="w-full border rounded-md px-3 py-2" value={form.phone} onChange={e=>set("phone", e.target.value)} />
              {errors.phone && <p className="text-red text-xs mt-1">{errors.phone}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm">Calle</label>
              <input className="w-full border rounded-md px-3 py-2" value={form.street} onChange={e=>set("street", e.target.value)} />
              {errors.street && <p className="text-red text-xs mt-1">{errors.street}</p>}
            </div>

            <div>
              <label className="block text-sm">Núm. exterior</label>
              <input className="w-full border rounded-md px-3 py-2" value={form.extNumber} onChange={e=>set("extNumber", e.target.value)} />
              {errors.extNumber && <p className="text-red text-xs mt-1">{errors.extNumber}</p>}
            </div>
            <div>
              <label className="block text-sm">Núm. interior (opcional)</label>
              <input className="w-full border rounded-md px-3 py-2" value={form.intNumber} onChange={e=>set("intNumber", e.target.value)} />
            </div>

            <div>
              <label className="block text-sm">Colonia</label>
              <input className="w-full border rounded-md px-3 py-2" value={form.neighborhood} onChange={e=>set("neighborhood", e.target.value)} />
              {errors.neighborhood && <p className="text-red text-xs mt-1">{errors.neighborhood}</p>}
            </div>
            <div>
              <label className="block text-sm">Código Postal</label>
              <input className="w-full border rounded-md px-3 py-2" value={form.postalCode} onChange={e=>set("postalCode", e.target.value)} />
              {errors.postalCode && <p className="text-red text-xs mt-1">{errors.postalCode}</p>}
            </div>

            <div>
              <label className="block text-sm">Ciudad</label>
              <input className="w-full border rounded-md px-3 py-2" value={form.city} onChange={e=>set("city", e.target.value)} />
              {errors.city && <p className="text-red text-xs mt-1">{errors.city}</p>}
            </div>
            <div>
              <label className="block text-sm">Estado</label>
              <input className="w-full border rounded-md px-3 py-2" value={form.state} onChange={e=>set("state", e.target.value)} />
              {errors.state && <p className="text-red text-xs mt-1">{errors.state}</p>}
            </div>

            <div>
              <label className="block text-sm">País</label>
              <input className="w-full border rounded-md px-3 py-2" value={form.country} onChange={e=>set("country", e.target.value)} />
              {errors.country && <p className="text-red text-xs mt-1">{errors.country}</p>}
            </div>
            <div>
              <label className="block text-sm">Referencias (opcional)</label>
              <input className="w-full border rounded-md px-3 py-2" value={form.references} onChange={e=>set("references", e.target.value)} />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="bg-wine text-cream px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar y usar"}
            </button>
            <button
              onClick={() => {
                if (list.length > 0) {
                  setUseNew(false);

                  const fallback =
                    list.find(
                      (address) =>
                        address.id === selectedAddressId
                    ) || list[0];

                  setSelectedAddressId(fallback.id);
                  onSelected?.(fallback);
                }
              }}
              className="border border-wine text-wine px-4 py-2 rounded-lg hover:bg-rose/20"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
