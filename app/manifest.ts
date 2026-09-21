import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kasi-Connect — buy together, swap stock, get found",
    short_name: "Kasi-Connect",
    description:
      "Kasi-Connect (Mzansi Business digital platform): kasi shops that buy together, swap stock with each other, and get found by customers on a map.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF7F1",
    theme_color: "#E85D2B",
    categories: ["business", "shopping", "productivity"],
    icons: [
      {
        src: "/icons/logo-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/logo-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
