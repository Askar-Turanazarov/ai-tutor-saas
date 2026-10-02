import type { NextConfig } from "next";

// Equivalent of next-intl's `createNextIntlPlugin("./src/i18n/request.ts")`, without pulling in
// the plugin's native SWC dependency (its message extractor is not used here).
// Turbopack is used for dev and build: webpack rejects project paths containing "!".
const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "next-intl/config": "./src/i18n/request.ts",
    },
  },
};

export default nextConfig;
