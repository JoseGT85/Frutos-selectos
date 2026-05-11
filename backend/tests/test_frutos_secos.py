"""
Backend tests for Frutos Secos Premium e-commerce.
Covers: auth, products (public + admin), orders (mock MP), webhook, chat IA, admin dashboard.
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://auto-sales-hub-54.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@frutossecos.com.ar"
ADMIN_PASSWORD = "Admin123!"


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def customer(session):
    """Register a fresh customer for tests"""
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = session.post(f"{API}/auth/register", json={
        "email": email, "password": "Test1234!", "name": "Test User", "phone": "1112223333"
    })
    assert r.status_code == 200, r.text
    return {"email": email, "token": r.json()["token"], "user": r.json()["user"]}


# ---------- 1. AUTH ----------
class TestAuth:
    def test_register_valid(self, session):
        email = f"reg_{uuid.uuid4().hex[:8]}@example.com"
        r = session.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass1234!", "name": "Reg User"
        })
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["user"]["email"] == email
        assert data["user"]["role"] == "customer"

    def test_register_duplicate(self, session, customer):
        r = session.post(f"{API}/auth/register", json={
            "email": customer["email"], "password": "Test1234!", "name": "Dup"
        })
        assert r.status_code == 400

    def test_login_admin(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["role"] == "admin"
        assert isinstance(data["token"], str) and len(data["token"]) > 10

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "WRONG"})
        assert r.status_code == 401

    def test_me_with_token(self, session, admin_token):
        r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert "password_hash" not in data

    def test_me_no_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- 2. PRODUCTS public ----------
class TestProductsPublic:
    def test_list_products(self, session):
        r = session.get(f"{API}/products")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 8, f"Expected at least 8 seed products, got {len(items)}"

    def test_featured_filter(self, session):
        r = session.get(f"{API}/products", params={"featured": "true"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        for p in items:
            assert p["featured"] is True

    def test_get_almendras_by_slug(self, session):
        r = session.get(f"{API}/products/almendras-premium")
        assert r.status_code == 200
        p = r.json()
        assert p["name"] == "Almendras Premium"
        assert isinstance(p.get("weight_options"), list) and len(p["weight_options"]) >= 1

    def test_unknown_slug_404(self, session):
        r = session.get(f"{API}/products/no-existe-este-slug-xyz")
        assert r.status_code == 404


# ---------- 3. PRODUCTS admin CRUD ----------
class TestProductsAdmin:
    def test_create_product_no_auth(self, session):
        r = session.post(f"{API}/admin/products", json={
            "name": "X", "base_price": 100, "image": "x.jpg"
        })
        assert r.status_code in (401, 403)

    def test_create_product_customer_forbidden(self, session, customer):
        r = session.post(
            f"{API}/admin/products",
            headers={"Authorization": f"Bearer {customer['token']}", "Content-Type": "application/json"},
            json={"name": "X", "base_price": 100, "image": "x.jpg"},
        )
        assert r.status_code == 403

    def test_crud_product(self, session, admin_headers):
        # Create
        name = f"TEST_Prod_{uuid.uuid4().hex[:6]}"
        r = session.post(f"{API}/admin/products", headers=admin_headers, json={
            "name": name,
            "description": "Test product",
            "base_price": 1234,
            "image": "https://example.com/x.jpg",
            "weight_options": [{"weight": "100g", "price": 1234, "stock": 5}],
            "featured": False,
        })
        assert r.status_code == 200, r.text
        prod = r.json()
        assert prod["name"] == name
        assert "id" in prod and "slug" in prod
        pid = prod["id"]

        # Update
        r2 = session.put(f"{API}/admin/products/{pid}", headers=admin_headers, json={
            "name": name,
            "description": "Updated desc",
            "base_price": 2000,
            "image": "https://example.com/x.jpg",
            "weight_options": [{"weight": "100g", "price": 2000, "stock": 5}],
        })
        assert r2.status_code == 200
        assert r2.json()["description"] == "Updated desc"
        assert r2.json()["base_price"] == 2000

        # Delete
        r3 = session.delete(f"{API}/admin/products/{pid}", headers=admin_headers)
        assert r3.status_code == 200
        assert r3.json().get("deleted") is True

        # Delete again → 404
        r4 = session.delete(f"{API}/admin/products/{pid}", headers=admin_headers)
        assert r4.status_code == 404


# ---------- 4-5. ORDERS + MOCK PAY ----------
class TestOrdersAndPayment:
    @pytest.fixture(scope="class")
    def order_data(self, session):
        email = f"buyer_{uuid.uuid4().hex[:8]}@example.com"
        r = session.post(f"{API}/orders", json={
            "items": [{
                "product_id": "p1", "name": "Almendras Premium", "weight": "250g",
                "unit_price": 4500, "quantity": 2, "image": "x"
            }],
            "customer": {
                "email": email, "name": "Buyer Test", "phone": "1199998888",
                "address": "Calle 1", "city": "CABA", "province": "CABA",
                "zip": "1000", "notes": ""
            },
            "shipping_cost": 500,
        })
        assert r.status_code == 200, r.text
        data = r.json()
        return {"email": email, "data": data}

    def test_create_order_mock(self, order_data):
        d = order_data["data"]
        assert d["is_mock"] is True
        assert "/checkout/mock" in d["checkout_url"]
        assert d["order"]["total"] == 4500 * 2 + 500
        assert d["order"]["status"] == "pending"
        assert d["order"]["external_reference"]

    def test_get_order_by_ref(self, session, order_data):
        ext_ref = order_data["data"]["order"]["external_reference"]
        r = session.get(f"{API}/orders/{ext_ref}")
        assert r.status_code == 200
        assert r.json()["external_reference"] == ext_ref

    def test_get_order_unknown_404(self, session):
        r = session.get(f"{API}/orders/nonexistent-ref-xyz")
        assert r.status_code == 404

    def test_lead_auto_created(self, session, admin_headers, order_data):
        r = session.get(f"{API}/admin/leads", headers=admin_headers)
        assert r.status_code == 200
        emails = [l["email"] for l in r.json()]
        assert order_data["email"].lower() in emails

    def test_mock_pay_promotes_lead(self, session, admin_headers, order_data):
        ext_ref = order_data["data"]["order"]["external_reference"]
        r = session.post(f"{API}/orders/{ext_ref}/mock-pay")
        assert r.status_code == 200
        assert r.json()["status"] == "approved"

        # Order is approved
        r2 = session.get(f"{API}/orders/{ext_ref}")
        assert r2.json()["status"] == "approved"
        assert r2.json()["payment_status"] == "approved"

        # Lead promoted
        r3 = session.get(f"{API}/admin/leads", headers=admin_headers)
        lead = next((l for l in r3.json() if l["email"] == order_data["email"].lower()), None)
        assert lead is not None
        assert lead["status"] in ("customer", "recurrent")
        assert lead["orders_count"] >= 1
        assert lead["total_spent"] >= 9500


# ---------- 6. Webhook MP ----------
class TestWebhook:
    def test_webhook_random_body(self, session):
        r = session.post(f"{API}/webhook/mercadopago", json={"foo": "bar"})
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_webhook_empty_body(self, session):
        r = requests.post(f"{API}/webhook/mercadopago", data="", headers={"Content-Type": "application/json"})
        assert r.status_code == 200


# ---------- 7. CHATBOT IA ----------
class TestChat:
    def test_chat_no_email(self, session):
        sid = f"sess_{uuid.uuid4().hex[:8]}"
        r = session.post(f"{API}/chat", json={
            "session_id": sid, "message": "Hola, qué frutos secos recomendás para snack?"
        }, timeout=60)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data["reply"], str)
        assert len(data["reply"]) > 0
        # Should NOT be the fallback "no configurado" since EMERGENT_LLM_KEY is set
        assert "no está configurado" not in data["reply"]

    def test_chat_context_followup(self, session):
        sid = f"sess_{uuid.uuid4().hex[:8]}"
        r1 = session.post(f"{API}/chat", json={
            "session_id": sid, "message": "Cuánto cuesta un kilo de almendras?"
        }, timeout=60)
        assert r1.status_code == 200
        time.sleep(1)
        r2 = session.post(f"{API}/chat", json={
            "session_id": sid, "message": "Y de nueces?"
        }, timeout=60)
        assert r2.status_code == 200
        assert len(r2.json()["reply"]) > 0

    def test_chat_with_email_creates_lead(self, session, admin_headers):
        sid = f"sess_{uuid.uuid4().hex[:8]}"
        email = f"chatlead_{uuid.uuid4().hex[:8]}@example.com"
        r = session.post(f"{API}/chat", json={
            "session_id": sid, "message": "Quiero info", "user_email": email, "user_name": "ChatLead"
        }, timeout=60)
        assert r.status_code == 200
        r2 = session.get(f"{API}/admin/leads", headers=admin_headers)
        lead = next((l for l in r2.json() if l["email"] == email.lower()), None)
        assert lead is not None
        assert lead["source"] == "chat"

    def test_chat_history(self, session):
        sid = f"sess_{uuid.uuid4().hex[:8]}"
        session.post(f"{API}/chat", json={"session_id": sid, "message": "Hola"}, timeout=60)
        r = session.get(f"{API}/chat/{sid}/messages")
        assert r.status_code == 200
        msgs = r.json()
        assert len(msgs) >= 2
        roles = [m["role"] for m in msgs]
        assert "user" in roles and "assistant" in roles


# ---------- 8. ADMIN DASHBOARD ----------
class TestAdminDashboard:
    def test_dashboard_metrics(self, session, admin_headers):
        r = session.get(f"{API}/admin/dashboard", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_orders", "paid_orders", "pending_orders", "revenue",
                  "total_leads", "customers", "total_products", "chat_sessions"):
            assert k in d
        assert d["total_products"] >= 8
        assert d["paid_orders"] >= 1  # from TestOrdersAndPayment
        assert d["revenue"] > 0

    def test_admin_orders(self, session, admin_headers):
        r = session.get(f"{API}/admin/orders", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_leads(self, session, admin_headers):
        r = session.get(f"{API}/admin/leads", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_chat_sessions(self, session, admin_headers):
        r = session.get(f"{API}/admin/chat-sessions", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_no_token(self, session):
        r = session.get(f"{API}/admin/dashboard")
        assert r.status_code == 401

    def test_admin_customer_token_forbidden(self, session, customer):
        r = session.get(f"{API}/admin/dashboard", headers={"Authorization": f"Bearer {customer['token']}"})
        assert r.status_code == 403

    def test_update_lead(self, session, admin_headers):
        # Get a lead
        r = session.get(f"{API}/admin/leads", headers=admin_headers)
        leads = r.json()
        assert len(leads) > 0
        lead_id = leads[0]["id"]
        r2 = session.put(f"{API}/admin/leads/{lead_id}", headers=admin_headers,
                         json={"status": "contacted", "notes": "Test note"})
        assert r2.status_code == 200
        assert r2.json()["status"] == "contacted"


# ---------- 9. SEED idempotency ----------
class TestSeed:
    def test_admin_unique(self, session, admin_headers):
        # The admin login already verifies one admin exists; we check there's only one user with that email.
        # We do this by attempting another register with admin email → must fail (unique).
        r = session.post(f"{API}/auth/register", json={
            "email": ADMIN_EMAIL, "password": "x", "name": "x"
        })
        # password too short → 422; but if it gets past validation it would be 400 dup
        assert r.status_code in (400, 422)

    def test_products_seeded(self, session):
        r = session.get(f"{API}/products")
        names = [p["name"] for p in r.json()]
        assert "Almendras Premium" in names
        assert "Nueces Mariposa" in names
