import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { ConditionalUI } from "react-conditional-ui";

const darkTheme = createTheme({
    palette: {
        mode: "dark",
        primary: { main: "#7c8aff" },
        secondary: { main: "#c084fc" },
        info: { main: "#67e8f9" },
        background: {
            default: "#1a1f2e",
            paper: "#212738",
        },
    },
    shape: { borderRadius: 10 },
    typography: {
        fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
});

const fields = [
    { label: "Age", value: "age" },
    {
        label: "Status",
        value: "status",
        fieldValues: [
            { label: "Ready", value: "ready" },
            { label: "Progressing", value: "progressing" },
            { label: "Complete", value: "complete" },
        ],
    },
    { label: "Name", value: "name" },
    { label: "Score", value: "score" },
];

function App() {
    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <div style={{ maxWidth: 600, margin: "48px auto", padding: "0 16px" }}>
                <h1 style={{ fontSize: 24, marginBottom: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "#e6edf3" }}>
                    react-conditional-ui
                </h1>
                <ConditionalUI
                    fields={fields}
                    onChange={(raw) => console.log("condition:", raw)}
                />
            </div>
        </ThemeProvider>
    );
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
