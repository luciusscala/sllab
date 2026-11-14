import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The site is one page now; the old contact page's links land on it.
  async redirects() {
    return [{ source: "/contact", destination: "/", permanent: true }];
  },
};

export default nextConfig;
