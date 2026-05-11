import React from "react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="bg-[#2C1E16] text-[#F9F6F0] mt-32" data-testid="footer">
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
      <div className="md:col-span-2">
        <h3 className="text-3xl font-serif mb-3">
          Frutos Secos<span className="text-[#D97742]">.</span>
        </h3>
        <p className="text-[#F9F6F0]/70 text-sm leading-relaxed max-w-md">
          Calidad premium directo del productor a tu mesa. Envíos a todo Argentina con la garantía
          de frescura y selección artesanal.
        </p>
      </div>
      <div>
        <p className="text-overline text-[#D4AF37] mb-4">Tienda</p>
        <ul className="space-y-2 text-sm text-[#F9F6F0]/80">
          <li><Link to="/catalogo">Catálogo</Link></li>
          <li><Link to="/catalogo?category=mix">Mix premium</Link></li>
          <li><Link to="/catalogo?category=frutas-deshidratadas">Frutas deshidratadas</Link></li>
        </ul>
      </div>
      <div>
        <p className="text-overline text-[#D4AF37] mb-4">Contacto</p>
        <ul className="space-y-2 text-sm text-[#F9F6F0]/80">
          <li>ventas@frutossecos.com.ar</li>
          <li>+54 11 0000-0000</li>
          <li>Buenos Aires, Argentina</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-white/10 py-6 text-center text-xs text-[#F9F6F0]/50">
      © {new Date().getFullYear()} Frutos Secos Premium · Hecho con 🌰 en Argentina
    </div>
  </footer>
);

export default Footer;
