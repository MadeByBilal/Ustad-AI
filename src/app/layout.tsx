import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ustad AI — اپنے قریبی اُستاد تلاش کریں",
  description:
    "Urdu-first marketplace that connects customers with verified nearby technicians — plumbers, electricians, AC technicians and carpenters.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ur" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
