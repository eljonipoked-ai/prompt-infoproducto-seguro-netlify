// Chequeo de invariantes del contrato de seguridad. Se corre antes de cada build y deploy.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EXPECTED_FUNCTIONS = ["identity-login.mts", "identity-signup.mts", "register-demo-purchase.mts"];
const HOOKS = ["identity-login.mts", "identity-signup.mts"];
const PUBLIC_FILES = ["index.html", "checkout.html", "login.html", "portal.html", "auth.js", "_redirects", "styles.css"];
const PROTECTED_PATHS = ["/portal.html", "/portal", "/portal/", "/descargas/*"];

export function runChecks(root = ".") {
  const failures = [];
  const read = (p) => readFileSync(`${root}/${p}`, "utf8");

  const functions = readdirSync(`${root}/netlify/functions`).sort();
  if (JSON.stringify(functions) !== JSON.stringify([...EXPECTED_FUNCTIONS].sort())) {
    failures.push(`netlify/functions debe contener exactamente ${EXPECTED_FUNCTIONS.join(", ")}; contiene ${functions.join(", ")}`);
  }

  for (const hook of HOOKS) {
    const path = `netlify/functions/${hook}`;
    if (!existsSync(`${root}/${path}`)) continue;
    const src = read(path);
    if (!/export\s+default\s+async\s*\(\s*request\s*:\s*Request\s*\)/.test(src)) failures.push(`${path}: falta export default (request: Request)`);
    if (!/Promise<Response>/.test(src)) failures.push(`${path}: debe devolver Response`);
    if (/export\s+const\s+handler/.test(src)) failures.push(`${path}: export const handler está prohibido`);
    if (/eventSubscriptions/.test(src)) failures.push(`${path}: eventSubscriptions está prohibido`);
  }

  const hookLib = read("netlify/lib/legacy-identity-hook.mjs");
  if (/connectLambda/.test(hookLib)) failures.push("legacy-identity-hook.mjs: connectLambda está prohibido");

  for (const file of PUBLIC_FILES) {
    if (!existsSync(`${root}/public/${file}`)) failures.push(`public/${file} no existe`);
  }

  if (existsSync(`${root}/public/_redirects`)) {
    const rules = read("public/_redirects")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => l.split(/\s+/));
    for (const path of PROTECTED_PATHS) {
      const forPath = rules.filter((r) => r[0] === path);
      const gateIdx = forPath.findIndex((r) => r[2] === "200!" && r.includes("Role=buyer"));
      const fallbackIdx = forPath.findIndex((r) => r[2] === "401!");
      if (gateIdx === -1) failures.push(`_redirects: falta regla Role=buyer para ${path}`);
      if (fallbackIdx === -1) failures.push(`_redirects: falta fallback 401! para ${path}`);
      if (gateIdx !== -1 && fallbackIdx !== -1 && fallbackIdx < gateIdx) failures.push(`_redirects: el fallback de ${path} está antes que la regla de rol`);
    }
  }

  for (const file of ["checkout.html", "login.html", "portal.html", "index.html"]) {
    const path = `public/${file}`;
    if (existsSync(`${root}/${path}`) && /localStorage\.(get|set)Item\(["']?(role|buyer|paid)/i.test(read(path))) {
      failures.push(`${path}: el navegador no puede ser autoridad de acceso`);
    }
  }

  return failures;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const failures = runChecks();
  if (failures.length) {
    console.error("✗ Invariantes rotas:\n- " + failures.join("\n- "));
    process.exit(1);
  }
  console.log("✓ Invariantes verificadas.");
}
