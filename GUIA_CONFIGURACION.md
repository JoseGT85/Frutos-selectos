# 🌰 Guía Maestra: Configuración de Frutos Selectos

Esta guía detalla los pasos para dejar el ecosistema (Frontend + Backend + IA + Supabase) 100% operativo.

---

## 1. Archivo de Configuración (.env)
Crea o edita el archivo `.env` en la raíz con las siguientes variables:

### 🌐 General & Negocio
- `PORT=3000` (Puerto del servidor)
- `ADMIN_PASSWORD=tu_clave_aqui` (Para entrar al panel /admin)
- `JWT_SECRET=una_cadena_aleatoria_larga` (Seguridad de sesiones)
- `WA_NUMBER=549XXXXXXXXXX` (Número de WhatsApp de ventas)

### 📊 Supabase (Base de Datos & Fotos)
- `SUPABASE_URL=https://tu_proyecto.supabase.co`
- `SUPABASE_ANON_KEY=tu_llave_anon_key`

### 🤖 Telegram (Notificaciones)
- `TELEGRAM_BOT_TOKEN=tu_token_de_bot_father`
- `ADMIN_CHAT_IDS=tu_id_de_usuario_o_grupo` (Ej: 1234567, 8901234)

### 🧠 Inteligencia Artificial
- `ANTHROPIC_API_KEY=tu_llave_claude` (Opcional si usas Ollama)
- `OLLAMA_URL=http://localhost:11434` (Si usas IA local)

---

## 2. WhatsApp Cloud API (El Puente)
Para que el sistema reciba y envíe mensajes de forma oficial, necesitás las credenciales de Meta:

1. **Meta App:** Crea una app de tipo "Business" en [developers.facebook.com](https://developers.facebook.com).
2. **Producto WhatsApp:** Agrega el producto "WhatsApp" a tu app.
3. **Variables requeridas:**
   - `WA_ACCESS_TOKEN`: Token de acceso (Generá uno **permanente** en *Configuración del negocio > Usuarios del sistema*).
   - `WA_PHONE_NUMBER_ID`: Lo encontrás en *WhatsApp > Configuración de la API*.
   - `WA_BUSINESS_ACCOUNT_ID`: También en *Configuración de la API*.
   - `WA_VERIFY_TOKEN`: Una palabra inventada por vos (ej: `frutos_secret_123`) que pondrás tanto en Meta como en tu `.env` para validar el Webhook.

---

## 3. Configuración en Supabase

### A. Base de Datos (SQL Editor)
Copia y pega este código en el SQL Editor de Supabase y dale a "Run":

```sql
-- Tabla para registrar todas las ventas
create table orders (
  id text primary key,
  client jsonb,
  cart jsonb,
  totalKg float,
  shippingStatus text,
  isFirstOrder boolean,
  status text default 'PENDIENTE',
  trackingUrl text,
  date timestamp with time zone default now()
);

-- Tabla para la base de conocimientos de la IA
create table knowledge_base (
  id text primary key,
  cat text,
  active boolean,
  priority integer,
  triggers text,
  question text,
  answer text
);
```

### B. Almacenamiento de Fotos (Storage)
1. Ve a la sección **Storage** en Supabase.
2. Crea un nuevo **Bucket** llamado `product-images`.
3. Configúralo como **PUBLIC** (para que las fotos se vean en la web).

---

## 3. Conexión con Google Sheets (Catálogo)
Para que los precios se actualicen solos desde tu planilla:
1. Comparte tu Google Sheet como "Cualquier persona con el enlace puede leer".
2. Copia el ID de la planilla (está en la URL).
3. Configura `GOOGLE_SHEET_ID` en el `.env`.

---

### 💳 Pasarela de Pagos (Mercado Pago)
Para que el cliente pueda pagar directamente:

1. Entrá a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel/credentials).
2. Seleccioná tu aplicación y copiá las "Credenciales de producción".
3. Agregá al `.env`:
   - `MP_ACCESS_TOKEN`: El token largo que empieza con `APP_USR-...`
   - `MP_PUBLIC_KEY`: Tu clave pública.
   - `WEBHOOK_URL`: La URL de tu servidor en Vercel.

---

### 🚚 Configuración de Envíos (Andreani)
El sistema está preparado para recibir una tabla de costos por provincia en `payments-service.js`. Por defecto, Mendoza es gratis y el resto del país tiene una tarifa base que podés modificar en el código.

---

## 4. Cómo cargar respuestas para la IA
Para que el bot sepa responder dudas de clientes:
1. Entra a la web al panel de **Administración**.
2. Ve a la sección **Knowledge Base**.
3. Carga las preguntas frecuentes (ej: "Zonas de envío", "Formas de pago").
4. La IA usará esta información para responder automáticamente por WhatsApp/Telegram.

---

## 5. Mantenimiento
- **Reiniciar Bot:** Siempre que cambies algo en el `.env`, debés cerrar la consola y ejecutar `node index.js`.
- **Despliegue:** Para subir a Vercel, simplemente vincula tu GitHub y el sistema usará el archivo `vercel.json` automáticamente.
