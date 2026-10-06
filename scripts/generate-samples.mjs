// Genera los PDFs imprimibles de MUESTRA en public/descargas/.
// Reemplazalos por tus láminas finales manteniendo los mismos nombres de archivo.
import { mkdirSync, writeFileSync } from "node:fs";

const W = 595, H = 842; // A4 en puntos
const OUT = "public/descargas";

function pdf(pages) {
  const objs = [];
  const add = (s) => (objs.push(s), objs.length);
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pagesId = objs.length + 1 + pages.length * 2;
  const kids = [];
  for (const content of pages) {
    const stream = Buffer.from(content, "latin1");
    const c = add(`<< /Length ${stream.length} >>\nstream\n${content}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${c} 0 R >>`));
  }
  add(`<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`);
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let out = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const esc = (t) => t.replace(/[\\()]/g, (m) => "\\" + m);
const text = (x, y, size, t, center = false) => {
  const x0 = center ? x - (t.length * size * 0.28) : x;
  return `BT /F1 ${size} Tf ${x0.toFixed(1)} ${y} Td (${esc(t)}) Tj ET\n`;
};
const K = 0.5523;
const ellipse = (cx, cy, rx, ry) =>
  `${cx + rx} ${cy} m ` +
  `${cx + rx} ${cy + ry * K} ${cx + rx * K} ${cy + ry} ${cx} ${cy + ry} c ` +
  `${cx - rx * K} ${cy + ry} ${cx - rx} ${cy + ry * K} ${cx - rx} ${cy} c ` +
  `${cx - rx} ${cy - ry * K} ${cx - rx * K} ${cy - ry} ${cx} ${cy - ry} c ` +
  `${cx + rx * K} ${cy - ry} ${cx + rx} ${cy - ry * K} ${cx + rx} ${cy} c S\n`;
const circle = (cx, cy, r) => ellipse(cx, cy, r, r);
const rect = (x, y, w, h) => `${x} ${y} ${w} ${h} re S\n`;
const poly = (...pts) => pts.map(([x, y], i) => `${x} ${y} ${i ? "l" : "m"}`).join(" ") + " h S\n";
const line = (x1, y1, x2, y2) => `${x1} ${y1} m ${x2} ${y2} l S\n`;
const arc = (x1, y1, cx, cy, x2, y2) => `${x1} ${y1} m ${cx} ${cy} ${cx} ${cy} ${x2} ${y2} c S\n`;
const stroke = (w) => `0 0 0 RG ${w} w 1 J 1 j\n`;

function page(title, subtitle, body) {
  return (
    stroke(2) +
    text(W / 2, 790, 26, title, true) +
    text(W / 2, 764, 13, subtitle, true) +
    body +
    text(W / 2, 30, 9, "Pequeños Artistas - MUESTRA - Reemplazar por la lámina final", true)
  );
}

// Dibujos para colorear construidos con formas básicas.
const drawings = {
  sol: (cx, cy) => circle(cx, cy, 70) + Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return line(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90, cx + Math.cos(a) * 130, cy + Math.sin(a) * 130);
  }).join("") + circle(cx - 25, cy + 15, 8) + circle(cx + 25, cy + 15, 8) + arc(cx - 30, cy - 20, cx, cy - 50, cx + 30, cy - 20),
  casa: (cx, cy) => rect(cx - 110, cy - 130, 220, 160) + poly([cx - 130, cy + 30], [cx, cy + 150], [cx + 130, cy + 30]) +
    rect(cx - 30, cy - 130, 60, 90) + rect(cx - 90, cy - 40, 45, 45) + rect(cx + 45, cy - 40, 45, 45) + circle(cx + 18, cy - 85, 4),
  gato: (cx, cy) => circle(cx, cy + 40, 90) + poly([cx - 80, cy + 85], [cx - 70, cy + 175], [cx - 20, cy + 125]) +
    poly([cx + 80, cy + 85], [cx + 70, cy + 175], [cx + 20, cy + 125]) + ellipse(cx - 32, cy + 55, 14, 20) + ellipse(cx + 32, cy + 55, 14, 20) +
    poly([cx - 10, cy + 25], [cx + 10, cy + 25], [cx, cy + 12]) + line(cx - 20, cy + 15, cx - 95, cy + 30) + line(cx - 20, cy + 8, cx - 95, cy) +
    line(cx + 20, cy + 15, cx + 95, cy + 30) + line(cx + 20, cy + 8, cx + 95, cy) + ellipse(cx, cy - 130, 70, 80),
  pez: (cx, cy) => ellipse(cx - 20, cy, 130, 80) + poly([cx + 100, cy], [cx + 180, cy + 70], [cx + 180, cy - 70]) +
    circle(cx - 90, cy + 20, 14) + arc(cx - 40, cy - 70, cx - 10, cy, cx - 40, cy + 70) + arc(cx + 10, cy - 60, cx + 40, cy, cx + 10, cy + 60) +
    circle(cx - 170, cy + 90, 12) + circle(cx - 190, cy + 130, 8),
  robot: (cx, cy) => rect(cx - 60, cy + 60, 120, 100) + rect(cx - 90, cy - 120, 180, 170) + circle(cx - 25, cy + 115, 15) +
    circle(cx + 25, cy + 115, 15) + rect(cx - 30, cy + 75, 60, 12) + line(cx, cy + 160, cx, cy + 195) + circle(cx, cy + 205, 10) +
    rect(cx - 140, cy - 60, 50, 100) + rect(cx + 90, cy - 60, 50, 100) + rect(cx - 70, cy - 200, 50, 80) + rect(cx + 20, cy - 200, 50, 80) +
    circle(cx, cy - 40, 30) + rect(cx - 50, cy + 10, 100, 25),
  flor: (cx, cy) => Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return circle(cx + Math.cos(a) * 60, cy + 80 + Math.sin(a) * 60, 40);
  }).join("") + circle(cx, cy + 80, 32) + line(cx, cy + 20, cx, cy - 200) + ellipse(cx - 45, cy - 100, 45, 18) + ellipse(cx + 45, cy - 150, 45, 18),
};

