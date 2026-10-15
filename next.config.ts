import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SkillWeave relies on request-time data (auth sessions + Prisma queries) for
  // nearly every route. We use classic dynamic rendering rather than the
  // opt-in Cache Components model.
  cacheComponents: false,
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
