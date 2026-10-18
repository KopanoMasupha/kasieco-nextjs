import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MzansiConnect — Buy together. Pay less.",
    short_name: "MzansiConnect",
    description:
      "Kasi shops pool wholesale orders and save together with MzansiConnect.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6F2EC",
    theme_color: "#F6F2EC",
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
