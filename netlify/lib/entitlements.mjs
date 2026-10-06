// Derechos de compra: normalización, validación y persistencia en Netlify Blobs.
// El servidor es la única autoridad sobre producto, precio, moneda y estado.
import { createHash } from "node:crypto";

export const PRODUCT = Object.freeze({
  id: "pequenos-artistas",
  name: "Pequeños Artistas",
  price: 18990,
  currency: "ARS",
  checkoutStatus: "demo",
});

export const STORE_NAME = "entitlements";
export const ALLOWED_RESULTS = Object.freeze(["explorador", "constructor", "sonador"]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

export function emailKey(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("email_required");
  return "buyer-" + createHash("sha256").update(normalized).digest("hex");
}

// Devuelve { ok: true, value } o { ok: false, errors: [...] }.
export function validatePurchase(input) {
  const errors = [];
  if (!input || typeof input !== "object") return { ok: false, errors: ["body_invalid"] };

  const email = normalizeEmail(input.email);
  if (!EMAIL_RE.test(email) || email.length > 254) errors.push("email_invalid");

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 1 || name.length > 80) errors.push("name_invalid");

  if (input.product !== PRODUCT.id) errors.push("product_invalid");
  if (input.price !== PRODUCT.price) errors.push("price_invalid");
  if (input.currency !== PRODUCT.currency) errors.push("currency_invalid");
  if (input.status !== PRODUCT.checkoutStatus) errors.push("status_invalid");

  let result = typeof input.result === "string" ? input.result.trim().toLowerCase() : "";
  if (result && !ALLOWED_RESULTS.includes(result)) errors.push("result_invalid");
  if (!result) result = "explorador";

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { email, name, result } };
}

export function buildEntitlement({ email, name, result }, now = new Date()) {
  const iso = now.toISOString();
  return {
    status: "active",
    product: PRODUCT.id,
    email: normalizeEmail(email),
    name,
    result,
    source: "demo-checkout",
    price: PRODUCT.price,
    currency: PRODUCT.currency,
    orderedAt: iso,
    grantedAt: iso,
  };
}

// Abre el store real de Blobs con consistencia fuerte. Sólo dentro del runtime de Netlify.
export async function openEntitlementStore() {
  const { getStore } = await import("@netlify/blobs");
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  return {
    get: (key) => store.get(key, { type: "json", consistency: "strong" }),
    set: (key, value) => store.setJSON(key, value),
  };
}

// Idempotente: si ya existe un derecho activo, se conserva tal cual.
export async function registerEntitlement(store, purchase, now = new Date()) {
  const key = emailKey(purchase.email);
  const existing = await store.get(key);
  if (isActive(existing)) return { created: false, entitlement: existing };
  const entitlement = buildEntitlement(purchase, now);
  await store.set(key, entitlement);
  return { created: true, entitlement };
}

export async function findActiveEntitlement(store, email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const record = await store.get(emailKey(normalized));
  return isActive(record) && record.email === normalized ? record : null;
}

function isActive(record) {
  return Boolean(record && record.status === "active" && record.product === PRODUCT.id);
}
