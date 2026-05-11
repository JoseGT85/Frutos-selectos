import React from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

const Footer = () => (
  <footer style={{ backgroundColor: "var(--text-primary)", color: "var(--text-inverse)" }} data-testid="footer">
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 grid grid-cols-1 md:grid-cols-4 gap-10">
      <div className="md:col-span-2">
        <h3 className="text-3xl font-serif mb-3">
          Frutos<span style={{ color: "var(--terracotta)" }}>Selectos</span>
        </h3>
        <p className="flex items-center gap-1 text-overline mb-4" style={{ color: "var(--gold)" }}>
          <MapPin size={11} /> Mendoza · Argentina
        </p>
        <p className="text-sm leading-relaxed max-w-md" style={{ color: "color-mix(in srgb, var(--text-inverse) 70%, transparent)" }}>
          Calidad premium directo del productor mendocino a tu mesa.
          Envíos a todo Argentina con la garantía de frescura y selección artesanal.
        </p>
      </div>
      <div>
        <p className="text-overline mb-4" style={{ color: "var(--gold)" }}>Tienda</p>
        <ul className="space-y-2 text-sm" style={{ color: "color-mix(in srgb, var(--text-inverse) 80%, transparent)" }}>
          <li><Link to="/catalogo" className="link-fancy">Catálogo</Link></li>
          <li><Link to="/catalogo?category=mixs" className="link-fancy">Mixs premium</Link></li>
          <li><Link to="/catalogo?category=frutas-deshidratadas" className="link-fancy">Frutas deshidratadas</Link></li>
        </ul>
      </div>
      <div>
        <p className="text-overline mb-4" style={{ color: "var(--gold)" }}>Contacto</p>
        <ul className="space-y-2 text-sm" style={{ color: "color-mix(in srgb, var(--text-inverse) 80%, transparent)" }}>
          <li>ventas@frutosselectos.com.ar</li>
          <li>+54 261 0000-0000</li>
          <li>Mendoza, Argentina</li>
        </ul>
      </div>
    </div>
    <div className="border-t py-6 text-center text-xs" style={{ borderColor: "rgba(255,255,255,0.1)", color: "color-mix(in srgb, var(--text-inverse) 50%, transparent)" }}>
      © {new Date().getFullYear()} Frutos Selectos · Hecho con 🌰 en Mendoza
    </div>
  </footer>
);

export default Footer;
