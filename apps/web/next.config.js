/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ["en", "ja"],
    defaultLocale: "en"
  },
  async rewrites() {
    if (process.env.NEXT_PUBLIC_MOCK_API === "1") return [];
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/:path*`
      }
    ];
  }
};

module.exports = nextConfig;
