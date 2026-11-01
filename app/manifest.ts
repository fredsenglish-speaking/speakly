import type { MetadataRoute } from "next";

// Lets students add the site to their phone's home screen and open it like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Speakly AI",
    short_name: "Speakly AI",
    description: "English lessons, level test and speaking club",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#172b50",
    theme_color: "#172b50",
    icons: [
      { src: "/icon-192.png?v=4", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png?v=4", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png?v=4", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
