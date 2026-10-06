import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUCT, registerEntitlement } from "../netlify/lib/entitlements.mjs";
import { handleIdentityRequest, withBuyerRole } from "../netlify/lib/legacy-identity-hook.mjs";
import { memoryStore } from "./helpers.mjs";

const silent = { info() {}, warn() {}, error() {} };
const BUYER = "compradora@example.com";

async function storeWithBuyer() {
  const store = memoryStore();
  await registerEntitlement(store, { email: BUYER, name: "Ana", result: "sonador" });
  return store;
}

function hookRequest(body) {
  return new Request("https://example.netlify.app/.netlify/functions/identity-login", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function run(body, store) {
  return handleIdentityRequest(hookRequest(body), { eventName: "test", openStore: async () => store, log: silent });
}

const googleUser = (email, app_metadata = { provider: "google" }) => ({ id: "u1", email, app_metadata, user_metadata: { full_name: "X" } });

test("asigna buyer leyendo body.user", async () => {
  const res = await run({ event: "login", user: googleUser("Compradora@Example.com") }, await storeWithBuyer());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { app_metadata: { provider: "google", roles: ["buyer"] } });
});

test("asigna buyer leyendo body.payload.user", async () => {
  const res = await run({ event: "signup", payload: { user: googleUser(BUYER) } }, await storeWithBuyer());
  assert.deepEqual(await res.json(), { app_metadata: { provider: "google", roles: ["buyer"] } });
});

test("la respuesta tiene sólo app_metadata en la raíz, nunca el usuario completo", async () => {
  const res = await run({ user: googleUser(BUYER) }, await storeWithBuyer());
  const json = await res.json();
  assert.deepEqual(Object.keys(json), ["app_metadata"]);
  assert.equal(json.user, undefined);
  assert.equal(json.email, undefined);
  assert.equal(json.app_metadata.email, undefined);
});

test("preserva roles y metadata previos y no duplica buyer", async () => {
  const store = await storeWithBuyer();
  const res = await run({ user: googleUser(BUYER, { provider: "google", roles: ["editor", "buyer"], plan: "x" }) }, store);
  assert.deepEqual(await res.json(), { app_metadata: { provider: "google", roles: ["editor", "buyer"], plan: "x" } });
  assert.deepEqual(withBuyerRole({ roles: ["editor"] }), { roles: ["editor", "buyer"] });
  assert.deepEqual(withBuyerRole(undefined), { roles: ["buyer"] });
});

test("sin derecho activo: respuesta exitosa vacía y sin buyer", async () => {
  const res = await run({ user: googleUser("control@example.com") }, await storeWithBuyer());
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "");
});

test("JSON ilegible es payload_malformed", async () => {
  const res = await run("{no es json", await storeWithBuyer());
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: "payload_malformed" });
});

test("payload válido sin usuario es user_missing", async () => {
  const res = await run({ event: "login" }, await storeWithBuyer());
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: "user_missing" });
});

test("falla de Blobs es entitlement_lookup_failed, no payload_malformed", async () => {
  const broken = { get: async () => { throw new Error("blobs down"); } };
  const res = await run({ user: googleUser(BUYER) }, broken);
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: "entitlement_lookup_failed" });

  const res2 = await handleIdentityRequest(hookRequest({ user: googleUser(BUYER) }), {
    eventName: "test",
    openStore: async () => { throw new Error("no store"); },
    log: silent,
  });
  assert.deepEqual(await res2.json(), { error: "entitlement_lookup_failed" });
});

test("los logs no imprimen correos", async () => {
  const lines = [];
  const capture = { info: (m) => lines.push(m), warn: (m) => lines.push(m), error: (m) => lines.push(m) };
  const store = await storeWithBuyer();
  for (const email of [BUYER, "control@example.com"]) {
    await handleIdentityRequest(hookRequest({ user: googleUser(email) }), { eventName: "t", openStore: async () => store, log: capture });
  }
  assert.ok(lines.length >= 2);
  assert.ok(lines.every((l) => !l.includes("@")), lines.join("\n"));
});

test("el producto del derecho debe coincidir", async () => {
  const store = memoryStore();
  const { entitlement } = await registerEntitlement(store, { email: BUYER, name: "Ana", result: "sonador" });
  assert.equal(entitlement.product, PRODUCT.id);
});
