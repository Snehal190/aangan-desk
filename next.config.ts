import type { NextConfig } from "next";

// Every page here is live call data read per request, so we use the classic
// dynamic-rendering model rather than Cache Components.
const nextConfig: NextConfig = {
  // The agent reads /knowledge at runtime; make sure Vercel ships it.
  outputFileTracingIncludes: { "/api/**/*": ["./knowledge/**/*"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
