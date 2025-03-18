import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node", // Ensures tests run in a Node environment
        globals: true, // Optionally enable global APIs (like 'test' and 'expect')
        // You can also configure things like coverage, watch mode, etc.
    },
});
