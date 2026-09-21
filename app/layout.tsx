import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import AppShell from "@/components/AppShell";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "Kasi-Connect — buy together, swap stock, get found",
  description:
    "Kasi-Connect (Mzansi Business digital platform): kasi shops that buy together, swap stock with each other, and get found by customers on a map.",
  applicationName: "Kasi-Connect",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Kasi-Connect",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "256x256" },
      { url: "/icons/logo-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#E85D2B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
        <PWARegister />
      </body>
    </html>
  );
}
