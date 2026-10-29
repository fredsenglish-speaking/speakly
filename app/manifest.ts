import type { MetadataRoute } from "next";

// Lets students add the site to their phone's home screen and open it like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Speakly",
    short_name: "Speakly",
    description: "English lessons, level test and speaking club",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b1f4d",
    theme_color: "#0b1f4d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
