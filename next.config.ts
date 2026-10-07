import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nada de esto se indexa: son documentos privados de clientes.
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
