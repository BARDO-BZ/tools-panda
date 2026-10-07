import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import "./globals.css";

// Tipografías del manual de Panda (BRANDING 2026):
// PP Nikkei Maru = display · PP Mondwest = serif de acento · Manrope = texto · IBM Plex Mono = rótulos.
// ⚠️ Los .otf de las PP son la versión "Free for Personal Use": reemplazar por los .woff2 con
// licencia web antes de usarlo con clientes (ver MARCA-PANDA.md en propuestas-panda).
// Nikkei Maru: solo la Regular, declarada para todo el rango de pesos (nunca faux-bold).
const nikkei = localFont({ src: "./fonts/PPNikkeiMaru-Regular.otf", variable: "--f-display", display: "swap", weight: "100 900" });
const mondwest = localFont({ src: "./fonts/PPMondwest-Regular.otf", variable: "--f-serif", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--f-texto", weight: ["400", "500", "700", "800"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--f-mono", weight: ["400", "500"] });

const SITIO =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: "Panda",
  description: "Productora audiovisual",
  robots: { index: false, follow: false },
  openGraph: { images: ["/brand/og-panda.png"] },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${nikkei.variable} ${mondwest.variable} ${manrope.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
