import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const strong = (pwd) => ({
  len: pwd.length >= 8,
  upper: /[A-Z]/.test(pwd),
  lower: /[a-z]/.test(pwd),
  num: /\d/.test(pwd),
  special: /[^A-Za-z0-9]/.test(pwd),
});

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const s = strong(form.password);
  const ok = s.len && s.upper && s.lower && s.num && s.special;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!ok) {
      toast.warning("La contraseña no cumple los requisitos.");
      return;
    }
    try {
      await register(form);
      toast.success("Cuenta creada. Revisa tu correo para verificarla ✉️");
    } catch (err) {
      console.error(err);
      toast.error("No se pudo registrar. Revisa los datos.");
    }
  };

  return (
    <main className="bg-cream min-h-[calc(100vh-80px)] pt-[88px] px-4 sm:px-6 lg:px-12 pb-6">
      <h1 className="font-display text-3xl text-wine mb-6">Crear cuenta</h1>
      <form onSubmit={onSubmit} className="bg-white border border-rose/30 rounded-2xl p-6 space-y-4">
        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Nombre completo"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Teléfono"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          className="w-full border rounded-lg px-3 py-2"
          type="email"
          placeholder="Correo"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <div className="relative">
          <input
            className="w-full border rounded-lg px-3 py-2 pr-10"
            type={showPwd ? "text" : "password"}
            placeholder="Contraseña"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-2.5 text-sm text-wine">
            {showPwd ? "🙈" : "👁️"}
          </button>
        </div>

        {/* Requisitos */}
        <div className="text-xs text-wineDark/80 grid grid-cols-2 gap-x-4 gap-y-1">
          <span className={s.len ? "text-green-700" : ""}>• 8+ caracteres</span>
          <span className={s.upper ? "text-green-700" : ""}>• Mayúscula</span>
          <span className={s.lower ? "text-green-700" : ""}>• Minúscula</span>
          <span className={s.num ? "text-green-700" : ""}>• Número</span>
          <span className={s.special ? "text-green-700" : ""}>• Símbolo</span>
        </div>

        <button
          disabled={!ok}
          className={`w-full ${ok ? "bg-red" : "bg-gray-400"} text-cream py-2 rounded-lg font-semibold`}
        >
          Crear cuenta
        </button>

        <p className="text-sm text-wineDark/70">
          ¿Ya tienes cuenta? <Link to="/login" className="text-red underline">Inicia sesión</Link>
        </p>
      </form>
    </main>
  );
}
