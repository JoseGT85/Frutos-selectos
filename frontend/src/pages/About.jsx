import React from "react";
import { MapPin } from "lucide-react";

const About = () => (
  <main className="px-6 md:px-12 py-20 max-w-4xl mx-auto" data-testid="about-page" style={{ color: "var(--text-primary)" }}>
    <p className="flex items-center gap-2 text-overline mb-4" style={{ color: "var(--primary)" }}>
      <MapPin size={11} /> Mendoza · Argentina
    </p>
    <h1 className="font-serif text-5xl md:text-6xl mb-8 leading-tight">
      Frutos selectos<br />
      <span className="italic">de origen mendocino.</span>
    </h1>
    <p className="text-lg leading-relaxed mb-6" style={{ color: "var(--text-secondary)" }}>
      Trabajamos directo con productores de Mendoza para llevarte frutos secos de la mejor calidad,
      a un precio justo y con la frescura que merece tu mesa.
    </p>
    <p className="text-lg leading-relaxed mb-6" style={{ color: "var(--text-secondary)" }}>
      Cada lote es seleccionado a mano, envasado al vacío para preservar su sabor y enviado a
      todo el país en 24-72hs.
    </p>
    <p className="text-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>
      Y porque tu tiempo vale, automatizamos todo el proceso de compra: chateás con nuestro
      curador experto, agregás al carrito y pagás en un click. Sin esperas, sin llamadas.
    </p>
  </main>
);

export default About;
