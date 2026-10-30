import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/env";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    start_url: "/",
    display: "standalone",
    background_color: "#f7f9fc",
    theme_color: "#1455d9",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
