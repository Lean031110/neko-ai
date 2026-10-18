import type { NextConfig } from "next";

/**
 * Configuración de Next.js.
 *
 * Para GitHub Pages usamos output: "export" (HTML estático).
 * El base path se inyecta automáticamente desde la env BASE_PATH
 * (GitHub Pages lo requiere: /neko-ai).
 */
const isExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: isExport ? "export" : "standalone",
  // En export estático, las imágenes no se optimizan en server
  images: { unoptimized: true },
  // GitHub Pages sirve bajo /<repo>/
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
