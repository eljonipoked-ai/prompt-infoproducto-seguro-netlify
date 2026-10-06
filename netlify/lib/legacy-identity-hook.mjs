// Lógica compartida de identity-login e identity-signup (nombres reservados legacy,
// runtime moderno: recibe un Request y devuelve un Response).
import { findActiveEntitlement, openEntitlementStore } from "./entitlements.mjs";

export const BUYER_ROLE = "buyer";

export async function handleIdentityRequest(request, { eventName, openStore = openEntitlementStore, log = console } = {}) {
  let body;
  try {
    body = await request.json();
  } catch {
    log.warn(`[${eventName}] payload_malformed`);
    return Response.json({ error: "payload_malformed" }, { status: 400 });
  }

  const user = body?.user ?? body?.payload?.user;
  if (!user || typeof user !== "object") {
    log.warn(`[${eventName}] user_missing`);
    return Response.json({ error: "user_missing" }, { status: 400 });
  }

  let entitlement;
  try {
    const store = await openStore();
    entitlement = await findActiveEntitlement(store, user.email);
  } catch (error) {
    log.error(`[${eventName}] entitlement_lookup_failed user=${user.id ?? "?"} ${error?.message ?? ""}`);
    return Response.json({ error: "entitlement_lookup_failed" }, { status: 500 });
  }

  if (!entitlement) {
    log.info(`[${eventName}] no_entitlement user=${user.id ?? "?"}`);
    return new Response(null, { status: 200 });
  }

  log.info(`[${eventName}] buyer_granted user=${user.id ?? "?"}`);
  return Response.json({ app_metadata: withBuyerRole(user.app_metadata) }, { status: 200 });
}

// Preserva la metadata y los roles previos y agrega buyer una sola vez.
export function withBuyerRole(appMetadata) {
  const current = appMetadata && typeof appMetadata === "object" ? appMetadata : {};
  const roles = Array.isArray(current.roles) ? current.roles.filter((r) => typeof r === "string") : [];
  return { ...current, roles: roles.includes(BUYER_ROLE) ? roles : [...roles, BUYER_ROLE] };
}
