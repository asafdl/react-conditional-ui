import { useState, useCallback } from "react";
import Box from "@mui/material/Box";
import { Input } from "./Input";
import { Output } from "./Output";
import { parseCondition } from "../fuzzy/parse";
import { DEFAULT_OPERATORS } from "../operators";
import type { ConditionalUIProps, ParsedCondition } from "../types";

export function ConditionalUI({
    fields,
    operators = DEFAULT_OPERATORS,
    values,
    value,
    onChange,
}: ConditionalUIProps) {
    const [internal, setInternal] = useState("");
    const [parsed, setParsed] = useState<ParsedCondition | null>(null);
    const text = value ?? internal;

    const handleChange = useCallback(
        (next: string) => {
            if (value === undefined) setInternal(next);
            onChange?.(next);
        },
        [value, onChange],
    );

    const handleSubmit = useCallback(() => {
        setParsed(parseCondition(text, fields, operators));
    }, [text, fields, operators]);

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Input value={text} onChange={handleChange} onSubmit={handleSubmit} />
            <Output
                parsed={parsed}
                fields={fields}
                operators={operators}
                values={values}
                onUpdate={setParsed}
            />
        </Box>
    );
}
