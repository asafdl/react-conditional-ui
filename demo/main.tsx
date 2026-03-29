import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConditionalUI } from "react-conditional-ui";

const fields = [
    { label: "Age", value: "age" },
    { label: "Status", value: "status" },
    { label: "Name", value: "name" },
    { label: "Score", value: "score" },
];

const values = {
    status: [
        { label: "active", value: "active" },
        { label: "inactive", value: "inactive" },
    ],
};

function App() {
    return (
        <div style={{ maxWidth: 600, margin: "48px auto", padding: "0 16px" }}>
            <h1 style={{ fontSize: 24, marginBottom: 24 }}>react-conditional-ui</h1>
            <ConditionalUI
                fields={fields}
                values={values}
                onChange={(raw) => console.log("condition:", raw)}
            />
        </div>
    );
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
