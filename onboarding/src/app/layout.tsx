import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ustad AI — Get Started",
  description: "Create your account and join the Ustad AI marketplace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg">{children}</body>
    </html>
  );
}
