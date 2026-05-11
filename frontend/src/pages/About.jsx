import React from "react";

const About = () => (
  <main className="px-6 md:px-12 py-20 max-w-4xl mx-auto" data-testid="about-page">
    <p className="text-overline text-[#C35214] mb-3">Nuestra historia</p>
    <h1 className="font-serif text-5xl md:text-6xl text-[#2C1E16] mb-8 leading-tight">
      Frutos secos honestos.<br />
      <span className="italic">Sin intermediarios.</span>
    </h1>
    <p className="text-lg text-[#5D4B41] leading-relaxed mb-6">
      Trabajamos directo con productores argentinos para llevarte frutos secos de la mejor calidad,
      a un precio justo y con la frescura que merece tu mesa.
    </p>
    <p className="text-lg text-[#5D4B41] leading-relaxed mb-6">
      Cada lote es seleccionado a mano, envasado al vacío para preservar su sabor y enviado a
      todo el país en 24-72hs.
    </p>
    <p className="text-lg text-[#5D4B41] leading-relaxed">
      Y porque tu tiempo vale, automatizamos todo el proceso de compra: chateás con nuestro
      asistente IA, agregás al carrito y pagás en un click. Sin esperas, sin llamadas.
    </p>
  </main>
);

export default About;
