import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const source = readFileSync(
  new URL("../docs/manual-usuario.md", import.meta.url),
  "utf8",
);
const escape = (s) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const inline = (s) =>
  escape(s)
    .replace(
      /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
const slug = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
let html = "",
  paragraph = [],
  list = "",
  toc = [];
const flushParagraph = () => {
  if (paragraph.length) html += `<p>${inline(paragraph.join(" "))}</p>\n`;
  paragraph = [];
};
const flushList = () => {
  if (list) html += `</${list}>\n`;
  list = "";
};
for (const line of source.split("\n")) {
  if (!line.trim()) {
    flushParagraph();
    flushList();
    continue;
  }
  const heading = /^(#{1,3}) (.+)$/.exec(line);
  if (heading) {
    flushParagraph();
    flushList();
    const level = heading[1].length,
      id = slug(heading[2]);
    if (level === 2) toc.push({ id, label: heading[2] });
    html += `<h${level} id="${id}">${inline(heading[2])}</h${level}>\n`;
    continue;
  }
  const item = /^(?:\d+\. |[-*] )(.+)$/.exec(line);
  if (item) {
    flushParagraph();
    const type = /^\d/.test(line) ? "ol" : "ul";
    if (list !== type) {
      flushList();
      html += `<${type}>\n`;
      list = type;
    }
    html += `<li>${inline(item[1])}</li>\n`;
    continue;
  }
  flushList();
  paragraph.push(line);
}
flushParagraph();
flushList();
const navigation = `<nav aria-label="Índice do manual"><strong>Neste manual</strong><ol>${toc.map((item) => `<li><a href="#${item.id}">${escape(item.label.replace(/^\d+\. /, ""))}</a></li>`).join("")}</ol></nav>`;
const introEnd = html.indexOf("</p>") + 4;
const content = html.slice(0, introEnd) + navigation + html.slice(introEnd);
mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../public/manual.html", import.meta.url),
  `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Manual do usuário — Gestão</title><style>
:root{color-scheme:light;font:16px/1.65 system-ui,sans-serif;color:#25334a;background:#f3f5f9}body{margin:0}header,main{max-width:850px;margin:auto;padding:24px}header{display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between;align-items:center}a{color:#125aa1;overflow-wrap:anywhere}button{font:inherit;padding:10px 16px;background:#125aa1;color:white;border:0;border-radius:8px;cursor:pointer;min-height:44px}main{background:white;border:1px solid #dce2ec;border-radius:12px;margin-bottom:40px;padding:32px;box-sizing:border-box}h1{font-size:2rem;line-height:1.2}h2{margin-top:40px;padding-top:20px;border-top:1px solid #dce2ec;font-size:1.35rem;line-height:1.35;scroll-margin-top:20px}h3{font-size:1.1rem;margin-top:25px}li{margin:9px 0}code{background:#edf2f8;padding:2px 5px;border-radius:4px;overflow-wrap:anywhere}nav{padding:16px;background:#f3f5f9;border-radius:8px}nav ol{margin:6px 0;padding-left:24px}nav li{margin:5px 0}p{overflow-wrap:anywhere}@media(max-width:600px){main{padding:20px;margin:0 10px 24px}header{padding:16px}h1{font-size:1.65rem}ol,ul{padding-left:24px}}@media print{@page{size:A4;margin:18mm}body{background:white;font-size:10pt}header,nav{display:none}main{border:0;padding:0;margin:0;max-width:none}h1{font-size:24pt}h2{font-size:15pt;break-after:avoid}h3{break-after:avoid}li,p{orphans:3;widows:3}a{color:inherit;text-decoration:none}code{background:none}}
</style></head><body><header><a href="/">← Voltar ao aplicativo</a><button onclick="window.print()">Imprimir / Salvar PDF</button></header><main>${content}</main></body></html>`,
);
console.log("Manual atualizado: public/manual.html");
