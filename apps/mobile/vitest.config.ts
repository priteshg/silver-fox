import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // React Native globals that Metro normally injects at build time.
  define: {
    __DEV__: JSON.stringify(true),
  },
  resolve: {
    // Lets component tests render React Native views under jsdom via their
    // web implementations, instead of needing a full native test runtime.
    alias: [{ find: "react-native", replacement: "react-native-web" }],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["**/node_modules/**", "**/.expo/**", "**/dist/**", "**/e2e/**", "**/integration/**"],
  },
});
