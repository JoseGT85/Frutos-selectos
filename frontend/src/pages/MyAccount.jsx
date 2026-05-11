import React from "react";
import { useAuth } from "@/store/auth";
import { Link } from "react-router-dom";
import { User, Package } from "lucide-react";

const MyAccount = () => {
  const { user } = useAuth();
  if (!user) return <div className="p-12 text-center"><Link to="/login" className="text-[#C35214]">Iniciá sesión</Link></div>;

  return (
    <main className="px-6 md:px-12 py-12 max-w-4xl mx-auto" data-testid="my-account-page">
      <p className="text-overline text-[#C35214] mb-3">Mi cuenta</p>
      <h1 className="font-serif text-5xl mb-8">Hola, {user.name?.split(" ")[0]}</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-[#2C1E16]/10 p-6">
          <User size={24} className="text-[#C35214] mb-4" />
          <h2 className="font-serif text-2xl mb-3">Datos personales</h2>
          <p className="text-sm text-[#5D4B41]">Email: {user.email}</p>
          <p className="text-sm text-[#5D4B41]">Teléfono: {user.phone || "—"}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#2C1E16]/10 p-6">
          <Package size={24} className="text-[#C35214] mb-4" />
          <h2 className="font-serif text-2xl mb-3">Mis pedidos</h2>
          <p className="text-sm text-[#5D4B41]">Próximamente podrás ver el historial completo de tus pedidos.</p>
        </div>
      </div>
    </main>
  );
};

export default MyAccount;
