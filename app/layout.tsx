import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { DICTIONARIES } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = DICTIONARIES[await getLocale()];
  return {
    title: { default: "Speakly", template: "%s · Speakly" },
    description: t.meta.description,
    applicationName: "Speakly",
    appleWebApp: { capable: true, title: "Speakly", statusBarStyle: "default" },
    // New file names (not just ?v=) so Safari, which caches tab icons hard, fetches the new logo.
    icons: {
      icon: [
        { url: "/speakly-icon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/speakly-icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      shortcut: "/favicon.ico",
      apple: [{ url: "/speakly-apple-icon.png", sizes: "180x180" }],
    },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#172b50" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Source+Sans+3:wght@400;600;700&display=swap&subset=cyrillic"
        />
      </head>
      <body>
        <I18nProvider locale={locale}>
          <Header />
          <main className="wrap">{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
