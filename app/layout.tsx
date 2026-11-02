import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { DICTIONARIES } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = DICTIONARIES[await getLocale()];
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://speakly-jet.vercel.app";
  const title = `Speakly AI · ${t.home.title}`;
  return {
    metadataBase: new URL(site),
    title: { default: title, template: "%s · Speakly AI" },
    description: t.meta.description,
    // Link previews in WhatsApp, Facebook, Telegram etc.
    openGraph: {
      type: "website",
      siteName: "Speakly AI",
      title,
      description: t.meta.description,
      images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Speakly AI" }],
    },
    twitter: { card: "summary_large_image", title, description: t.meta.description, images: ["/og-image.jpg"] },
    applicationName: "Speakly AI",
    appleWebApp: { capable: true, title: "Speakly AI", statusBarStyle: "default" },
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
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=EB+Garamond:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600;1,700&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Source+Sans+3:wght@400;600;700&family=Great+Vibes&display=swap&subset=cyrillic"
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
