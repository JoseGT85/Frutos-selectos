import fs from "fs";
import path from "path";

const isVercel = !!(process.env.VERCEL || process.env.NOW_REGION);
const dataDir = path.join(process.cwd(), "data");
const clientsFile = path.join(dataDir, "clients.json");
const ordersFile = path.join(dataDir, "orders.json");

if (!isVercel) {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (err) {
    console.warn("[ORDERS] No se pudo crear directorio:", err.message);
  }
}

export class OrdersService {
  constructor() {
    this.clients = this.load(clientsFile, []);
    this.orders = this.load(ordersFile, []);
  }

  load(filename, dflt) {
    try {
      if (fs.existsSync(filename)) {
        return JSON.parse(fs.readFileSync(filename, "utf8"));
      }
    } catch (e) {
      console.error(`Error loading ${filename}`, e);
    }
    return dflt;
  }

  save() {
    if (isVercel) return;
    try {
      fs.writeFileSync(clientsFile, JSON.stringify(this.clients, null, 2));
      fs.writeFileSync(ordersFile, JSON.stringify(this.orders, null, 2));
    } catch (e) {
      console.error("Error saving data", e);
    }
  }

  // Returns true if phone or CUIT exists in past orders
  isFirstOrder(phone, cuit) {
    const phoneStr = (phone || "").replace(/\D/g, "");
    const cuitStr = (cuit || "").replace(/\D/g, "");
    
    // Check if there is any past order overlapping in phone or cuit
    const hasPast = this.orders.some(o => {
      const oPhoneStr = (o.client.phone || "").replace(/\D/g, "");
      const oCuitStr = (o.client.cuit || "").replace(/\D/g, "");
      if (phoneStr && phoneStr === oPhoneStr) return true;
      if (cuitStr && cuitStr === oCuitStr) return true;
      return false;
    });

    return !hasPast;
  }

  processOrder(clientData, cartData, totalKg, cartTotal = 0) {
    const isFirst = this.isFirstOrder(clientData.phone, clientData.cuit);
    let shippingStatus = "Envío a cargo del cliente";
    
    if (totalKg >= 10 && cartTotal >= 400000 && isFirst) {
      shippingStatus = "Envío gratis aprobado (1ra compra >= 10kg y >= $400.000)";
    } else if (totalKg >= 10 && cartTotal >= 400000) {
      shippingStatus = "Envío a cargo del cliente (No es primer compra)";
    }
    const existingClientIndex = this.clients.findIndex(c => {
      const phoneStr1 = (c.phone || "").replace(/\D/g, "");
      const phoneStr2 = (clientData.phone || "").replace(/\D/g, "");
      const cuitStr1 = (c.cuit || "").replace(/\D/g, "");
      const cuitStr2 = (clientData.cuit || "").replace(/\D/g, "");

      if (phoneStr1 && phoneStr1 === phoneStr2) return true;
      if (cuitStr1 && cuitStr1 === cuitStr2) return true;
      return false;
    });

    const clientRecord = {
      ...clientData,
      lastUpdated: new Date().toISOString()
    };

    if (existingClientIndex > -1) {
      this.clients[existingClientIndex] = {
        ...this.clients[existingClientIndex],
        ...clientRecord
      };
    } else {
      clientRecord.createdAt = new Date().toISOString();
      this.clients.push(clientRecord);
    }

    // Create Order
    const order = {
      id: "ORD-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
      client: clientData,
      cart: cartData,
      totalKg,
      shippingStatus,
      isFirstOrder: isFirst,
      date: new Date().toISOString()
    };

    this.orders.push(order);
    this.save();

    return order;
  }
}

export const ordersService = new OrdersService();
