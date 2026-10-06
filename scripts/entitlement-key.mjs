// Imprime la clave de Blobs de un correo, para inspeccionar o resetear un derecho de prueba.
// Uso: npm run key -- correo@ejemplo.com
import { emailKey } from "../netlify/lib/entitlements.mjs";

const email = process.argv[2];
if (!email) {
  console.error("Uso: npm run key -- correo@ejemplo.com");
  process.exit(1);
}
console.log(emailKey(email));
