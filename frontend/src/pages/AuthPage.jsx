import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { Mail, Lock, User, Phone } from "lucide-react";

const AuthPage = ({ mode }) => {
  const isLogin = mode === "login";
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let user;
      if (isLogin) user = await login(form.email, form.password);
      else user = await register(form);
      navigate(user?.role === "admin" ? "/admin" : "/mi-cuenta");
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === "string" ? d : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="px-6 py-20 max-w-md mx-auto" data-testid={`${mode}-page`}>
      <div className="bg-white rounded-2xl p-8 border border-[#2C1E16]/10">
        <p className="text-overline text-[#C35214] mb-3">{isLogin ? "Bienvenido de vuelta" : "Crear cuenta"}</p>
        <h1 className="font-serif text-4xl mb-8 text-[#2C1E16]">{isLogin ? "Ingresá" : "Sumate"}</h1>

        <form onSubmit={submit} className="space-y-4">
          {!isLogin && (
            <Field icon={<User size={16} />} label="Nombre completo" value={form.name} onChange={(v) => set("name", v)} required testid="auth-name" />
          )}
          <Field icon={<Mail size={16} />} label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} required testid="auth-email" />
          {!isLogin && (
            <Field icon={<Phone size={16} />} label="Teléfono" value={form.phone} onChange={(v) => set("phone", v)} testid="auth-phone" />
          )}
          <Field icon={<Lock size={16} />} label="Contraseña" type="password" value={form.password} onChange={(v) => set("password", v)} required testid="auth-password" />

          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl" data-testid="auth-error">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C35214] hover:bg-[#A64B29] text-white py-3.5 rounded-full font-medium disabled:opacity-60 transition-all"
            data-testid="auth-submit"
          >
            {loading ? "..." : isLogin ? "Ingresar" : "Crear cuenta"}
          </button>
        </form>

        <p className="text-sm text-center text-[#5D4B41] mt-6">
          {isLogin ? "¿No tenés cuenta? " : "¿Ya tenés cuenta? "}
          <Link to={isLogin ? "/registro" : "/login"} className="text-[#C35214] font-medium hover:underline" data-testid="auth-switch-link">
            {isLogin ? "Registrate" : "Ingresá"}
          </Link>
        </p>
      </div>
    </main>
  );
};

const Field = ({ icon, label, value, onChange, type = "text", required, testid }) => (
  <div>
    <label className="text-overline text-[#5D4B41] block mb-2">{label}</label>
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#968B83]">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#2C1E16]/15 bg-white outline-none focus:ring-2 focus:ring-[#C35214]/30"
        data-testid={testid}
      />
    </div>
  </div>
);

export default AuthPage;
