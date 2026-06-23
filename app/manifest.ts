import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ROB — Artist Ritual",
    short_name: "ROB Ritual",
    description:
      "Record daily practice moments and build your proof of practice on Role of Bridge.",
    start_url: "/artist/ritual",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FDFBF7",
    theme_color: "#8B7355",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
