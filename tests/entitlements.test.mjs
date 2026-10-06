import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PRODUCT,
  emailKey,
  findActiveEntitlement,
  normalizeEmail,
  registerEntitlement,
  validatePurchase,
} from "../netlify/lib/entitlements.mjs";
import { memoryStore } from "./helpers.mjs";

const valid = {
  name: "Laura",
  email: "  Laura.Perez@Example.COM ",
  product: PRODUCT.id,
  price: PRODUCT.price,
  currency: PRODUCT.currency,
  status: PRODUCT.checkoutStatus,
  result: "constructor",
};

test("normaliza el correo con trim y minúsculas", () => {
  assert.equal(normalizeEmail("  Laura.Perez@Example.COM "), "laura.perez@example.com");
  assert.equal(normalizeEmail(undefined), "");
});

test("la clave es un SHA-256 estable y no contiene el correo", () => {
  const a = emailKey("laura.perez@example.com");
  const b = emailKey("  LAURA.PEREZ@example.com");
  assert.equal(a, b);
  assert.match(a, /^buyer-[0-9a-f]{64}$/);
  assert.ok(!a.includes("laura"));
  assert.notEqual(a, emailKey("otra@example.com"));
});

test("acepta una compra demo válida", () => {
  const r = validatePurchase(valid);
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { email: "laura.perez@example.com", name: "Laura", result: "constructor" });
});

for (const [field, bad, code] of [
  ["product", "otro-producto", "product_invalid"],
  ["price", 1, "price_invalid"],
  ["price", "18990", "price_invalid"],
  ["currency", "USD", "currency_invalid"],
  ["status", "paid", "status_invalid"],
  ["email", "no-es-correo", "email_invalid"],
  ["name", "", "name_invalid"],
  ["result", "hacker", "result_invalid"],
]) {
  test(`rechaza ${field}=${JSON.stringify(bad)}`, () => {
    const r = validatePurchase({ ...valid, [field]: bad });
    assert.equal(r.ok, false);
    assert.ok(r.errors.includes(code), r.errors.join(","));
  });
}

test("rechaza campos faltantes", () => {
  const { product, price, currency, status, ...rest } = valid;
  const r = validatePurchase(rest);
  assert.deepEqual(r.errors.sort(), ["currency_invalid", "price_invalid", "product_invalid", "status_invalid"]);
});

test("persiste el derecho completo y el registro es idempotente", async () => {
  const store = memoryStore();
  const purchase = validatePurchase(valid).value;
  const first = await registerEntitlement(store, purchase, new Date("2026-10-05T12:00:00Z"));
  assert.equal(first.created, true);
  assert.deepEqual(Object.keys(first.entitlement).sort(), [
    "currency", "email", "grantedAt", "name", "orderedAt", "price", "product", "result", "source", "status",
  ]);
  assert.equal(first.entitlement.status, "active");

  const second = await registerEntitlement(store, { ...purchase, name: "Otra" }, new Date("2026-10-06T12:00:00Z"));
  assert.equal(second.created, false);
  assert.equal(second.entitlement.grantedAt, "2026-10-05T12:00:00.000Z");
  assert.equal(second.entitlement.name, "Laura");
  assert.equal(store.data.size, 1);
});

test("encuentra el derecho activo sólo para el mismo correo", async () => {
  const store = memoryStore();
  await registerEntitlement(store, validatePurchase(valid).value);
  assert.ok(await findActiveEntitlement(store, "LAURA.PEREZ@example.com"));
  assert.equal(await findActiveEntitlement(store, "control@example.com"), null);
  assert.equal(await findActiveEntitlement(store, ""), null);
});

test("un derecho inactivo no cuenta", async () => {
  const store = memoryStore();
  const { entitlement } = await registerEntitlement(store, validatePurchase(valid).value);
  await store.set(emailKey(entitlement.email), { ...entitlement, status: "refunded" });
  assert.equal(await findActiveEntitlement(store, entitlement.email), null);
});
