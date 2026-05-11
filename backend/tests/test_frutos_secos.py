"""
Backend tests for Frutos Secos Premium e-commerce — iteration 2.
Covers: DIFRUMARKET products, margin slider, supplier sync, categories,
plus regression on auth, orders, mock-pay, webhook, chat IA, admin.
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
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def customer(session):
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = session.post(f"{API}/auth/register", json={
        "email": email, "password": "Test1234!", "name": "Test User", "phone": "1112223333"
    })
    assert r.status_code == 200, r.text
    return {"email": email, "token": r.json()["token"]}


# ---------- 1. DIFRUMARKET products list ----------
class TestDifrumarketProducts:
    def test_50_products_returned(self, session):
        r = session.get(f"{API}/products")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) == 50, f"Expected 50 DIFRUMARKET products, got {len(items)}"

    def test_product_schema_new_model(self, session):
        r = session.get(f"{API}/products")
        items = r.json()
        almendra = next((p for p in items if "Non Pareil 27/30" in p["name"]), None)
        assert almendra is not None, "Almendra Non Pareil 27/30 must be in seed"
        # New model fields
        assert "cost_per_kg" in almendra and almendra["cost_per_kg"] == 18750
        assert "margin_percent" in almendra and almendra["margin_percent"] == 25
        assert "supplier_price_5kg" in almendra
        assert "supplier_price_1kg" in almendra
        # base_price = price of 1kg weight_option
        assert "base_price" in almendra
        # weight_options structure
        opts = almendra["weight_options"]
        assert len(opts) >= 3
        for o in opts:
            assert "weight" in o and "weight_kg" in o and "price" in o and "stock" in o
        # 1kg matches base_price
        one_kg = next((o for o in opts if o["weight_kg"] == 1.0), None)
        assert one_kg is not None
        assert almendra["base_price"] == one_kg["price"]
        # Expected ~24795 from supplier_price_1kg
        assert one_kg["price"] == 24795


# ---------- 2. enrich_product computed price ----------
class TestEnrichProduct:
    def test_get_by_slug_returns_enriched(self, session):
        r = session.get(f"{API}/products")
        slug = r.json()[0]["slug"]
        r2 = session.get(f"{API}/products/{slug}")
        assert r2.status_code == 200
        p = r2.json()
        assert "base_price" in p
        for o in p["weight_options"]:
            assert o.get("price") is not None
            assert isinstance(o["price"], (int, float))

    def test_price_calculation_when_no_supplier(self, session):
        """For products without supplier_price_1kg, price must be computed cost × weight_kg × (1+margin/100)."""
        r = session.get(f"{API}/products")
        items = r.json()
        # Almendra Non Pareil 23/25 has supplier_price_1kg = None
        prod = next((p for p in items if "Non Pareil 23/25" in p["name"]), None)
        assert prod is not None
        # build_default_presentations uses rate_1kg = cost * 1.32 when sup_1kg is None
        cost = prod["cost_per_kg"]  # 19570
        margin = prod["margin_percent"]  # 25
        one_kg = next(o for o in prod["weight_options"] if o["weight_kg"] == 1.0)
        # The seed wrote price as round(cost * 1.32) since supplier_price_1kg is None
        # enrich_product preserves the explicit price (not None) → so price == round(19570 * 1.32) = 25832
        expected_seed_price = round(cost * 1.32)
        assert one_kg["price"] == expected_seed_price


# ---------- 3. Margin slider endpoint ----------
class TestMarginSlider:
    @pytest.fixture(scope="class")
    def test_product(self, session, admin_headers):
        """Create a TEST_ product for margin tests."""
        name = f"TEST_Margin_{uuid.uuid4().hex[:6]}"
        payload = {
            "name": name, "category": "mixs", "description": "test",
            "cost_per_kg": 10000, "margin_percent": 25,
            "image": "https://example.com/x.jpg",
            "weight_options": [
                {"weight": "250g", "weight_kg": 0.25, "price": None, "stock": 10},
                {"weight": "1kg", "weight_kg": 1.0, "price": None, "stock": 5},
            ],
        }
        r = session.post(f"{API}/admin/products", headers=admin_headers, json=payload)
        assert r.status_code == 200, r.text
        yield r.json()
        # cleanup
        session.delete(f"{API}/admin/products/{r.json()['id']}", headers=admin_headers)

    def test_patch_margin_recalculates_prices(self, session, admin_headers, test_product):
        pid = test_product["id"]
        # margin=25 → 1kg price = 10000 * 1.0 * 1.25 = 12500
        one_kg = next(o for o in test_product["weight_options"] if o["weight_kg"] == 1.0)
        assert one_kg["price"] == 12500

        # PATCH margin to 35
        r = session.patch(f"{API}/admin/products/{pid}/margin",
                          headers=admin_headers, json={"margin_percent": 35})
        assert r.status_code == 200
        updated = r.json()
        assert updated["margin_percent"] == 35
        new_one_kg = next(o for o in updated["weight_options"] if o["weight_kg"] == 1.0)
        # 10000 * 1.0 * 1.35 = 13500
        assert new_one_kg["price"] == 13500
        new_250 = next(o for o in updated["weight_options"] if o["weight_kg"] == 0.25)
        assert new_250["price"] == 3375  # 10000*0.25*1.35

    def test_margin_boundary_values(self, session, admin_headers, test_product):
        pid = test_product["id"]
        for m in [10, 25, 50]:
            r = session.patch(f"{API}/admin/products/{pid}/margin",
                              headers=admin_headers, json={"margin_percent": m})
            assert r.status_code == 200, f"margin={m} failed: {r.text}"
            assert r.json()["margin_percent"] == m

    def test_margin_negative_rejected(self, session, admin_headers, test_product):
        pid = test_product["id"]
        r = session.patch(f"{API}/admin/products/{pid}/margin",
                          headers=admin_headers, json={"margin_percent": -5})
        assert r.status_code == 400

    def test_margin_over_100_rejected(self, session, admin_headers, test_product):
        pid = test_product["id"]
        r = session.patch(f"{API}/admin/products/{pid}/margin",
                          headers=admin_headers, json={"margin_percent": 200})
        assert r.status_code == 400

    def test_margin_unauthenticated(self, session, test_product):
        r = session.patch(f"{API}/admin/products/{test_product['id']}/margin",
                          json={"margin_percent": 30})
        assert r.status_code in (401, 403)

    def test_margin_customer_forbidden(self, session, customer, test_product):
        r = session.patch(
            f"{API}/admin/products/{test_product['id']}/margin",
            headers={"Authorization": f"Bearer {customer['token']}", "Content-Type": "application/json"},
            json={"margin_percent": 30},
        )
        assert r.status_code == 403

    def test_margin_persists_on_get(self, session, admin_headers, test_product):
        pid = test_product["id"]
        session.patch(f"{API}/admin/products/{pid}/margin",
                      headers=admin_headers, json={"margin_percent": 40})
        # GET via slug
        r = session.get(f"{API}/products/{test_product['slug']}")
        assert r.status_code == 200
        assert r.json()["margin_percent"] == 40
        one_kg = next(o for o in r.json()["weight_options"] if o["weight_kg"] == 1.0)
        # 10000*1.0*1.4 = 14000
        assert one_kg["price"] == 14000

    def test_margin_404_unknown_product(self, session, admin_headers):
        r = session.patch(f"{API}/admin/products/nonexistent-id-xyz/margin",
                          headers=admin_headers, json={"margin_percent": 30})
        assert r.status_code == 404


# ---------- 4. Create/Update product new model ----------
class TestProductCRUDNewModel:
    def test_create_new_model(self, session, admin_headers):
        name = f"TEST_New_{uuid.uuid4().hex[:6]}"
        payload = {
            "name": name, "category": "nuez", "description": "Test",
            "cost_per_kg": 15000, "margin_percent": 30,
            "supplier_price_5kg": 18000, "supplier_price_1kg": 20000,
            "image": "https://example.com/i.jpg",
            "weight_options": [
                {"weight": "500g", "weight_kg": 0.5, "price": None, "stock": 20},
                {"weight": "1kg", "weight_kg": 1.0, "price": 20000, "stock": 10},
            ],
        }
        r = session.post(f"{API}/admin/products", headers=admin_headers, json=payload)
        assert r.status_code == 200, r.text
        prod = r.json()
        assert prod["cost_per_kg"] == 15000
        assert prod["margin_percent"] == 30
        # 500g price computed: 15000*0.5*1.3 = 9750
        opt_500 = next(o for o in prod["weight_options"] if o["weight_kg"] == 0.5)
        assert opt_500["price"] == 9750
        # 1kg price explicit
        opt_1 = next(o for o in prod["weight_options"] if o["weight_kg"] == 1.0)
        assert opt_1["price"] == 20000
        pid = prod["id"]

        # PUT update
        payload["margin_percent"] = 20
        r2 = session.put(f"{API}/admin/products/{pid}", headers=admin_headers, json=payload)
        assert r2.status_code == 200
        # cleanup
        session.delete(f"{API}/admin/products/{pid}", headers=admin_headers)


# ---------- 5. Supplier sync ----------
class TestSupplierSync:
    def test_sync_no_auth(self, session):
        r = session.post(f"{API}/admin/sync-supplier")
        assert r.status_code in (401, 403)

    def test_sync_customer_forbidden(self, session, customer):
        r = session.post(f"{API}/admin/sync-supplier",
                         headers={"Authorization": f"Bearer {customer['token']}"})
        assert r.status_code == 403

    def test_sync_admin_success(self, session, admin_headers):
        r = session.post(f"{API}/admin/sync-supplier", headers=admin_headers, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True, f"sync result: {data}"
        # Expected at least 30 matches per problem statement
        assert data.get("updated", 0) >= 30, f"Expected >=30, got {data.get('updated')}"
        assert data.get("synced_at")

    def test_sync_status_admin(self, session, admin_headers):
        r = session.get(f"{API}/admin/sync-status", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "last_synced_at" in data
        assert "supplier_url" in data
        assert data["last_synced_at"] is not None
        assert "docs.google.com" in data["supplier_url"]

    def test_sync_status_no_auth(self, session):
        r = session.get(f"{API}/admin/sync-status")
        assert r.status_code in (401, 403)


# ---------- 6. Categories ----------
class TestCategories:
    def test_categories_list(self, session):
        r = session.get(f"{API}/categories")
        assert r.status_code == 200
        cats = r.json()
        assert isinstance(cats, list)
        assert len(cats) >= 5
        for needed in ["almendra-non-pareil", "nuez", "semillas", "mixs"]:
            assert needed in cats, f"Missing category {needed}: got {cats}"

    def test_filter_by_category(self, session):
        r = session.get(f"{API}/products", params={"category": "mixs"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        for p in items:
            assert p["category"] == "mixs"


# ---------- 7. Regression auth ----------
class TestAuthRegression:
    def test_login_admin(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "WRONG"})
        assert r.status_code == 401

    def test_me_no_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- 8. Regression orders ----------
class TestOrdersRegression:
    def test_create_order_and_mock_pay(self, session, admin_headers):
        # Use a real product price for the order
        prods = session.get(f"{API}/products").json()
        prod = prods[0]
        opt = prod["weight_options"][0]
        email = f"buyer_{uuid.uuid4().hex[:8]}@example.com"
        r = session.post(f"{API}/orders", json={
            "items": [{
                "product_id": prod["id"], "name": prod["name"], "weight": opt["weight"],
                "unit_price": opt["price"], "quantity": 1, "image": prod["image"]
            }],
            "customer": {
                "email": email, "name": "Buyer", "phone": "1112223333",
                "address": "C1", "city": "CABA", "province": "CABA", "zip": "1000", "notes": ""
            },
            "shipping_cost": 500,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["is_mock"] is True
        ext_ref = d["order"]["external_reference"]

        # Mock pay
        r2 = session.post(f"{API}/orders/{ext_ref}/mock-pay")
        assert r2.status_code == 200
        assert r2.json()["status"] == "approved"

        # Lead promoted
        r3 = session.get(f"{API}/admin/leads", headers=admin_headers)
        lead = next((l for l in r3.json() if l["email"] == email.lower()), None)
        assert lead is not None and lead["status"] in ("customer", "recurrent")

    def test_webhook_ok(self, session):
        r = session.post(f"{API}/webhook/mercadopago", json={"foo": "bar"})
        assert r.status_code == 200


# ---------- 9. Chat IA mentions DIFRUMARKET ----------
class TestChatDifrumarket:
    def test_chat_mentions_real_products(self, session):
        sid = f"sess_{uuid.uuid4().hex[:8]}"
        r = session.post(f"{API}/chat", json={
            "session_id": sid, "message": "Qué mixes tenés disponibles?"
        }, timeout=60)
        assert r.status_code == 200
        reply = r.json()["reply"].lower()
        # Should mention at least one DIFRUMARKET mix
        assert any(k in reply for k in ["mix", "premium", "happy", "caribe", "energético", "energetico", "salado"])
        assert "no está configurado" not in reply


# ---------- 10. Admin dashboard regression ----------
class TestAdminRegression:
    def test_dashboard(self, session, admin_headers):
        r = session.get(f"{API}/admin/dashboard", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["total_products"] == 50

    def test_admin_orders(self, session, admin_headers):
        r = session.get(f"{API}/admin/orders", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_chat_sessions(self, session, admin_headers):
        r = session.get(f"{API}/admin/chat-sessions", headers=admin_headers)
        assert r.status_code == 200

    def test_admin_no_token(self, session):
        r = session.get(f"{API}/admin/dashboard")
        assert r.status_code == 401
