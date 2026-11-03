import type { NextConfig } from "next";

// Logo-urile și pozele stau în Supabase Storage (bucket public „media”).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    qualities: [70, 75],
    remotePatterns: supabaseUrl ? [new URL(`${supabaseUrl}/storage/v1/object/public/media/**`)] : [],
  },
  experimental: {
    // Logo-urile au maxim 1 MB (verificat în acțiune); restul e rezervă pentru multipart.
    serverActions: { bodySizeLimit: "2mb" },
  },
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
