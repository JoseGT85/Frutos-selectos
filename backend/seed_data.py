"""
Datos seed de productos DIFRUMARKET con precios reales.
Estructura: (name, category, cost_per_kg, supplier_price_5kg, supplier_price_1kg, description, image_category, tags)
- cost_per_kg: precio columna 1 (lo que pago al comprar caja 10kg)
- supplier_price_5kg, supplier_price_1kg: precios sugeridos por proveedor (columnas 2 y 3)
- Si están en None significa que en la lista figuraba "-"
"""

# Mapeo categoría → imagen Unsplash de referencia
CATEGORY_IMAGES = {
    "almendra-non-pareil": "https://images.unsplash.com/photo-1608797178974-15b35a64ede9?w=1200&q=85",
    "almendra-guara": "https://images.unsplash.com/photo-1608797178974-15b35a64ede9?w=1200&q=85",
    "harina-de-almendra": "https://images.pexels.com/photos/4198653/pexels-photo-4198653.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "nuez": "https://images.unsplash.com/photo-1524593000379-d4729b2c4f99?w=1200&q=85",
    "avellana": "https://images.unsplash.com/photo-1568526381923-caf3fd520382?w=1200&q=85",
    "arandanos": "https://images.pexels.com/photos/5945912/pexels-photo-5945912.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "avena": "https://images.unsplash.com/photo-1614961233913-a5113a4a34ed?w=1200&q=85",
    "castana-caju": "https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=1200&q=85",
    "chips-banana": "https://images.unsplash.com/photo-1571771019784-3ff35f4f4277?w=1200&q=85",
    "coco": "https://images.unsplash.com/photo-1581375074612-d1fd0e661aeb?w=1200&q=85",
    "maiz-frito": "https://images.pexels.com/photos/6107797/pexels-photo-6107797.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "datiles": "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=1200&q=85",
    "mani": "https://images.pexels.com/photos/1295572/pexels-photo-1295572.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "pasas-de-uva": "https://images.unsplash.com/photo-1567593810070-7a3d471af022?w=1200&q=85",
    "tomate-deshidratado": "https://images.unsplash.com/photo-1604848698030-c434ba08ece1?w=1200&q=85",
    "semillas": "https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?w=1200&q=85",
    "ciruela": "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=1200&q=85",
    "pistacho": "https://images.pexels.com/photos/3993205/pexels-photo-3993205.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "frutas-deshidratadas": "https://images.pexels.com/photos/4589141/pexels-photo-4589141.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "mixs": "https://images.pexels.com/photos/4589141/pexels-photo-4589141.jpeg?auto=compress&cs=tinysrgb&w=1200",
}

