import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "MzansiConnect",
  description: "Kasi shops buying together for less.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen font-sans">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
