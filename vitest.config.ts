import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Default environment is node for the mocked-DB lib/route suites.
// Component tests opt into a DOM environment with:
//   // @vitest-environment jsdom
// at the top of the test file. plugin-react is required because the
// Next.js tsconfig uses "jsx": "preserve" — vitest cannot transpile
// JSX/TSX without a React transform plugin.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
  },
});