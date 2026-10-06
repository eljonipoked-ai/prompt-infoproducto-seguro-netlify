// Hook de Netlify Identity por nombre reservado: se ejecuta en cada login.
import { handleIdentityRequest } from "../lib/legacy-identity-hook.mjs";

export default async (request: Request): Promise<Response> =>
  handleIdentityRequest(request, { eventName: "identity-login" });
