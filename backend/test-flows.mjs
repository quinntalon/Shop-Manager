/**
 * End-to-end flow tests for the Fastify-migrated API.
 * Runs against http://localhost:3001 using a real Clerk session JWT.
 *
 * Flows tested:
 *  1. Settings  (proves auth + DB connectivity)
 *  2. Add product
 *  3. Create sale – Cash  (with cart discount)
 *  4. Create sale – MoMo  (with transaction ID)
 *  5. Create sale – Card
 *  6. Create sale – Bank  (with bank name)
 *  7. Create sale – Delivery  (pay_on_delivery)
 *  8. Inventory decrements  (verify stock after each sale)
 *  9. Receipt templates
 * 10. Health check
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

const BASE      = "http://localhost:3001/api";
const SESSION   = "sess_3GXmrsJDTjoQbZlyC8z3M2imz9P";
const CLERK_SK  = process.env.CLERK_SECRET_KEY;

// ── helpers ──────────────────────────────────────────────────────────────────

async function freshJwt() {
  const res = await fetch(
    `https://api.clerk.com/v1/sessions/${SESSION}/tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLERK_SK}`,
        "Content-Type": "application/json",
      },
    }
  );
  const { jwt } = await res.json();
  if (!jwt) throw new Error("Could not obtain JWT");
  return jwt;
}

let _jwt = null;
let _jwtAt = 0;
async function jwt() {
  const age = Date.now() - _jwtAt;
  if (!_jwt || age > 50_000) {         // refresh every 50 s (tokens live 60 s)
    _jwt = await freshJwt();
    _jwtAt = Date.now();
    log("  [auth] obtained fresh JWT");
  }
  return _jwt;
}

async function api(method, path, body) {
  const token = await jwt();
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

const PASS = "✅";
const FAIL = "❌";
const WARN = "⚠️ ";

let passed = 0, failed = 0;
const failures = [];

function log(msg) { process.stdout.write(msg + "\n"); }

function assert(label, condition, detail = "") {
  if (condition) {
    log(`  ${PASS} ${label}`);
    passed++;
  } else {
    log(`  ${FAIL} ${label}${detail ? " — " + detail : ""}`);
    failed++;
    failures.push(label);
  }
}

// ── 0. Health ─────────────────────────────────────────────────────────────────
log("\n── 0. Health check ──");
{
  const res = await fetch(`${BASE}/healthz`);
  const data = await res.json();
  assert("GET /api/healthz → 200", res.status === 200, JSON.stringify(data));
  assert("status=ok", data?.status === "ok");
}

// ── 1. Settings ───────────────────────────────────────────────────────────────
log("\n── 1. Settings (auth + DB) ──");
{
  const { status, data } = await api("GET", "/settings");
  assert("GET /api/settings → 200", status === 200, JSON.stringify(data));
  assert("has businessName field", "businessName" in (data ?? {}));
}

// ── 2. Categories – create one so products have a category ───────────────────
log("\n── 2. Categories ──");
let categoryId;
{
  const { status, data } = await api("POST", "/categories", {
    name: "Test Category",
    description: "For flow testing",
  });
  assert("POST /api/categories → 201", status === 201, JSON.stringify(data));
  assert("has id", typeof data?.id === "number");
  categoryId = data?.id;
}

// ── 3. Add product ────────────────────────────────────────────────────────────
log("\n── 3. Add product ──");
let productId, initialStock;
{
  const { status, data } = await api("POST", "/products", {
    name: "Test Widget",
    sku: `TEST-${Date.now()}`,
    price: 100,
    costPrice: 60,
    stock: 50,
    reorderLevel: 5,
    categoryId,
  });
  assert("POST /api/products → 201", status === 201, JSON.stringify(data));
  assert("has id", typeof data?.id === "number");
  assert("stock=50", data?.stock === 50);
  productId = data?.id;
  initialStock = data?.stock ?? 50;
  log(`     productId=${productId}  initialStock=${initialStock}`);
}

// ── helper: create a sale and return it ──────────────────────────────────────
async function createSale(label, body, expectedStatus = 201) {
  const { status, data } = await api("POST", "/sales", body);
  assert(`${label} → ${expectedStatus}`, status === expectedStatus, JSON.stringify(data).slice(0, 200));
  return data;
}

// ── 4. Create sale – Cash (with cart discount) ────────────────────────────────
log("\n── 4. Sale – Cash + cart discount ──");
let saleCash;
{
  saleCash = await createSale("POST /api/sales (cash)", {
    paymentMethod: "cash",
    items: [{ productId, quantity: 2, discount: 10 }],
    cartDiscount: 5,
    customerName: "Alice",
  });
  if (saleCash?.id) {
    assert("paymentMethod=cash",      saleCash.paymentMethod === "cash");
    assert("subtotal=200",            saleCash.subtotal === 200);
    assert("item discount=10",        saleCash.items[0].discount === 10);
    assert("cartDiscount=5",          saleCash.cartDiscount === 5);
    assert("total=185",               saleCash.total === 185,
      `got ${saleCash.total}`);
  }
}

// ── 5. Create sale – MoMo ────────────────────────────────────────────────────
log("\n── 5. Sale – MoMo ──");
let saleMomo;
{
  // should fail without transactionId
  const { status: s400 } = await api("POST", "/sales", {
    paymentMethod: "momo",
    items: [{ productId, quantity: 1 }],
  });
  assert("MoMo without txId → 400", s400 === 400);

  saleMomo = await createSale("POST /api/sales (momo)", {
    paymentMethod: "momo",
    transactionId: "MOMO-12345",
    items: [{ productId, quantity: 1 }],
  });
  if (saleMomo?.id) {
    assert("paymentMethod=momo",      saleMomo.paymentMethod === "momo");
    assert("transactionId stored",    saleMomo.transactionId === "MOMO-12345");
  }
}

// ── 6. Create sale – Card ────────────────────────────────────────────────────
log("\n── 6. Sale – Card ──");
let saleCard;
{
  saleCard = await createSale("POST /api/sales (card)", {
    paymentMethod: "card",
    items: [{ productId, quantity: 1 }],
  });
  if (saleCard?.id) {
    assert("paymentMethod=card", saleCard.paymentMethod === "card");
  }
}

// ── 7. Create sale – Bank ────────────────────────────────────────────────────
log("\n── 7. Sale – Bank ──");
let saleBank;
{
  // should fail without bankName
  const { status: s400 } = await api("POST", "/sales", {
    paymentMethod: "bank",
    items: [{ productId, quantity: 1 }],
  });
  assert("Bank without bankName → 400", s400 === 400);

  saleBank = await createSale("POST /api/sales (bank)", {
    paymentMethod: "bank",
    bankName: "VCB",
    items: [{ productId, quantity: 1 }],
  });
  if (saleBank?.id) {
    assert("paymentMethod=bank",  saleBank.paymentMethod === "bank");
    assert("bankName=VCB",        saleBank.bankName === "VCB");
  }
}

// ── 8. Create sale – Delivery ─────────────────────────────────────────────────
log("\n── 8. Sale – Delivery ──");
let saleDelivery;
{
  // should fail without deliveryPaymentStatus
  const { status: s400 } = await api("POST", "/sales", {
    paymentMethod: "delivery",
    items: [{ productId, quantity: 1 }],
  });
  assert("Delivery without status → 400", s400 === 400);

  saleDelivery = await createSale("POST /api/sales (delivery)", {
    paymentMethod: "delivery",
    deliveryPaymentStatus: "pay_on_delivery",
    customerName: "Bob",
    customerPhone: "0901234567",
    note: "Fragile",
    items: [{ productId, quantity: 1 }],
  });
  if (saleDelivery?.id) {
    assert("paymentMethod=delivery",         saleDelivery.paymentMethod === "delivery");
    assert("deliveryPaymentStatus stored",   saleDelivery.deliveryPaymentStatus === "pay_on_delivery");
    assert("customerPhone stored",           saleDelivery.customerPhone === "0901234567");
  }
}

// ── 9. Inventory decrement verification ───────────────────────────────────────
log("\n── 9. Inventory decrement ──");
{
  const { status, data } = await api("GET", `/products/${productId}`);
  assert("GET /api/products/:id → 200", status === 200);
  if (data) {
    // Sales consumed: cash×2, momo×1, card×1, bank×1, delivery×1 = 6 units
    const expectedStock = initialStock - 6;
    assert(
      `stock decreased by 6 (${initialStock} → ${expectedStock})`,
      data.stock === expectedStock,
      `got stock=${data.stock}, expected ${expectedStock}`
    );
  }
}

// ── 10. Insufficient-stock guard ─────────────────────────────────────────────
log("\n── 10. Insufficient-stock guard ──");
{
  const { status, data } = await api("POST", "/sales", {
    paymentMethod: "cash",
    items: [{ productId, quantity: 9999 }],
  });
  assert("Over-stock sale → 400", status === 400, data?.error);
  assert("error message mentions stock", /stock/i.test(data?.error ?? ""));
}

// ── 11. Discount guard (discount > line total) ───────────────────────────────
log("\n── 11. Discount > line total guard ──");
{
  const { status, data } = await api("POST", "/sales", {
    paymentMethod: "cash",
    items: [{ productId, quantity: 1, discount: 99999 }],
  });
  assert("Excessive discount → 400", status === 400, data?.error);
  assert("error message mentions discount", /discount/i.test(data?.error ?? ""));
}

// ── 12. Receipt templates ─────────────────────────────────────────────────────
log("\n── 12. Receipt templates ──");
let templateId;
{
  const { status, data } = await api("POST", "/receipt-templates", {
    name: "Test Template",
    config: {
      paperSize: "80mm",
      fontFamily: "sans",
      baseFontSize: 12,
      spacing: 4,
      textColor: "#000000",
      accentColor: "#333333",
      backgroundColor: "#ffffff",
      showLogo: false,
      storeName: "Test Store",
      footerText: "Thank you!",
      elements: [],
    },
  });
  assert("POST /api/receipt-templates → 201", status === 201, JSON.stringify(data));
  templateId = data?.id;
}
if (templateId) {
  const { status, data } = await api("GET", `/receipt-templates/${templateId}`);
  assert("GET /api/receipt-templates/:id → 200", status === 200);
  assert("config preserved", data?.config?.storeName === "Test Store" && data?.config?.paperSize === "80mm");
}

// ── 13. Sales list & individual GET ──────────────────────────────────────────
log("\n── 13. Sales list + individual GET ──");
{
  const { status, data } = await api("GET", "/sales?limit=10");
  assert("GET /api/sales → 200", status === 200);
  assert("returns array", Array.isArray(data));
  assert("at least 5 sales recorded", (data?.length ?? 0) >= 5);
}
if (saleCash?.id) {
  const { status, data } = await api("GET", `/sales/${saleCash.id}`);
  assert(`GET /api/sales/${saleCash.id} → 200`, status === 200);
  assert("correct id returned", data?.id === saleCash.id);
  assert("items populated", Array.isArray(data?.items) && data.items.length > 0);
}

// ── summary ───────────────────────────────────────────────────────────────────
log("\n═══════════════════════════════════════");
log(`  ${passed + failed} checks: ${passed} passed, ${failed} failed`);
if (failures.length) {
  log("  Failed:");
  failures.forEach(f => log(`    ${FAIL} ${f}`));
}
log("═══════════════════════════════════════\n");
process.exit(failed > 0 ? 1 : 0);