# Lista completa con datos del CSV DIFRUMARKET
# Tuplas: (name, category, cost_per_kg, sup_5kg, sup_1kg, description, tags, featured)
DIFRUMARKET_PRODUCTS = [
    # ALMENDRA NON PAREIL
    ("Almendra Non Pareil 23/25 Chile 2026", "almendra-non-pareil", 19570, None, None,
     "Almendra californiana premium calibre 23/25, cosecha Chile 2026. Tamaño extra grande, crujiente y dulce.",
     ["premium", "sin-tacc", "natural"], True),
    ("Almendra Non Pareil 27/30 Chile 2026", "almendra-non-pareil", 18750, 21563, 24795,
     "Almendra californiana calibre 27/30. Equilibrio perfecto entre tamaño y precio. Ideal repostería y snack.",
     ["premium", "sin-tacc"], True),
    ("Almendra Non Pareil 30/34 Chile 2026 🔥OFERTA", "almendra-non-pareil", 17500, 20125, 23143,
     "OFERTA: Almendra Non Pareil calibre 30/34. Misma calidad premium, presentación más chica. Excelente relación precio-calidad.",
     ["oferta", "sin-tacc"], True),

    # ALMENDRA GUARA
    ("Almendra Guara Chica", "almendra-guara", 15070, None, None,
     "Almendra variedad Guara, calibre chico. Sabor intenso, ideal para repostería y panificación.",
     ["natural", "sin-tacc"], False),
    ("Almendra Guara Grande", "almendra-guara", 16700, None, None,
     "Almendra Guara grande, primera selección. Tamaño superior, perfecta para snack.",
     ["natural", "sin-tacc"], False),

    # HARINA DE ALMENDRA
    ("Harina de Almendra Chilena Sin Piel", "harina-de-almendra", 23430, 26945, 29053,
     "Harina de almendra blanqueada sin piel. Ideal para macarons, repostería fina y dietas keto/low carb.",
     ["sin-tacc", "keto", "repostería"], True),
    ("Harina de Almendra Chilena Con Piel", "harina-de-almendra", 19880, 22862, 24651,
     "Harina de almendra integral con piel. Mayor fibra y sabor más intenso. Para panificación y galletas.",
     ["sin-tacc", "integral"], False),

    # NUEZ
    ("Nuez Mariposa Extra Light 🔥SUPER OFERTA", "nuez", 13900, 15985, 18389,
     "OFERTA imperdible: Nuez mariposa extra light. Mitades enteras, color claro, sabor suave y mantecoso.",
     ["oferta", "omega-3", "premium"], True),
    ("Nuez Cuartos Extra Light 🔥SUPER OFERTA", "nuez", 13000, 14950, 17195,
     "Nuez en cuartos extra light. Ideal para repostería, ensaladas y rellenos. Rica en omega-3.",
     ["oferta", "omega-3"], True),

    # AVELLANA
    ("Avellana 11/13 Chile", "avellana", 30960, 35604, 38390,
     "Avellana chilena calibre 11/13. Crujiente, dulce, perfecta para chocolatería y consumo natural.",
     ["premium", "natural"], False),

    # ARÁNDANOS
    ("Arándanos Slice Chile", "arandanos", 13740, 15801, 17038,
     "Arándanos deshidratados en rodajas, origen Chile. Sin azúcar agregada. Antioxidantes naturales.",
     ["antioxidante", "natural", "saludable"], True),

    # AVENA
    ("Avena Instantánea Gruesa", "avena", 1940, 2231, 2406,
     "Avena instantánea de copo grueso. Ideal desayunos, granolas y galletas caseras.",
     ["saludable", "fibra"], False),

    # CASTAÑA DE CAJÚ
    ("Castaña de Cajú Brasil W1S", "castana-caju", 21340, None, None,
     "Castaña de cajú Brasil grado W1S — el más premium. Enteras, blancas, sin partir. Calidad excepcional.",
     ["premium", "natural"], True),
    ("Castaña de Cajú Brasil W4", "castana-caju", 16060, 18469, 19914,
     "Castaña de cajú Brasil grado W4. Enteras, equilibrio premium-precio. Ideal snack y cocina.",
     ["premium"], True),
    ("Castaña de Cajú Vietnam SK1", "castana-caju", 12850, 14778, 15934,
     "Castaña de cajú origen Vietnam grado SK1. Trozos seleccionados a buen precio. Excelente para mixes.",
     ["natural"], False),

    # CHIPS DE BANANA
    ("Chips de Banana Filipinas", "chips-banana", 9150, None, None,
     "Chips de banana de Filipinas. Crujientes y ligeramente dulces. Snack natural ideal para cualquier momento.",
     ["snack", "natural"], False),

    # COCO
    ("Coco Rallado High Fat 65%", "coco", 10610, 12202, 13156,
     "Coco rallado alta materia grasa 65%. Aromático, ideal repostería gourmet.",
     ["premium", "repostería"], True),
    ("Coco Rallado Mid Fat 50%", "coco", 8720, 10028, 10813,
     "Coco rallado materia grasa media 50%. Excelente para repostería casera y bocaditos.",
     ["repostería"], False),
    ("Coco Rallado Low Fat", "coco", 6460, 7429, 8010,
     "Coco rallado bajo en grasa. Perfecto para coberturas y preparaciones ligeras.",
     ["light"], False),
    ("Coco en Escamas", "coco", 10610, 12202, 13156,
     "Coco en escamas, presentación grande. Decoración premium para postres y granolas.",
     ["premium", "repostería"], False),

    # MAIZ FRITO
    ("Maíz Frito y Salado Original", "maiz-frito", 13040, None, None,
     "Maíz frito y salado estilo clásico. Crujiente, salado, perfecto picada y aperitivo.",
     ["snack", "salado"], False),

    # DÁTILES
    ("Dátiles Medjoul 🔥SUPER OFERTA", "datiles", 18500, None, None,
     "OFERTA: Dátiles Medjoul jumbo, los reyes de los dátiles. Carnosos, dulces como caramelo natural.",
     ["oferta", "premium", "dulce"], True),
    ("Dátiles de Argelia", "datiles", 9180, None, None,
     "Dátiles de Argelia, dulces y suaves. Ideal snack saludable o relleno con frutos secos.",
     ["natural", "dulce"], False),
    ("Dátiles de Egipto", "datiles", 6660, None, None,
     "Dátiles de Egipto a precio accesible. Excelente fuente de energía natural.",
     ["natural", "económico"], False),

    # MANÍ
    ("Maní con Sal Premium", "mani", 2250, 2588, 2790,
     "Maní tostado con sal, calidad premium. El clásico para la picada argentina.",
     ["snack", "salado"], False),
    ("Maní sin Sal Premium", "mani", 2250, 2588, 2790,
     "Maní tostado sin sal. Sabor natural intenso, ideal para mezclar en granolas y cereales.",
     ["snack", "natural"], False),

    # PASAS DE UVA
    ("Pasas de Uva Morena Flame 2026", "pasas-de-uva", 4380, None, None,
     "Pasas de uva morena variedad Flame, cosecha 2026. Jugosas y dulces.",
     ["natural", "dulce"], False),
    ("Pasas de Uva Super Jumbo", "pasas-de-uva", 6870, None, None,
     "Pasas de uva Super Jumbo, tamaño excepcional. La mejor calidad disponible.",
     ["premium", "jumbo"], True),
    ("Pasas de Uva Rubia Premium", "pasas-de-uva", 8200, None, None,
     "Pasas de uva rubia sin semilla, calidad premium. Color claro, dulces, ideales repostería.",
     ["premium", "repostería"], False),
    ("Pasas de Uva Rubia Eco", "pasas-de-uva", 6730, None, None,
     "Pasas rubias con buen relación precio-calidad. Para uso diario y panificación.",
     ["económico"], False),

    # TOMATE DESHIDRATADO
    ("Tomate Deshidratado", "tomate-deshidratado", 13480, None, None,
     "Tomate deshidratado al sol, intenso sabor mediterráneo. Ideal para pastas, focaccias y ensaladas.",
     ["gourmet", "salado"], False),

    # SEMILLAS
    ("Semilla de Girasol", "semillas", 3610, 4152, 4476,
     "Semillas de girasol peladas. Crujientes, ideal granolas, panes y ensaladas.",
     ["saludable", "natural"], False),
    ("Semilla de Chía", "semillas", 6730, 7740, 8345,
     "Semillas de chía premium. Fuente de omega-3, fibra y proteína vegetal.",
     ["superalimento", "omega-3"], True),
    ("Semilla de Lino", "semillas", 2220, 2553, 2753,
     "Semillas de lino marrón. Excelente fuente de omega-3 y fibra.",
     ["saludable", "omega-3"], False),
    ("Semilla de Sésamo Integral", "semillas", 2680, 3082, 3323,
     "Sésamo integral con cáscara. Sabor intenso, ideal panificación.",
     ["natural"], False),
    ("Semilla de Sésamo Blanco", "semillas", 5830, 6705, 7229,
     "Sésamo blanco pelado. Para sushi, tahini y repostería oriental.",
     ["gourmet"], False),
    ("Semilla de Sésamo Negro", "semillas", 6500, 7475, 8060,
     "Sésamo negro premium. Decoración gourmet y propiedades antioxidantes superiores.",
     ["gourmet", "premium"], False),

    # CIRUELA
    ("Ciruela P.T.E. Sin Carozo Mediana", "ciruela", 13630, None, None,
     "Ciruela secada al sol, sin carozo, calibre mediano. Naturalmente dulce, sin conservantes.",
     ["natural", "dulce"], False),
    ("Ciruela D'Agen Sin Carozo 110/132", "ciruela", 8210, None, None,
     "Ciruela D'Agen calibre 110/132, sin carozo. Variedad francesa clásica. Excelente precio.",
     ["natural", "económico"], False),

    # PISTACHO
    ("Pistacho Pelado Natural Entero", "pistacho", 61320, 70518, 76037,
     "Pistacho pelado natural entero. Producto top premium. Ideal repostería gourmet o consumo selecto.",
     ["premium", "gourmet"], True),
    ("Pistacho Tostado y Salado con Cáscara 🔥SUPER OFERTA", "pistacho", 25000, 28750, 33100,
     "OFERTA: Pistacho tostado y salado con cáscara. Crocante, el snack premium argentino por excelencia.",
     ["oferta", "premium", "snack"], True),

    # FRUTAS DESHIDRATADAS
    ("Higos Negros", "frutas-deshidratadas", 11720, None, None,
     "Higos negros enteros, deshidratados naturalmente. Tiernos y dulces.",
     ["natural", "dulce"], False),
    ("Pera Deshidratada Mediana", "frutas-deshidratadas", 10400, None, None,
     "Pera deshidratada calibre mediano. Snack saludable natural sin agregados.",
     ["natural", "saludable"], False),
    ("Papaya Multicolor en Cubos", "frutas-deshidratadas", 7520, None, None,
     "Papaya deshidratada en cubos multicolor. Decoración premium para granolas y postres.",
     ["natural", "color"], False),

    # MIXS
    ("Mix Premium", "mixs", 21150, 24323, 26226,
     "Mix premium: nueces, almendras, castañas, pistachos. La selección más fina para regalos y consumo selecto.",
     ["premium", "regalo", "mix"], True),
    ("Mix Frutos Secos Sin Maní", "mixs", 13270, 15261, 16455,
     "Mix sin maní, ideal para celíacos y alérgicos. Combinación equilibrada de frutos secos premium.",
     ["sin-tacc", "mix"], True),
    ("Mix Caribe Sin Maní", "mixs", 12020, 13823, 14905,
     "Mix Caribe: frutos secos + frutas tropicales deshidratadas. Sin maní. Explosión de sabor.",
     ["mix", "tropical", "sin-tacc"], False),
    ("Happy Mix", "mixs", 9430, 10845, 11693,
     "Happy Mix: combinación equilibrada de frutos secos y frutas. Snack energético y delicioso.",
     ["mix", "energía"], False),
    ("Mix Salado", "mixs", 8850, 10178, 10974,
     "Mix salado picada: maní, almendras, castañas saladas. Perfecto para acompañar tragos.",
     ["mix", "salado", "picada"], False),
    ("Mix Energético", "mixs", 8370, 9626, 10379,
     "Mix energético: frutos secos + pasas + arándanos + semillas. Para deportistas y vida activa.",
     ["mix", "deportistas", "energía"], False),
]


