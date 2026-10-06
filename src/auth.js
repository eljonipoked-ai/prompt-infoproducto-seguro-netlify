// Adaptador pequeño sobre @netlify/identity. Se empaqueta en public/auth.js durante el build.
// Nada de lo que hay acá concede acceso: la autorización la aplica Netlify con _redirects.
import { getUser, handleAuthCallback, logout, oauthLogin } from "@netlify/identity";

const BUYER_ROLE = "buyer";

function hasBuyerRole(user) {
  return Boolean(user && Array.isArray(user.roles) && user.roles.includes(BUYER_ROLE));
}

window.PAAuth = {
  startGoogle() {
    oauthLogin("google");
  },
  // Procesa el callback de Google (#access_token=...) y devuelve el usuario actual.
  async completeCallback() {
    const result = await handleAuthCallback();
    if (result?.user) return result.user;
    return getUser();
  },
  currentUser: getUser,
  hasBuyerRole,
  async signOut() {
    try {
      await logout();
    } finally {
      document.cookie = "nf_jwt=; Max-Age=0; path=/";
    }
  },
};
