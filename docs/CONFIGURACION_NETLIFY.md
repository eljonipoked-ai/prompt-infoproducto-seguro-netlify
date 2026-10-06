# Pequeños Artistas — Configuración guiada de Netlify

Esta guía cubre los pasos que **tenés que hacer vos** en el panel de Netlify. Todo lo demás (código, tests, build, deploy y pruebas) lo hace la IA.

> Google confirma quién es la persona. El servidor confirma si existe una compra. El rol `buyer` representa el permiso. Netlify bloquea el archivo antes de entregarlo.

## 0. Antes de empezar

- Nunca pegues contraseñas, tokens ni claves en el chat ni en GitHub.
- El pago es una **simulación (DEMO)**. No se cobra dinero.

## 1. Iniciar sesión en Netlify desde la terminal

La IA ejecuta `npx netlify-cli login`. Se abre el navegador: tocá **Authorize**. La IA nunca ve tu contraseña.

## 2. Crear (o vincular) el proyecto

La IA crea el proyecto con la CLI y te dice su nombre y su URL (`https://<nombre>.netlify.app`). Crear el proyecto no consume créditos.

## 3. Visibilidad: producción pública

**Project configuration → General → Visitor access**

- **Production visibility: Public** ← obligatorio.
- **Deploy Preview visibility:** podés dejarla en **Private**.

Si producción queda privada, Netlify bloquea también los avisos internos de Identity antes de que lleguen a `identity-login` / `identity-signup`, y nadie recibe el rol `buyer`.

## 4. Habilitar Identity

**Project configuration → Identity → Enable Identity**

- **Registration preferences: Open.** Cualquier persona puede autenticarse con Google, pero sólo recibe `buyer` quien tiene una compra registrada en el servidor.
- No asignes roles a mano: los asigna el hook automáticamente.

## 5. Habilitar Google

**Identity → Registration → External providers → Add provider → Google**

- Elegí **Use default configuration** (credenciales provistas por Netlify).
- Guardá.

## 6. Autorizar el deploy

Antes de publicar, la IA te informa el costo vigente y espera tu **sí** explícito. Referencia verificada el **5 de octubre de 2026** (planes por créditos):

| Concepto | Costo |
|---|---|
| Deploy productivo | 15 créditos |
| Deploy preview / branch deploy | 0 créditos |
| Identity | Incluido sin costo adicional |
| Functions (compute) | 10 créditos por GB-hora |
| Requests | 2 créditos cada 10.000 |
| Bandwidth | 20 créditos por GB |
| Plan Free | 300 créditos por mes; si se agotan, los proyectos se pausan |

Cada autorización cubre **un solo** deploy.

## 7. Prueba publicada (la condición real de aceptación)

Necesitamos dos cuentas de Google:

- **Comprador:** completa el checkout DEMO y entra con Google → debe abrir `/portal` y descargar un PDF.
- **Control:** entra con Google **sin** comprar → debe autenticarse pero quedar bloqueado.

Además, sin sesión, `/portal`, `/portal/`, `/portal.html` y `/descargas/...` deben responder `401`.

La IA revisa en **Logs → Functions** que `identity-login` o `identity-signup` se hayan ejecutado por el login real, y registra horarios de cada paso.

## 8. Reset para repetir la prueba

Sin borrar usuarios ni datos de otras personas:

1. Obtener la clave del derecho de prueba: `npm run key -- correo.de.prueba@gmail.com`
2. Borrar sólo ese derecho: `npx netlify-cli blobs:delete entitlements <clave>`
3. En **Identity**, abrir el usuario de prueba y quitarle el rol `buyer` (quitar está bien; lo que nunca se hace es **agregarlo** a mano).
4. Cerrar sesión en el sitio y usar una pestaña nueva.

## Si algo falla

La IA identifica cuál transición falló: checkout → derecho · Google → identidad · identidad → hook · hook → rol · rol → JWT · JWT → regla CDN · regla CDN → portal.

Si la portada pública pide login de equipo o aparece `app.netlify.com/edge-access`, el proyecto sigue privado: volvé al paso 3.

## Límites honestos

- Esto impide que alguien **sin compra** reciba los archivos desde Netlify. No impide que un comprador legítimo comparta lo que ya descargó.
- La compra es **DEMO**. Para cobrar de verdad hace falta un proveedor de pagos (por ejemplo Mercado Pago), credenciales guardadas como variables de entorno en Netlify (nunca en el código) y un webhook verificado que registre el derecho. Un redirect de "pago aprobado" nunca concede acceso.
- Los PDFs de `public/descargas/` son **muestras**. Reemplazalos por tus láminas finales con los mismos nombres de archivo (o agregá más dentro de esa carpeta: quedan protegidos automáticamente).
