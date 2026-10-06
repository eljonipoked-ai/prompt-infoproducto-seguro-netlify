// Registra una compra SIMULADA (DEMO) desde el servidor. No es un cobro real.
import { openEntitlementStore, registerEntitlement, validatePurchase } from "../lib/entitlements.mjs";

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ ok: false, error: "payload_malformed" }, { status: 400 });
  }

  const validation = validatePurchase(input);
  if (!validation.ok) {
    return Response.json({ ok: false, error: "validation_failed", details: validation.errors }, { status: 422 });
  }

  try {
    const store = await openEntitlementStore();
    const { created, entitlement } = await registerEntitlement(store, validation.value);
    console.info(`[register-demo-purchase] ${created ? "created" : "already_active"}`);
    return Response.json({
      ok: true,
      demo: true,
      created,
      status: entitlement.status,
      product: entitlement.product,
      grantedAt: entitlement.grantedAt,
    });
  } catch (error) {
    console.error(`[register-demo-purchase] entitlement_write_failed ${(error as Error)?.message ?? ""}`);
    return Response.json({ ok: false, error: "entitlement_write_failed" }, { status: 500 });
  }
};
