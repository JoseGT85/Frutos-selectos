import { ProductCatalog } from "../catalog.js";

const c = new ProductCatalog(30);
try {
  const p = await c.getAll();
  console.log("=== RESULTADO DEL PARSER ===");
  console.log(`Total productos: ${p.length}`);
  console.log("");
  p.slice(0, 12).forEach(x => {
    console.log(`${x.emoji} ${x.name}`);
    console.log(`   Presentación: ${x.unit}`);
    console.log(`   Costo BULTO: $${x.cost.toLocaleString("es-AR")}`);
    console.log(`   Venta (+${x.margin}%): $${x.salePrice.toLocaleString("es-AR")}`);
    if (x.costPerKg) console.log(`   Ref. por KG: $${x.costPerKg.toLocaleString("es-AR")}`);
    console.log("");
  });
} catch (err) {
  console.error("ERROR:", err.message);
}
process.exit(0);
