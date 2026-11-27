import type { MetadataRoute } from "next";
import en from "../../messages/en.json";

// Keep colors in sync with --color-bg in packages/ui/src/theme.css.
const inkNavy = "#0f1b2d";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tantiya",
    short_name: "Tantiya",
    description: en.Metadata.description,
    lang: "en",
    start_url: "/",
    display: "standalone",
    background_color: inkNavy,
    theme_color: inkNavy,
    // TODO: add 192x192 and 512x512 icons once a logo exists.
    icons: [],
  };
}
