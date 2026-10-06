// Build: empaqueta el adaptador de Identity y verifica las invariantes antes de publicar.
import { build } from "esbuild";
import { runChecks } from "./verify.mjs";

await build({
  entryPoints: ["src/auth.js"],
  outfile: "public/auth.js",
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  minify: true,
  logLevel: "info",
});

const failures = runChecks();
if (failures.length) {
  console.error("\n✗ Invariantes rotas:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("✓ Build listo y todas las invariantes verificadas.");
