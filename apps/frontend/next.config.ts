import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // EmulatorJS's threaded WASM cores need SharedArrayBuffer, which browsers only
  // expose to a "cross-origin isolated" page (COOP+COEP both set). Scoped to the
  // player route rather than the whole site, since COEP blocks any cross-origin
  // subresource (images, fonts, third-party embeds) that doesn't send back a
  // matching CORP/CORS header.
  async headers() {
    return [
      {
        source: "/play/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
      {
        // Let the isolated /play page load these same-origin static assets
        // (loader.js, cores, ROMs) even when it's cross-origin isolated.
        source: "/emulators/:path*",
        headers: [{ key: "Cross-Origin-Resource-Policy", value: "cross-origin" }],
      },
    ];
  },
};

export default nextConfig;
