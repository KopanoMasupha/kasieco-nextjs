import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import AppShell from "@/components/AppShell";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "KasiEco — buy together, swap stock, get found",
  description:
    "KasiEco (Mzansi Business digital platform): kasi shops that pool wholesale buying, exchange stock, and help customers find verified shops.",
  applicationName: "KasiEco",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "KasiEco",
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
  width: "device-width",
  initialScale: 1,
  // let the page respect notch/safe-area insets when running as an installed PWA
  viewportFit: "cover",
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
