import type { Metadata, Viewport } from "next";
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
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Source+Sans+3:wght@400;600;700&display=swap&subset=cyrillic"
        />
      </head>
      <body>
        <I18nProvider locale={locale}>
          <Header />
          <main className="wrap">{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}
