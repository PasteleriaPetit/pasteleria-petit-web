import { useEffect, useState, useRef } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { toast } from "react-toastify";

const PAGE_SIZE = 15;

export default function BolsaTrabajoAdmin() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [estados] = useState(["recibido", "en revisión", "entrevista", "rechazado", "contratado"]);
  const cursorRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "jobApplications"), orderBy("creadoEn", "desc"), limit(PAGE_SIZE));
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(arr);
      setLastVisible(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoading(false);
    }, (err) => {
      console.error(err);
      toast.error("No se pudo cargar");
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const loadMore = async () => {
    if (!lastVisible) return;
    const q = query(collection(db, "jobApplications"), orderBy("creadoEn", "desc"), startAfter(lastVisible), limit(PAGE_SIZE));
    const snap = await getDocs(q);
    const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setItems(prev => [...prev, ...arr]);
    setLastVisible(snap.docs[snap.docs.length - 1] || null);
    setHasMore(snap.docs.length === PAGE_SIZE);
  };

  const updateEstado = async (id, estado) => {
    try {
      await updateDoc(doc(db, "jobApplications", id), { estado });
      toast.success("Estado actualizado");
    } catch {
      toast.error("Error al actualizar estado");
    }
  };

  const remove = async (id) => {
    if (!confirm("¿Eliminar esta solicitud?")) return;
    try {
      await deleteDoc(doc(db, "jobApplications", id));
      toast.success("Eliminada correctamente");
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  const exportCSV = () => {
    const rows = items.map(i => ({
      nombre: i.nombre,
      correo: i.correo,
      telefono: i.telefono,
      area: i.area,
      sucursal: i.sucursal,
      estado: i.estado,
      creadoEn: i.creadoEn?.toDate ? i.creadoEn.toDate().toISOString() : "",
      cvUrl: i.cvUrl ?? ""
    }));
    const csv = [
      Object.keys(rows[0] || {}).join(","),
      ...rows.map(r => Object.values(r).map(v => `"${(v ?? "").toString().replace(/"/g,'""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `postulaciones_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const view = filter === "all" ? items : items.filter((i) => i.estado === filter);

  return (
    <main className="bg-cream min-h-screen pt-20 px-4 sm:px-6 lg:px-12 pb-10">
      <section className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-display text-3xl text-wine">Bolsa de trabajo (Admin)</h1>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="btn-outline text-wine">Exportar CSV</button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <label className="text-wineDark/80 font-medium">Filtro:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded px-3 py-2">
            <option value="all">Todos</option>
            {estados.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading && <p>Cargando...</p>}
        <div className="grid gap-4">
          {view.map((a) => (
            <article key={a.id} className="bg-white rounded-2xl shadow border p-5">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                  <h3 className="font-semibold text-wine text-lg">{a.nombre} · <span className="text-wineDark/70">{a.area}</span></h3>
                  <p className="text-sm text-wineDark/80">📧 {a.correo} · 📞 {a.telefono} · 🎂 {a.fechaNacimiento ?? "-"}</p>
                  <p className="text-sm text-wineDark/70 mt-2">🏠 {a.sucursal}</p>
                  {a.motivo && <p className="mt-2 text-sm text-wineDark/70">💬 {a.motivo}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {a.cvUrl && <a href={a.cvUrl} target="_blank" rel="noreferrer" className="text-red underline text-sm">Ver CV</a>}
                  <select value={a.estado} onChange={(e) => updateEstado(a.id, e.target.value)} className="border rounded px-2 py-1 text-sm">
                    {estados.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => remove(a.id)} className="text-red border px-3 py-1 rounded text-sm">Eliminar</button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          {hasMore ? <button onClick={loadMore} className="bg-rose px-4 py-2 rounded text-white">Cargar más</button> : <span className="text-sm text-wineDark/60">No hay más registros</span>}
        </div>
      </section>
    </main>
  );
}
