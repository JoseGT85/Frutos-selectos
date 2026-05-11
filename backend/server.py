"""
Frutos Secos Premium - Backend
E-commerce con CRM, chatbot IA y pagos automáticos vía Mercado Pago.
"""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, BackgroundTasks
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import mercadopago

# Emergent integrations for LLM
from emergentintegrations.llm.chat import LlmChat, UserMessage

# ------------------- Config -------------------
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@frutossecos.com.ar')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Admin123!')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
MP_ACCESS_TOKEN = os.environ.get('MP_ACCESS_TOKEN', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:8001')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ------------------- DB -------------------
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ------------------- App -------------------
app = FastAPI(title="Frutos Secos Premium API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------- Helpers: Auth -------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))

def create_token(user_id: str, email: str, role: str, expires_minutes: int = 60 * 24 * 7) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=expires_minutes),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acceso solo para administradores")
    return user

# ------------------- Models -------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    phone: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class WeightOption(BaseModel):
    weight: str  # ej "250g"
    price: float
    stock: int = 0

class ProductIn(BaseModel):
    name: str
    slug: Optional[str] = None
    description: str = ""
    category: str = "frutos-secos"
    base_price: float
    image: str
    images: List[str] = []
    weight_options: List[WeightOption] = []
    featured: bool = False
    active: bool = True
    tags: List[str] = []

class CartItemIn(BaseModel):
    product_id: str
    name: str
    weight: str
    unit_price: float
    quantity: int = 1
    image: Optional[str] = None

class CustomerInfoIn(BaseModel):
    email: EmailStr
    name: str
    phone: str
    address: str
    city: str
    province: str
    zip: str
    notes: Optional[str] = ""

class CreateOrderIn(BaseModel):
    items: List[CartItemIn]
    customer: CustomerInfoIn
    shipping_cost: float = 0

class ChatIn(BaseModel):
    session_id: str
    message: str
    user_email: Optional[str] = None
    user_name: Optional[str] = None

class LeadUpdateIn(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

# ------------------- Utils -------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def gen_id() -> str:
    return str(uuid.uuid4())

def slugify(text: str) -> str:
    import re
    s = text.lower().strip()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"[\s-]+", "-", s)
    return s

async def upsert_lead(email: str, name: str = "", phone: str = "", source: str = "chat", extra: dict = None):
    """Crea o actualiza un lead en el CRM automáticamente."""
    if not email:
        return None
    existing = await db.leads.find_one({"email": email.lower()})
    if existing:
        update = {"updated_at": now_iso()}
        if name and not existing.get("name"):
            update["name"] = name
        if phone and not existing.get("phone"):
            update["phone"] = phone
        if extra:
            update.update(extra)
        await db.leads.update_one({"email": email.lower()}, {"$set": update})
        return existing["id"]
    else:
        lead = {
            "id": gen_id(),
            "email": email.lower(),
            "name": name,
            "phone": phone,
            "source": source,
            "status": "new",  # new | contacted | customer | recurrent
            "tags": [],
            "notes": "",
            "orders_count": 0,
            "total_spent": 0.0,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        if extra:
            lead.update(extra)
        await db.leads.insert_one(lead)
        return lead["id"]

# ------------------- AUTH ROUTES -------------------
@api.post("/auth/register")
async def register(payload: RegisterIn):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    user_id = gen_id()
    doc = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "phone": payload.phone or "",
        "role": "customer",
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    await upsert_lead(email, payload.name, payload.phone or "", source="signup")
    token = create_token(user_id, email, "customer")
    return {
        "token": token,
        "user": {"id": user_id, "email": email, "name": payload.name, "role": "customer", "phone": payload.phone or ""},
    }

@api.post("/auth/login")
async def login(payload: LoginIn):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email o contraseña inválidos")
    token = create_token(user["id"], email, user["role"])
    return {
        "token": token,
        "user": {"id": user["id"], "email": email, "name": user.get("name", ""), "role": user["role"], "phone": user.get("phone", "")},
    }

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

# ------------------- PRODUCT ROUTES -------------------
@api.get("/products")
async def list_products(featured: Optional[bool] = None, category: Optional[str] = None):
    query = {"active": True}
    if featured is not None:
        query["featured"] = featured
    if category:
        query["category"] = category
    items = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api.get("/products/{slug}")
async def get_product(slug: str):
    p = await db.products.find_one({"slug": slug}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return p

@api.post("/admin/products")
async def create_product(payload: ProductIn, _admin: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["slug"] = doc.get("slug") or slugify(doc["name"])
    if await db.products.find_one({"slug": doc["slug"]}):
        doc["slug"] = f"{doc['slug']}-{doc['id'][:6]}"
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/admin/products/{product_id}")
async def update_product(product_id: str, payload: ProductIn, _admin: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["updated_at"] = now_iso()
    res = await db.products.update_one({"id": product_id}, {"$set": doc})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    return p

@api.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, _admin: dict = Depends(require_admin)):
    res = await db.products.delete_one({"id": product_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"deleted": True}

# ------------------- ORDER ROUTES -------------------
def _mp_is_real() -> bool:
    return bool(MP_ACCESS_TOKEN) and not MP_ACCESS_TOKEN.startswith("TEST-PLACEHOLDER")

def _create_mp_preference(order: dict) -> dict:
    """Crea preferencia en Mercado Pago. Si no hay token real, retorna URL mock interna."""
    if not _mp_is_real():
        # Mock checkout URL: redirige a página de "pago simulado" en el frontend.
        mock_url = f"{FRONTEND_URL}/checkout/mock?order={order['external_reference']}"
        return {
            "preference_id": f"MOCK-{order['external_reference']}",
            "init_point": mock_url,
            "sandbox_init_point": mock_url,
            "mock": True,
        }
    sdk = mercadopago.SDK(MP_ACCESS_TOKEN)
    items = [{
        "id": it["product_id"],
        "title": f"{it['name']} - {it['weight']}",
        "quantity": int(it["quantity"]),
        "unit_price": float(it["unit_price"]),
        "currency_id": "ARS",
    } for it in order["items"]]
    if order.get("shipping_cost", 0) > 0:
        items.append({
            "id": "shipping",
            "title": "Envío",
            "quantity": 1,
            "unit_price": float(order["shipping_cost"]),
            "currency_id": "ARS",
        })
    pref = {
        "items": items,
        "payer": {
            "name": order["customer"]["name"],
            "email": order["customer"]["email"],
        },
        "back_urls": {
            "success": f"{FRONTEND_URL}/checkout/success?order={order['external_reference']}",
            "failure": f"{FRONTEND_URL}/checkout/failure?order={order['external_reference']}",
            "pending": f"{FRONTEND_URL}/checkout/pending?order={order['external_reference']}",
        },
        "auto_return": "approved",
        "external_reference": order["external_reference"],
        "statement_descriptor": "FrutosSecosPremium",
        "notification_url": f"{BACKEND_URL}/api/webhook/mercadopago",
    }
    result = sdk.preference().create(pref)
    if result["status"] != 201:
        raise HTTPException(status_code=500, detail=f"Error MP: {result.get('response')}")
    r = result["response"]
    return {
        "preference_id": r["id"],
        "init_point": r["init_point"],
        "sandbox_init_point": r.get("sandbox_init_point"),
        "mock": False,
    }

@api.post("/orders")
async def create_order(payload: CreateOrderIn, request: Request):
    subtotal = sum(it.unit_price * it.quantity for it in payload.items)
    total = subtotal + (payload.shipping_cost or 0)
    ext_ref = gen_id()
    order = {
        "id": gen_id(),
        "external_reference": ext_ref,
        "customer": payload.customer.model_dump(),
        "items": [it.model_dump() for it in payload.items],
        "subtotal": subtotal,
        "shipping_cost": payload.shipping_cost or 0,
        "total": total,
        "status": "pending",  # pending | approved | rejected | cancelled
        "payment_status": "pending",
        "mp_preference_id": None,
        "mp_payment_id": None,
        "mp_init_point": None,
        "is_mock": False,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    # User (si está autenticado)
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            payload_jwt = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
            order["user_id"] = payload_jwt.get("sub")
        except Exception:
            pass

    pref = _create_mp_preference(order)
    order["mp_preference_id"] = pref["preference_id"]
    order["mp_init_point"] = pref["init_point"]
    order["is_mock"] = pref.get("mock", False)
    await db.orders.insert_one(order)
    # Upsert lead
    await upsert_lead(
        order["customer"]["email"],
        order["customer"]["name"],
        order["customer"]["phone"],
        source="checkout",
    )
    order.pop("_id", None)
    return {"order": order, "checkout_url": pref["init_point"], "is_mock": pref.get("mock", False)}

@api.get("/orders/{external_reference}")
async def get_order_public(external_reference: str):
    o = await db.orders.find_one({"external_reference": external_reference}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return o

@api.post("/orders/{external_reference}/mock-pay")
async def mock_pay_order(external_reference: str):
    """Endpoint para confirmar pago en modo mock (sin token MP real)."""
    o = await db.orders.find_one({"external_reference": external_reference})
    if not o:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if not o.get("is_mock"):
        raise HTTPException(status_code=400, detail="Este pedido no es mock")
    await _mark_order_paid(external_reference, payment_id=f"MOCK-{gen_id()[:8]}")
    return {"ok": True, "status": "approved"}

async def _mark_order_paid(external_reference: str, payment_id: str):
    o = await db.orders.find_one({"external_reference": external_reference})
    if not o:
        return
    await db.orders.update_one(
        {"external_reference": external_reference},
        {"$set": {
            "status": "approved",
            "payment_status": "approved",
            "mp_payment_id": payment_id,
            "updated_at": now_iso(),
        }},
    )
    # Promote lead → customer
    email = o["customer"]["email"]
    existing_lead = await db.leads.find_one({"email": email})
    new_status = "recurrent" if existing_lead and existing_lead.get("orders_count", 0) >= 1 else "customer"
    await db.leads.update_one(
        {"email": email},
        {"$set": {"status": new_status, "updated_at": now_iso()},
         "$inc": {"orders_count": 1, "total_spent": o["total"]}},
        upsert=False,
    )
    logger.info(f"Order {external_reference} marked as paid. Lead promoted to {new_status}.")

@api.post("/webhook/mercadopago")
async def mp_webhook(request: Request, background: BackgroundTasks):
    """Recibe notificaciones de Mercado Pago y actualiza el pedido."""
    try:
        body = await request.json()
    except Exception:
        body = {}
    qp = dict(request.query_params)
    logger.info(f"MP Webhook: query={qp} body={body}")
    # Topic puede venir como 'topic' (query) o 'type' (body)
    topic = qp.get("topic") or qp.get("type") or body.get("type") or body.get("topic")
    data_id = qp.get("id") or qp.get("data.id") or (body.get("data") or {}).get("id")
    if topic == "payment" and data_id and _mp_is_real():
        background.add_task(_process_mp_payment, str(data_id))
    return {"ok": True}

async def _process_mp_payment(payment_id: str):
    if not _mp_is_real():
        return
    try:
        sdk = mercadopago.SDK(MP_ACCESS_TOKEN)
        result = sdk.payment().get(payment_id)
        if result["status"] != 200:
            return
        info = result["response"]
        ext_ref = info.get("external_reference")
        status = info.get("status")  # approved, rejected, pending, cancelled
        if not ext_ref:
            return
        if status == "approved":
            await _mark_order_paid(ext_ref, payment_id)
        else:
            await db.orders.update_one(
                {"external_reference": ext_ref},
                {"$set": {"status": status, "payment_status": status, "mp_payment_id": payment_id, "updated_at": now_iso()}},
            )
    except Exception as e:
        logger.error(f"Error procesando pago MP: {e}")

# ------------------- ADMIN: orders, leads, dashboard -------------------
@api.get("/admin/orders")
async def admin_list_orders(_admin: dict = Depends(require_admin)):
    items = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api.get("/admin/leads")
async def admin_list_leads(_admin: dict = Depends(require_admin)):
    items = await db.leads.find({}, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    return items

@api.put("/admin/leads/{lead_id}")
async def admin_update_lead(lead_id: str, payload: LeadUpdateIn, _admin: dict = Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    update["updated_at"] = now_iso()
    res = await db.leads.update_one({"id": lead_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    return await db.leads.find_one({"id": lead_id}, {"_id": 0})

@api.get("/admin/chat-sessions")
async def admin_chat_sessions(_admin: dict = Depends(require_admin)):
    sessions = await db.chat_sessions.find({}, {"_id": 0}).sort("last_message_at", -1).to_list(500)
    return sessions

@api.get("/admin/chat-sessions/{session_id}/messages")
async def admin_chat_messages(session_id: str, _admin: dict = Depends(require_admin)):
    msgs = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return msgs

@api.get("/admin/dashboard")
async def admin_dashboard(_admin: dict = Depends(require_admin)):
    total_orders = await db.orders.count_documents({})
    paid_orders = await db.orders.count_documents({"status": "approved"})
    pending_orders = await db.orders.count_documents({"status": "pending"})
    total_leads = await db.leads.count_documents({})
    customers = await db.leads.count_documents({"status": {"$in": ["customer", "recurrent"]}})
    total_products = await db.products.count_documents({"active": True})
    # revenue
    pipeline = [{"$match": {"status": "approved"}}, {"$group": {"_id": None, "total": {"$sum": "$total"}}}]
    rev = await db.orders.aggregate(pipeline).to_list(1)
    revenue = rev[0]["total"] if rev else 0
    chat_sessions = await db.chat_sessions.count_documents({})
    return {
        "total_orders": total_orders,
        "paid_orders": paid_orders,
        "pending_orders": pending_orders,
        "revenue": revenue,
        "total_leads": total_leads,
        "customers": customers,
        "total_products": total_products,
        "chat_sessions": chat_sessions,
    }

# ------------------- CHATBOT IA -------------------
SALES_AGENT_SYSTEM_PROMPT = """Sos "Nuez", el asistente de ventas inteligente de **Frutos Secos Premium**, un e-commerce argentino que vende frutos secos de alta calidad con envíos a todo el país.

🎯 TU MISIÓN:
1. Asesorar de forma cálida y amistosa al cliente sobre nuestros productos.
2. Recomendar combos según necesidades (snack, regalo, salud, deportistas, repostería).
3. Resolver dudas sobre envíos, formas de pago (Mercado Pago) y calidad.
4. Capturar nombre y email del cliente lo antes posible (de forma natural, no invasiva) para enviarle ofertas.
5. Cerrar la venta: indicarle al cliente que puede agregar productos al carrito desde el catálogo y proceder al checkout. Si te pide ayuda para armar el pedido, dale links/nombres claros.

📦 NUESTROS PRODUCTOS:
{products_context}

🌎 ENVÍOS:
- Envíos a todo Argentina.
- CABA y GBA: 24-48hs. Interior: 3-7 días hábiles.
- Envío gratis en compras superiores a $25.000 ARS.

💳 PAGOS:
- Aceptamos Mercado Pago: tarjeta de crédito/débito, efectivo (Rapipago/Pago Fácil), transferencia.
- Pago 100% seguro.

🗣️ TONO:
- Español rioplatense argentino ("vos", "tenés", "querés").
- Cálido, cercano, experto. Nunca robótico.
- Respuestas cortas (2-4 oraciones) salvo que el cliente pida detalles.
- Usá ocasionalmente emojis sutiles 🌰✨ pero sin abusar.

⚠️ NUNCA:
- Inventes productos que no están en el catálogo.
- Prometas precios distintos a los listados.
- Pidas datos sensibles (tarjeta, DNI completo).

Si el cliente está listo para comprar, decile: "Genial! Podés agregar los productos al carrito desde el catálogo y al finalizar te lleva al checkout con Mercado Pago. ¿Te ayudo a elegir algo más?"
"""

async def _build_products_context() -> str:
    products = await db.products.find({"active": True}, {"_id": 0}).to_list(50)
    if not products:
        return "(catálogo vacío)"
    lines = []
    for p in products[:20]:
        opts = ", ".join([f"{o['weight']}=${o['price']}" for o in p.get("weight_options", [])]) or f"${p.get('base_price', 0)}"
        lines.append(f"- {p['name']}: {p.get('description','')[:80]} | Presentaciones: {opts}")
    return "\n".join(lines)

@api.post("/chat")
async def chat(payload: ChatIn):
    session_id = payload.session_id
    # Save user message
    user_msg = {
        "id": gen_id(),
        "session_id": session_id,
        "role": "user",
        "text": payload.message,
        "created_at": now_iso(),
    }
    await db.chat_messages.insert_one(user_msg)

    # Ensure session
    session = await db.chat_sessions.find_one({"session_id": session_id})
    if not session:
        await db.chat_sessions.insert_one({
            "id": gen_id(),
            "session_id": session_id,
            "user_email": payload.user_email,
            "user_name": payload.user_name,
            "created_at": now_iso(),
            "last_message_at": now_iso(),
        })
    else:
        update = {"last_message_at": now_iso()}
        if payload.user_email and not session.get("user_email"):
            update["user_email"] = payload.user_email
        if payload.user_name and not session.get("user_name"):
            update["user_name"] = payload.user_name
        await db.chat_sessions.update_one({"session_id": session_id}, {"$set": update})

    # If we have email, register as lead
    if payload.user_email:
        await upsert_lead(payload.user_email, payload.user_name or "", "", source="chat")

    # Build context with products
    products_ctx = await _build_products_context()
    sys_prompt = SALES_AGENT_SYSTEM_PROMPT.format(products_context=products_ctx)

    if not EMERGENT_LLM_KEY:
        reply = "Hola! Por ahora el asistente IA no está configurado. Te invitamos a navegar el catálogo. 🌰"
    else:
        try:
            chat_obj = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=session_id,
                system_message=sys_prompt,
            ).with_model("openai", "gpt-5.2")
            # Replay last 12 messages as context (excluding the one just added if duplicated)
            history = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
            # Send full conversation: replay all prior user messages so LLM has context.
            # Simpler: just send the current user message (LlmChat handles its own history per session).
            reply = await chat_obj.send_message(UserMessage(text=payload.message))
            if not isinstance(reply, str):
                reply = str(reply)
        except Exception as e:
            logger.error(f"LLM error: {e}")
            reply = "Disculpá, tuve un inconveniente técnico. Probá de nuevo en un momento. 🌰"

    bot_msg = {
        "id": gen_id(),
        "session_id": session_id,
        "role": "assistant",
        "text": reply,
        "created_at": now_iso(),
    }
    await db.chat_messages.insert_one(bot_msg)
    return {"reply": reply, "session_id": session_id}

@api.get("/chat/{session_id}/messages")
async def get_chat_messages(session_id: str):
    msgs = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return msgs

# ------------------- SEED -------------------
SEED_PRODUCTS = [
    {
        "name": "Almendras Premium",
        "description": "Almendras enteras, naturales, tostadas suavemente. Crujientes y dulces, ideales para snack saludable o repostería.",
        "category": "frutos-secos",
        "base_price": 4500,
        "image": "https://images.unsplash.com/photo-1608797178974-15b35a64ede9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwyfHxhbG1vbmRzfGVufDB8fHx8MTc3ODUwNjUwOXww&ixlib=rb-4.1.0&q=85",
        "images": [
            "https://images.unsplash.com/photo-1600188999986-331bec5f9a8d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwzfHxhbG1vbmRzfGVufDB8fHx8MTc3ODUwNjUwOXww&ixlib=rb-4.1.0&q=85"
        ],
        "weight_options": [
            {"weight": "250g", "price": 4500, "stock": 50},
            {"weight": "500g", "price": 8500, "stock": 40},
            {"weight": "1kg", "price": 15500, "stock": 25},
        ],
        "featured": True,
        "active": True,
        "tags": ["sin-tacc", "natural", "saludable"],
    },
    {
        "name": "Nueces Mariposa",
        "description": "Nueces enteras mariposa, primera calidad. Sabor intenso, ricas en omega-3.",
        "category": "frutos-secos",
        "base_price": 5200,
        "image": "https://images.unsplash.com/photo-1524593000379-d4729b2c4f99?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwyfHx3YWxudXRzfGVufDB8fHx8MTc3ODUwNjUwOXww&ixlib=rb-4.1.0&q=85",
        "images": [
            "https://images.unsplash.com/photo-1524593656068-fbac72624bb0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwxfHx3YWxudXRzfGVufDB8fHx8MTc3ODUwNjUwOXww&ixlib=rb-4.1.0&q=85"
        ],
        "weight_options": [
            {"weight": "250g", "price": 5200, "stock": 35},
            {"weight": "500g", "price": 9800, "stock": 28},
            {"weight": "1kg", "price": 18000, "stock": 15},
        ],
        "featured": True,
        "active": True,
        "tags": ["omega-3", "natural"],
    },
    {
        "name": "Mix Frutos Secos Premium",
        "description": "Mezcla artesanal de almendras, nueces, castañas de cajú, avellanas y pistachos. Ideal para regalo o consumo diario.",
        "category": "mix",
        "base_price": 6500,
        "image": "https://images.pexels.com/photos/4589141/pexels-photo-4589141.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "images": [],
        "weight_options": [
            {"weight": "300g", "price": 6500, "stock": 40},
            {"weight": "600g", "price": 12000, "stock": 30},
            {"weight": "1kg", "price": 19500, "stock": 20},
        ],
        "featured": True,
        "active": True,
        "tags": ["regalo", "premium", "mix"],
    },
    {
        "name": "Castañas de Cajú Tostadas",
        "description": "Castañas de cajú enteras, tostadas con un toque de sal marina. Cremosas y adictivas.",
        "category": "frutos-secos",
        "base_price": 5800,
        "image": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?crop=entropy&cs=srgb&fm=jpg&w=940",
        "images": [],
        "weight_options": [
            {"weight": "250g", "price": 5800, "stock": 30},
            {"weight": "500g", "price": 11000, "stock": 22},
        ],
        "featured": False,
        "active": True,
        "tags": ["snack", "salado"],
    },
    {
        "name": "Pistachos Tostados",
        "description": "Pistachos turcos seleccionados, tostados y levemente salados. Con cáscara, crocantes.",
        "category": "frutos-secos",
        "base_price": 7200,
        "image": "https://images.unsplash.com/photo-1583077553281-d72eed9985dd?crop=entropy&cs=srgb&fm=jpg&w=940",
        "images": [],
        "weight_options": [
            {"weight": "200g", "price": 7200, "stock": 25},
            {"weight": "500g", "price": 16500, "stock": 12},
        ],
        "featured": True,
        "active": True,
        "tags": ["premium", "snack"],
    },
    {
        "name": "Pasas de Uva Rubias",
        "description": "Pasas de uva rubias sin semilla, jugosas y dulces. Para repostería o snack natural.",
        "category": "frutas-deshidratadas",
        "base_price": 2200,
        "image": "https://images.unsplash.com/photo-1599599810694-57a2ca8276a8?crop=entropy&cs=srgb&fm=jpg&w=940",
        "images": [],
        "weight_options": [
            {"weight": "500g", "price": 2200, "stock": 60},
            {"weight": "1kg", "price": 4000, "stock": 40},
        ],
        "featured": False,
        "active": True,
        "tags": ["dulce", "repostería"],
    },
    {
        "name": "Dátiles Medjool",
        "description": "Dátiles Medjool de primera, jumbo, carnosos y dulces como caramelo natural.",
        "category": "frutas-deshidratadas",
        "base_price": 8500,
        "image": "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?crop=entropy&cs=srgb&fm=jpg&w=940",
        "images": [],
        "weight_options": [
            {"weight": "250g", "price": 8500, "stock": 18},
            {"weight": "500g", "price": 16000, "stock": 10},
        ],
        "featured": True,
        "active": True,
        "tags": ["premium", "natural", "dulce"],
    },
    {
        "name": "Mix Deportista",
        "description": "Combo energético: almendras, maní, pasas, semillas de zapallo y arándanos. Perfecto para atletas.",
        "category": "mix",
        "base_price": 4800,
        "image": "https://images.unsplash.com/photo-1599909533730-c8f8a4abc8a5?crop=entropy&cs=srgb&fm=jpg&w=940",
        "images": [],
        "weight_options": [
            {"weight": "500g", "price": 4800, "stock": 45},
        ],
        "featured": False,
        "active": True,
        "tags": ["deportistas", "energía"],
    },
]

async def seed_data():
    # Admin user
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "id": gen_id(),
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin",
            "phone": "",
            "role": "admin",
            "created_at": now_iso(),
        })
        logger.info(f"Admin seeded: {ADMIN_EMAIL}")
    else:
        # Sync password if changed
        if not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
            await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}})
            logger.info("Admin password updated.")

    # Products
    count = await db.products.count_documents({})
    if count == 0:
        for p in SEED_PRODUCTS:
            doc = dict(p)
            doc["id"] = gen_id()
            doc["slug"] = slugify(doc["name"])
            doc["created_at"] = now_iso()
            doc["updated_at"] = now_iso()
            await db.products.insert_one(doc)
        logger.info(f"Seeded {len(SEED_PRODUCTS)} products.")

@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.products.create_index("slug", unique=True)
        await db.orders.create_index("external_reference", unique=True)
        await db.leads.create_index("email", unique=True)
        await db.chat_messages.create_index([("session_id", 1), ("created_at", 1)])
        await seed_data()
    except Exception as e:
        logger.error(f"Startup error: {e}")

@app.on_event("shutdown")
async def shutdown():
    client.close()

@api.get("/")
async def root():
    return {"app": "Frutos Secos Premium API", "status": "ok"}

app.include_router(api)
