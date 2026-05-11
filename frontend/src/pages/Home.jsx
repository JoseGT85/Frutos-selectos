import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Truck, Shield, Sparkles, MessageCircle } from "lucide-react";
import api, { formatARS } from "@/lib/api";

const Home = () => {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api.get("/products?featured=true").then((r) => setFeatured(r.data.slice(0, 4))).catch(() => {});
  }, []);

  return (
    <main data-testid="home-page">
      {/* HERO */}
      <section className="relative min-h-[88vh] flex items-center px-6 md:px-12 grain overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1608797178974-15b35a64ede9?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000"
            alt=""
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#F9F6F0] via-[#F9F6F0]/85 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-8 items-center py-20">
          <div className="fade-up">
            <p className="text-overline text-[#C35214] mb-6">Frutos Secos Premium · Argentina</p>
            <h1 className="font-serif text-5xl md:text-7xl text-[#2C1E16] leading-[1.05] mb-6">
              Del campo a tu mesa.<br />
              <span className="italic text-[#C35214]">Crudos.</span> Honestos. Premium.
            </h1>
            <p className="text-lg text-[#5D4B41] max-w-xl mb-10 leading-relaxed">
              Almendras, nueces, pistachos y mixes seleccionados a mano. Envíos a todo el país
              con la garantía de frescura del productor.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/catalogo"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#C35214] hover:bg-[#A64B29] text-white rounded-full font-medium transition-all hover:-translate-y-1"
                data-testid="hero-cta-shop"
              >
                Comprar ahora
                <ArrowRight size={16} />
              </Link>
              <a
                href="#beneficios"
                className="inline-flex items-center gap-2 px-8 py-4 border border-[#2C1E16] text-[#2C1E16] rounded-full font-medium hover:bg-[#2C1E16] hover:text-white transition-all"
                data-testid="hero-cta-info"
              >
                Cómo funciona
              </a>
            </div>
          </div>
          <div className="hidden md:block"></div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section id="beneficios" className="py-20 md:py-32 px-6 md:px-12 bg-[#E5D9C5]">
        <div className="max-w-7xl mx-auto">
          <p className="text-overline text-[#C35214] mb-4">Por qué elegirnos</p>
          <h2 className="font-serif text-4xl md:text-5xl text-[#2C1E16] mb-16 max-w-2xl">
            Compra simple. Calidad sin concesiones.
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Truck size={28} />,
                title: "Envío a todo el país",
                desc: "Llegamos a CABA, GBA e interior. Envío gratis en compras +$25.000.",
              },
              {
                icon: <MessageCircle size={28} />,
                title: "Asesor IA 24/7",
                desc: "Nuez, nuestro asistente inteligente, te ayuda a elegir y cierra tu pedido sin demoras.",
              },
              {
                icon: <Shield size={28} />,
                title: "Pago seguro Mercado Pago",
                desc: "Tarjeta, efectivo o transferencia. Compra protegida y devolución garantizada.",
              },
            ].map((b, i) => (
              <div
                key={i}
                className="bg-[#F9F6F0] p-8 rounded-2xl border border-[#2C1E16]/10"
                data-testid={`benefit-card-${i}`}
              >
                <div className="w-14 h-14 rounded-full bg-[#C35214] text-white flex items-center justify-center mb-6">
                  {b.icon}
                </div>
                <h3 className="font-serif text-2xl mb-3 text-[#2C1E16]">{b.title}</h3>
                <p className="text-[#5D4B41] leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="py-20 md:py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <p className="text-overline text-[#C35214] mb-4">Lo más pedido</p>
              <h2 className="font-serif text-4xl md:text-5xl text-[#2C1E16]">Productos destacados</h2>
            </div>
            <Link
              to="/catalogo"
              className="text-sm font-medium text-[#2C1E16] hover:text-[#C35214] inline-flex items-center gap-2"
              data-testid="see-all-products"
            >
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((p) => (
              <Link
                key={p.id}
                to={`/producto/${p.slug}`}
                className="group block bg-white rounded-2xl border border-[#2C1E16]/10 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1"
                data-testid={`featured-product-${p.slug}`}
              >
                <div className="aspect-square overflow-hidden bg-[#E5D9C5]">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-xl text-[#2C1E16] mb-1">{p.name}</h3>
                  <p className="text-sm text-[#968B83] mb-3 line-clamp-2">{p.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#C35214]">desde {formatARS(p.weight_options?.[0]?.price || p.base_price)}</span>
                    <ArrowRight size={16} className="text-[#2C1E16] group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-20 md:py-28">
        <div className="max-w-5xl mx-auto bg-[#2C1E16] rounded-3xl p-12 md:p-20 text-center text-white relative overflow-hidden">
          <Sparkles className="absolute top-8 right-8 text-[#D4AF37] opacity-30" size={120} />
          <p className="text-overline text-[#D4AF37] mb-4 relative">Compra automatizada</p>
          <h2 className="font-serif text-4xl md:text-6xl mb-6 relative">
            Tu pedido en <span className="italic text-[#D97742]">3 clicks</span>.
          </h2>
          <p className="text-[#F9F6F0]/80 max-w-2xl mx-auto mb-10 text-lg leading-relaxed relative">
            Chateá con Nuez, agregá al carrito y pagá con Mercado Pago. Sin esperas, sin
            llamados. Todo el proceso en menos de 2 minutos.
          </p>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#C35214] hover:bg-[#A64B29] rounded-full font-medium transition-all hover:-translate-y-1 relative"
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
