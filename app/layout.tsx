import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Speakly", template: "%s · Speakly" },
  description: "Səviyyənə uyğun müəllimlə ingiliscə danış: səviyyə testi, canlı speaking dərsləri və qrammatika lesson-ları.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Source+Sans+3:wght@400;600;700&display=swap"
        />
      </head>
      <body>
        <Header />
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
