import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Modules like matching.ts import the mongo client which reads this env
    // var at load time; tests only exercise pure helpers, no connection is made.
    env: {
      MONGODB_URI: "mongodb://127.0.0.1:27017/ustad-ai-test",
    },
  },
});
