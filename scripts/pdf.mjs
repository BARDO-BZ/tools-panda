#!/usr/bin/env node
// Exporta un documento a PDF (backup para subir a mano a Drive).
//
//   npm run pdf -- --login [--base URL]                      → la primera vez: abre Chrome para entrar
//   npm run pdf -- <cliente>/<slug> [publicaciones|stories|completo] [--base URL]
//
// Los documentos piden sesión: el script usa un perfil de Chrome propio (.data/chrome-pdf) donde
// quedás logueado después de --login. Usa el Chrome instalado (no descarga navegadores).
// Sale en pdf/<cliente>-<slug>[-<parte>].pdf. También se puede usar el botón PDF de la web.
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const base = (baseIdx >= 0 ? args.splice(baseIdx, 2)[1] : "http://localhost:3000").replace(/\/$/, "");
const login = args.includes("--login");
const [doc, parte = "completo"] = args.filter((a) => a !== "--login");

const CHROME =
  process.env.CHROME_PATH ??
  {
    darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    linux: "/usr/bin/google-chrome",
    win32: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  }[process.platform];
const PERFIL = ".data/chrome-pdf";

if (login) {
  const ctx = await chromium.launchPersistentContext(PERFIL, { executablePath: CHROME, headless: false, viewport: null });
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.goto(`${base}/entrar`);
  console.log("Entrá con tu mail en la ventana de Chrome. Cuando veas tu panel, cerrala.");
  await new Promise((r) => ctx.on("close", r));
  process.exit(0);
}

if (!doc || !doc.includes("/")) {
  console.error("Uso: npm run pdf -- <cliente>/<slug> [publicaciones|stories|completo] [--base URL]   (antes: npm run pdf -- --login)");
  process.exit(1);
}

const ctx = await chromium.launchPersistentContext(PERFIL, { executablePath: CHROME, viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
await page.goto(`${base}/${doc}`, { waitUntil: "networkidle" });
if (new URL(page.url()).pathname === "/entrar") {
  console.error("No hay sesión. Corré primero: npm run pdf -- --login" + (baseIdx >= 0 ? ` --base ${base}` : ""));
  await ctx.close();
  process.exit(1);
}
await page.evaluate(() => document.fonts.ready);

const esPlan = await page.evaluate(() => !document.querySelector("section[id^=placa-]"));
if (esPlan) await page.evaluate((p) => (document.documentElement.dataset.imprimir = p), parte);

await mkdir("pdf", { recursive: true });
const salida = `pdf/${doc.replace("/", "-")}${esPlan ? `-${parte}` : ""}.pdf`;
await page.pdf({ path: salida, printBackground: true, preferCSSPageSize: true });
await ctx.close();
console.log(salida);
