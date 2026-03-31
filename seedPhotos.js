import fs from "fs";

const DATA_FILE = "./data/custom_catalog.json";
try {
  let content = { customProducts: [], overrides: {}, images: {} };
  
  if (fs.existsSync(DATA_FILE)) {
    content = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  }
  
  if (!content.images) content.images = {};

  const mocks = [
    { name: 'Almendra Non Pareil 34+ (Chile)', image: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&q=80&w=400' },
    { name: 'Castañas de Cajú W4 (Brasil)', image: 'https://images.unsplash.com/photo-1596422846543-7dc3fa908d08?auto=format&fit=crop&q=80&w=400' },
    { name: 'Nuez Mariposa Extra Light', image: 'https://images.unsplash.com/photo-1573411700683-11231f2986c7?auto=format&fit=crop&q=80&w=400' },
    { name: 'Avellana 11/13 (Chile)', image: 'https://images.unsplash.com/photo-1560155016-bd4879ae8f21?auto=format&fit=crop&q=80&w=400' },
    { name: 'Mix Premium', image: 'https://images.unsplash.com/photo-1599580665518-2e06a3feade8?auto=format&fit=crop&q=80&w=400' },
    { name: 'Mix Frutos Secos (Sin Maní)', image: 'https://images.unsplash.com/photo-1608039755401-742077336829?auto=format&fit=crop&q=80&w=400' },
    { name: 'Arándanos Deshidratados (Chile)', image: 'https://images.unsplash.com/photo-1565060413554-04a11f215f79?auto=format&fit=crop&q=80&w=400' },
    { name: 'Pasas de Uva Morena', image: 'https://images.unsplash.com/photo-1599309605706-5384218844ba?auto=format&fit=crop&q=80&w=400' },
    { name: 'Maní Tostado Sin Sal Premium', image: 'https://images.unsplash.com/photo-1550828520-20531644fcff?auto=format&fit=crop&q=80&w=400' },
    { name: 'Semilla de Chía', image: 'https://images.unsplash.com/photo-1502598381861-1d701df4fce3?auto=format&fit=crop&q=80&w=400' }
  ];

  for(let m of mocks) {
    if (!content.images[m.name]) {
       content.images[m.name] = m.image;
    }
  }

  // Prevención genérica si los nombres de la base difieren levemente
  content.images["Almendras"] = 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&q=80&w=400';
  content.images["Nueces"] = 'https://images.unsplash.com/photo-1573411700683-11231f2986c7?auto=format&fit=crop&q=80&w=400';

  if (!fs.existsSync("./data")) fs.mkdirSync("./data");
  fs.writeFileSync(DATA_FILE, JSON.stringify(content, null, 2));
  
} catch(e) { console.error(e) }
