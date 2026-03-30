import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "react-conditional-ui": path.resolve(__dirname, "../src"),
            react: path.resolve(__dirname, "node_modules/react"),
            "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
            "@mui/material": path.resolve(__dirname, "node_modules/@mui/material"),
            "@mui/icons-material": path.resolve(__dirname, "node_modules/@mui/icons-material"),
            "@emotion/react": path.resolve(__dirname, "node_modules/@emotion/react"),
            "@emotion/styled": path.resolve(__dirname, "node_modules/@emotion/styled"),
        },
    },
});
