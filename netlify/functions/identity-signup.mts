// Hook de Netlify Identity por nombre reservado: cubre el primer acceso con Google.
import { handleIdentityRequest } from "../lib/legacy-identity-hook.mjs";

export default async (request: Request): Promise<Response> =>
  handleIdentityRequest(request, { eventName: "identity-signup" });
