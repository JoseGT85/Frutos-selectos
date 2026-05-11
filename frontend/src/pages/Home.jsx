import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Truck, Shield, Sparkles, MessageCircle, MapPin } from "lucide-react";
import api, { formatARS } from "@/lib/api";

const Home = () => {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api.get("/products?featured=true").then((r) => setFeatured(r.data.slice(0, 6))).catch(() => {});
  }, []);

  return (
    <main data-testid="home-page" style={{ backgroundColor: "var(--bg-default)", color: "var(--text-primary)" }}>
      {/* HERO — Layout asimétrico distintivo */}
      <section className="relative min-h-[92vh] px-6 md:px-12 grain overflow-hidden flex items-center">
        {/* Blobs decorativos */}
        <div className="blob" style={{ background: "var(--terracotta)", width: 500, height: 500, top: -100, left: -100 }} />
        <div className="blob" style={{ background: "var(--gold)", width: 400, height: 400, bottom: -100, right: -50, opacity: 0.25 }} />

        <div className="relative z-10 max-w-7xl mx-auto w-full py-20 grid md:grid-cols-12 gap-8 items-center">
          {/* Texto izquierda — columna mayor */}
          <div className="md:col-span-7 fade-up">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-12" style={{ backgroundColor: "var(--primary)" }} />
              <span className="text-overline" style={{ color: "var(--primary)" }}>Frutos Selectos</span>
              <span className="text-overline flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                <MapPin size={11} /> Mendoza · Argentina
              </span>
            </div>

            <h1 className="font-serif text-[2.8rem] md:text-[5.5rem] leading-[0.95] tracking-tight mb-8" style={{ color: "var(--text-primary)" }}>
              La naturaleza<br />
              en su forma<br />
              <span className="italic" style={{ color: "var(--primary)" }}>más pura.</span>
            </h1>

            <p className="text-lg md:text-xl max-w-xl mb-10 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Almendras, nueces, pistachos y mixes seleccionados directo del productor mendocino.
              Envíos a todo el país con la frescura que merece tu mesa.
            </p>

            <div className="flex flex-wrap gap-4 fade-up-2">
              <Link
                to="/catalogo"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-medium transition-all hover:-translate-y-1"
                style={{ backgroundColor: "var(--primary)", color: "#fff" }}
                data-testid="hero-cta-shop"
              >
                Comprar ahora
                <ArrowRight size={16} />
              </Link>
              <a
                href="#beneficios"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-medium transition-all border"
                style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}
                data-testid="hero-cta-info"
              >
                Cómo funciona
              </a>
            </div>
          </div>

          {/* Imagen derecha — columna menor con composición editorial */}
          <div className="md:col-span-5 relative fade-up-3 hidden md:block">
            <div className="aspect-[3/4] rounded-3xl overflow-hidden relative" style={{ backgroundColor: "var(--bg-alt)" }}>
              <img
                src="https://images.unsplash.com/photo-1608797178974-15b35a64ede9?w=900&q=85"
                alt="Almendras premium"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Tarjeta flotante */}
            <div
              className="absolute -bottom-6 -left-6 px-6 py-4 rounded-2xl shadow-2xl fade-up-4"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", borderWidth: 1 }}
            >
              <div className="text-overline mb-1" style={{ color: "var(--primary)" }}>Cosecha 2026</div>
              <div className="font-serif text-2xl" style={{ color: "var(--text-primary)" }}>Calidad de origen</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Directo del productor</div>
            </div>
          </div>
        </div>

        {/* Marquee discreto en parte inferior */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden py-4 border-t" style={{ borderColor: "var(--border)", backgroundColor: "color-mix(in srgb, var(--bg-alt) 60%, transparent)" }}>
          <div className="flex marquee-track whitespace-nowrap text-overline" style={{ color: "var(--text-muted)" }}>
            {[..."Almendra Non Pareil · Nuez Mariposa · Pistacho Premium · Castaña de Cajú · Dátiles Medjoul · Mix Premium · Arándanos · Coco Rallado · ".repeat(4)].map((_, i, arr) => null) || null}
            <span>Almendra Non Pareil · Nuez Mariposa · Pistacho Premium · Castaña de Cajú · Dátiles Medjoul · Mix Premium · Arándanos · Coco Rallado &nbsp;·&nbsp;</span>
            <span>Almendra Non Pareil · Nuez Mariposa · Pistacho Premium · Castaña de Cajú · Dátiles Medjoul · Mix Premium · Arándanos · Coco Rallado &nbsp;·&nbsp;</span>
            <span>Almendra Non Pareil · Nuez Mariposa · Pistacho Premium · Castaña de Cajú · Dátiles Medjoul · Mix Premium · Arándanos · Coco Rallado &nbsp;·&nbsp;</span>
          </div>
        </div>
      </section>

      {/* BENEFICIOS — Bento asimétrico */}
      <section id="beneficios" className="py-24 md:py-36 px-6 md:px-12" style={{ backgroundColor: "var(--bg-alt)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-12 gap-6 mb-16 items-end">
            <div className="md:col-span-7">
              <p className="text-overline mb-4" style={{ color: "var(--primary)" }}>Por qué elegirnos</p>
              <h2 className="font-serif text-4xl md:text-6xl leading-tight" style={{ color: "var(--text-primary)" }}>
                Compra simple.<br /><span className="italic">Calidad sin concesiones.</span>
              </h2>
            </div>
            <div className="md:col-span-5">
              <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Pensamos cada detalle para que comprar frutos secos premium sea tan placentero
                como degustarlos.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-12 gap-4">
            {/* Tarjeta grande */}
            <div
              className="md:col-span-7 p-10 rounded-3xl flex flex-col justify-between min-h-[280px] border"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
              data-testid="benefit-card-shipping"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--primary)", color: "#fff" }}>
                <Truck size={26} />
              </div>
              <div>
                <h3 className="font-serif text-3xl mb-3" style={{ color: "var(--text-primary)" }}>Envío gratis en tu primera compra</h3>
                <p style={{ color: "var(--text-secondary)" }}>
                  Si tu primer pedido supera los <strong>$400.000 ARS</strong>, el envío corre por nuestra cuenta a todo Argentina.
                </p>
              </div>
            </div>

            {/* Tarjeta media */}
            <div
              className="md:col-span-5 p-10 rounded-3xl flex flex-col justify-between min-h-[280px] border"
              style={{ backgroundColor: "var(--text-primary)", color: "var(--text-inverse)", borderColor: "var(--border)" }}
              data-testid="benefit-card-curator"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--gold)", color: "var(--text-primary)" }}>
                <MessageCircle size={26} />
              </div>
              <div>
                <h3 className="font-serif text-3xl mb-3">Curador en vivo 24/7</h3>
                <p style={{ color: "color-mix(in srgb, var(--text-inverse) 75%, transparent)" }}>
                  Nuez, nuestro experto, te ayuda a elegir y arma tu pedido sin demoras.
                </p>
              </div>
            </div>

            {/* Tarjeta secundaria 1 */}
            <div
              className="md:col-span-4 p-8 rounded-3xl border"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
              data-testid="benefit-card-pay"
            >
              <Shield size={24} style={{ color: "var(--primary)" }} className="mb-4" />
              <h3 className="font-serif text-xl mb-2" style={{ color: "var(--text-primary)" }}>Pago seguro Mercado Pago</h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Tarjeta, efectivo o transferencia. Compra protegida.
              </p>
            </div>

            {/* Tarjeta secundaria 2 */}
            <div
              className="md:col-span-4 p-8 rounded-3xl border"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
              data-testid="benefit-card-origin"
            >
              <MapPin size={24} style={{ color: "var(--primary)" }} className="mb-4" />
              <h3 className="font-serif text-xl mb-2" style={{ color: "var(--text-primary)" }}>Origen Mendoza</h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Trabajamos directo con productores locales. Sin intermediarios.
              </p>
            </div>

            {/* Tarjeta secundaria 3 */}
            <div
              className="md:col-span-4 p-8 rounded-3xl border"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
              data-testid="benefit-card-quality"
            >
              <Sparkles size={24} style={{ color: "var(--primary)" }} className="mb-4" />
              <h3 className="font-serif text-xl mb-2" style={{ color: "var(--text-primary)" }}>Selección a mano</h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Cada lote es revisado para garantizar la mejor calidad.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="py-24 md:py-36 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-16 flex-wrap gap-4">
            <div>
              <p className="text-overline mb-4" style={{ color: "var(--primary)" }}>Lo más pedido</p>
              <h2 className="font-serif text-4xl md:text-6xl" style={{ color: "var(--text-primary)" }}>Productos destacados</h2>
            </div>
            <Link
              to="/catalogo"
              className="text-sm font-medium inline-flex items-center gap-2 link-fancy"
              style={{ color: "var(--text-primary)" }}
              data-testid="see-all-products"
            >
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((p) => (
              <Link
                key={p.id}
                to={`/producto/${p.slug}`}
                className="group block rounded-2xl overflow-hidden border transition-all hover:-translate-y-1"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
                data-testid={`featured-product-${p.slug}`}
              >
                <div className="aspect-square overflow-hidden" style={{ backgroundColor: "var(--bg-alt)" }}>
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-xl mb-1" style={{ color: "var(--text-primary)" }}>{p.name}</h3>
                  <p className="text-sm mb-3 line-clamp-2" style={{ color: "var(--text-muted)" }}>{p.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold" style={{ color: "var(--primary)" }}>desde {formatARS(p.weight_options?.[0]?.price || p.base_price)}</span>
                    <ArrowRight size={16} style={{ color: "var(--text-primary)" }} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 pb-24 md:pb-32">
        <div className="max-w-6xl mx-auto rounded-3xl p-12 md:p-20 text-center relative overflow-hidden"
             style={{ backgroundColor: "var(--text-primary)", color: "var(--text-inverse)" }}>
          <Sparkles className="absolute top-8 right-8 opacity-20" style={{ color: "var(--gold)" }} size={140} />
          <p className="text-overline mb-4 relative" style={{ color: "var(--gold)" }}>Compra automatizada</p>
          <h2 className="font-serif text-4xl md:text-6xl mb-6 relative">
            Tu pedido en <span className="italic" style={{ color: "var(--terracotta)" }}>3 clicks</span>.
          </h2>
          <p className="max-w-2xl mx-auto mb-10 text-lg leading-relaxed relative" style={{ color: "color-mix(in srgb, var(--text-inverse) 80%, transparent)" }}>
            Chateá con Nuez, agregá al carrito y pagá con Mercado Pago.
            Sin esperas, sin llamados. Todo en menos de 2 minutos.
          </p>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-medium transition-all hover:-translate-y-1 relative"
            style={{ backgroundColor: "var(--primary)", color: "#fff" }}
            data-testid="bottom-cta-shop"
          >
            Empezar a comprar
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Home;