def build_default_presentations(cost_per_kg: float, sup_5kg: float | None, sup_1kg: float | None):
    """
    Genera 3 presentaciones por defecto: 250g, 500g, 1kg.
    Para 1kg usa el precio sugerido por proveedor (columna 3) si existe.
    Para 250g y 500g calcula proporcional al precio sugerido 1kg, o sino al cost*1.32.
    """
    rate_1kg = sup_1kg if sup_1kg else round(cost_per_kg * 1.32)
    return [
        {"weight": "250g", "weight_kg": 0.25, "price": round(rate_1kg * 0.25), "stock": 30},
        {"weight": "500g", "weight_kg": 0.5, "price": round(rate_1kg * 0.5), "stock": 25},
        {"weight": "1kg", "weight_kg": 1.0, "price": rate_1kg, "stock": 15},
    ]


def get_seed_products():
    """Construye los documentos de productos seed para insertar en DB."""
    products = []
    for name, cat, cost, sup5, sup1, desc, tags, featured in DIFRUMARKET_PRODUCTS:
        products.append({
            "name": name,
            "category": cat,
            "description": desc,
            "image": CATEGORY_IMAGES.get(cat, CATEGORY_IMAGES["mixs"]),
            "images": [],
            "cost_per_kg": cost,
            "margin_percent": 25,  # default slider 25%
            "supplier_price_5kg": sup5,
            "supplier_price_1kg": sup1,
            "weight_options": build_default_presentations(cost, sup5, sup1),
            "tags": tags,
            "featured": featured,
            "active": True,
        })
    return products
