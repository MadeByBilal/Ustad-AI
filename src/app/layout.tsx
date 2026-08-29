import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/context";

export const metadata: Metadata = {
  title: "Ustad AI — اپنے قریبی اُستاد تلاش کریں",
  description:
    "Urdu-first marketplace that connects customers with verified nearby technicians — plumbers, electricians, AC technicians and carpenters.",
};

const FONTS_URL =
  "https://fonts.googleapis.com/css2" +
  "?family=Fraunces:wght@500;600" +
  "&family=Inter+Tight:wght@400;500" +
  "&family=JetBrains+Mono:wght@400;500" +
  "&family=Noto+Nastaliq+Urdu:wght@500" +
  "&display=swap";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link href={FONTS_URL} rel="stylesheet" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"
        />
      </head>
      <body className="antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
