import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ["react", "react-dom", "@mui/material", "@mui/icons-material", "@emotion/react", "@emotion/styled", "@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities", "debug"],
    onSuccess: "cp assets/styles.css dist/styles.css",
});
