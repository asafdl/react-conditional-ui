import { useState } from "react";
import Chip from "@mui/material/Chip";
import Popover from "@mui/material/Popover";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { FieldOption, OperatorOption, ParsedCondition } from "../types";

type ChipTarget = "field" | "operator" | "value";

export type OutputProps = {
    parsed: ParsedCondition | null;
    fields: FieldOption[];
    operators: OperatorOption[];
    values?: Record<string, FieldOption[]>;
    onUpdate: (parsed: ParsedCondition) => void;
};

export function Output({ parsed, fields, operators, values, onUpdate }: OutputProps) {
    const [popover, setPopover] = useState<{
        target: ChipTarget;
        anchor: HTMLElement;
    } | null>(null);
    const [valueEdit, setValueEdit] = useState("");

    if (!parsed) {
        return (
            <Typography variant="body2" color="text.secondary">
                Parsed condition will appear here…
            </Typography>
        );
    }

    const openPopover = (target: ChipTarget, anchor: HTMLElement) => {
        setPopover({ target, anchor });
        if (target === "value") setValueEdit(parsed.value ?? "");
    };

    const closePopover = () => setPopover(null);

    const updateField = (target: ChipTarget, newValue: string) => {
        onUpdate({ ...parsed, [target]: newValue });
        closePopover();
    };

    const fieldLabel = fields.find((f) => f.value === parsed.field)?.label ?? parsed.field;
    const operatorLabel =
        operators.find((o) => o.value === parsed.operator)?.label ?? parsed.operator;
    const fieldValues = values?.[parsed.field];

    return (
        <>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                <Chip
                    label={fieldLabel}
                    color="primary"
                    variant="outlined"
                    onClick={(e) => openPopover("field", e.currentTarget)}
                />
                <Chip
                    label={operatorLabel}
                    color="secondary"
                    variant="outlined"
                    onClick={(e) => openPopover("operator", e.currentTarget)}
                />
                <Chip
                    label={parsed.value || "…"}
                    color="default"
                    variant="outlined"
                    onClick={(e) => openPopover("value", e.currentTarget)}
                />
            </Box>

            <Popover
                open={!!popover}
                anchorEl={popover?.anchor}
                onClose={closePopover}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            >
                {popover?.target === "field" && (
                    <List dense>
                        {fields.map((f) => (
                            <ListItemButton
                                key={f.value}
                                selected={f.value === parsed.field}
                                onClick={() => updateField("field", f.value)}
                            >
                                <ListItemText primary={f.label} />
                            </ListItemButton>
                        ))}
                    </List>
                )}

                {popover?.target === "operator" && (
                    <List dense>
                        {operators.map((op) => (
                            <ListItemButton
                                key={op.value}
                                selected={op.value === parsed.operator}
                                onClick={() => updateField("operator", op.value)}
                            >
                                <ListItemText primary={op.label} />
                            </ListItemButton>
                        ))}
                    </List>
                )}

                {popover?.target === "value" &&
                    (fieldValues ? (
                        <List dense>
                            {fieldValues.map((v) => (
                                <ListItemButton
                                    key={v.value}
                                    selected={v.value === parsed.value}
                                    onClick={() => updateField("value", v.value)}
                                >
                                    <ListItemText primary={v.label} />
                                </ListItemButton>
                            ))}
                        </List>
                    ) : (
                        <Box sx={{ p: 1.5 }}>
                            <TextField
                                size="small"
                                autoFocus
                                value={valueEdit}
                                onChange={(e) => setValueEdit(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") updateField("value", valueEdit);
                                }}
                                placeholder="Enter value"
                            />
                        </Box>
                    ))}
            </Popover>
        </>
    );
}