const face = (cx, cy, mood) => {
  let s = circle(cx, cy, 70) + circle(cx - 25, cy + 15, 7) + circle(cx + 25, cy + 15, 7);
  if (mood === "feliz") s += arc(cx - 35, cy - 15, cx, cy - 55, cx + 35, cy - 15);
  if (mood === "triste") s += arc(cx - 35, cy - 40, cx, cy - 5, cx + 35, cy - 40);
  if (mood === "sorpresa") s += circle(cx, cy - 30, 14);
  if (mood === "enojo") s += line(cx - 40, cy + 40, cx - 12, cy + 28) + line(cx + 40, cy + 40, cx + 12, cy + 28) + line(cx - 25, cy - 30, cx + 25, cy - 30);
  return s;
};

function plan() {
  const days = [
    "Sol de formas", "Casa", "Gato", "Pez", "Robot", "Flor", "Zoológico",
    "Crayón", "Degradé", "Puntitos", "Rayas", "Acuarela", "Sellos", "Collage",
    "Caras", "Emociones", "Ojos y bocas", "Mi personaje", "Su casa", "Su amigo", "Superpoder",
    "Cuadro 1", "Cuadro 2", "Cuadro 3", "Cuadro 4", "Color", "Diálogos", "Título",
    "Elegir 5", "Expo",
  ];
  let s = "";
  const cols = 5, cw = 100, ch = 108, x0 = (W - cols * cw) / 2, y0 = 735;
  days.forEach((d, i) => {
    const x = x0 + (i % cols) * cw, y = y0 - Math.floor(i / cols) * ch - ch;
    s += rect(x, y, cw - 8, ch - 8) + text(x + 8, y + ch - 30, 16, `Día ${i + 1}`) + text(x + 8, y + 12, 9, d) + rect(x + cw - 32, y + ch - 32, 16, 16);
  });
  return [page("Mi plan de 30 días", "Marcá cada cuadradito cuando termines la actividad del día", s)];
}

const files = {
  "plan-30-dias.pdf": plan(),
  "tecnica-1-formas-magicas.pdf": [
    page("Técnica 1: Formas mágicas", "Repasá las formas y después dibujalo vos solo al lado", drawings.casa(W / 2, 430)),
    page("Técnica 1: Formas mágicas", "Un gato hecho con círculos y triángulos", drawings.gato(W / 2, 420)),
    page("Técnica 1: Formas mágicas", "Un robot hecho sólo con rectángulos y círculos", drawings.robot(W / 2, 420)),
  ],
  "tecnica-2-color-y-texturas.pdf": [
    page("Técnica 2: Color y texturas", "Pintá cada rayo de un color distinto", drawings.sol(W / 2, 420)),
    page("Técnica 2: Color y texturas", "Probá puntitos, rayas y degradés en las escamas", drawings.pez(W / 2, 420)),
    page("Técnica 2: Color y texturas", "Cada pétalo con una textura diferente", drawings.flor(W / 2, 420)),
  ],
  "tecnica-3-personajes.pdf": [
    page("Técnica 3: Personajes e historias", "Copiá las emociones y completá las caras vacías",
      face(170, 580, "feliz") + face(425, 580, "triste") + face(170, 380, "sorpresa") + face(425, 380, "enojo") +
      circle(170, 180, 70) + circle(425, 180, 70) +
      text(170, 490, 12, "FELIZ", true) + text(425, 490, 12, "TRISTE", true) + text(170, 290, 12, "SORPRESA", true) + text(425, 290, 12, "ENOJO", true)),
    page("Técnica 3: Personajes e historias", "Mi historieta en 4 cuadros",
      rect(50, 400, 240, 320) + rect(305, 400, 240, 320) + rect(50, 60, 240, 320) + rect(305, 60, 240, 320) +
      text(60, 700, 14, "1") + text(315, 700, 14, "2") + text(60, 360, 14, "3") + text(315, 360, 14, "4")),
  ],
};

mkdirSync(OUT, { recursive: true });
for (const [name, pages] of Object.entries(files)) {
  writeFileSync(`${OUT}/${name}`, pdf(pages));
  console.log(`✓ ${OUT}/${name} (${pages.length} pág.)`);
}
