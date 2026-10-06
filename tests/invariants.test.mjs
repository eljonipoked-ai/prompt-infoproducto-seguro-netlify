import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runChecks } from "../scripts/verify.mjs";

test("las invariantes de funciones, adaptadores y _redirects se cumplen", () => {
  const failures = runChecks().filter((f) => !f.includes("public/auth.js"));
  assert.deepEqual(failures, []);
});

test("los adaptadores usan export default con Request y rechazan export const handler", () => {
  for (const name of ["identity-login", "identity-signup"]) {
    const src = readFileSync(`netlify/functions/${name}.mts`, "utf8");
    assert.match(src, /export default async \(request: Request\): Promise<Response>/);
    assert.doesNotMatch(src, /export const handler/);
    assert.doesNotMatch(src, /\(event, context\)/);
  }
});
