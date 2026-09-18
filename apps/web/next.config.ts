import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This repo maintains its own docs/ and README.md; skip Next's generated ones.
  agentRules: false,
};

export default nextConfig;
