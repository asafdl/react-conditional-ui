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

const fieldDocs = fields.map((f) => ({
    name: f.label,
    values: f.fieldValues?.map((v) => v.label),
}));

function App() {
    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
                <header style={{ textAlign: "center", marginBottom: 40 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: "#e6edf3", margin: "0 0 8px" }}>
                        react-conditional-ui
                    </h1>
                    <p style={{ color: "#9ca3af", fontSize: 15, margin: 0 }}>
                        Type natural-language conditions and press <kbd style={kbdStyle}>Enter</kbd>.<br />
                        Suggestions appear inline — press <kbd style={kbdStyle}>Tab</kbd> to accept.
                    </p>
                </header>

                <section style={{ marginBottom: 40 }}>
                    <ConditionalUI
                        fields={fields}
                        onChange={(raw) => console.log("condition:", raw)}
                    />
                </section>

                <footer style={{ display: "flex", gap: 48, color: "#9ca3af", fontSize: 13, lineHeight: 1.8, borderTop: "1px solid #2d333b", paddingTop: 24 }}>
                    <div style={{ flex: 1 }}>
                        <h3 style={sectionHeading}>Fields</h3>
                        <ul style={listStyle}>
                            {fieldDocs.map((f) => (
                                <li key={f.name}>
                                    <span style={{ color: "#7c8aff", fontWeight: 500 }}>{f.name}</span>
                                    {f.values && (
                                        <span style={{ color: "#6b7280" }}> — {f.values.join(", ")}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={sectionHeading}>Examples</h3>
                        <ul style={{ ...listStyle, fontFamily: "monospace" }}>
                            {["age greater than 25", "status is not ready and not progressing", "name contains john and score >= 80"].map((ex) => (
                                <li key={ex} style={{ color: "#67e8f9" }}>{ex}</li>
                            ))}
                        </ul>
                    </div>
                </footer>
            </div>
        </ThemeProvider>
    );
}

const sectionHeading: React.CSSProperties = {
    color: "#c9d1d9",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 8,
    fontWeight: 600,
};

const listStyle: React.CSSProperties = {
    listStyle: "none",
    padding: 0,
    margin: 0,
};

const kbdStyle: React.CSSProperties = {
    background: "#2d333b",
    border: "1px solid #444c56",
    borderRadius: 4,
    padding: "1px 6px",
    fontSize: 12,
    fontFamily: "monospace",
    color: "#e6edf3",
};

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
