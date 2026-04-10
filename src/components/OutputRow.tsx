import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Chip from "@mui/material/Chip";
import Popover from "@mui/material/Popover";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import type { FieldOption, OperatorOption, ParsedCondition as Condition } from "../types";
import { Field, Operator } from "../condition-structure";
import { MatchEngine } from "../fuzzy/match-engine";

type ChipTarget = "field" | "operator" | "value";

export type OutputRowProps = {
    id: string;
    condition: Condition;
    fields: FieldOption[];
    operators: OperatorOption[];
    onUpdate?: (condition: Condition) => void;
    onRemove?: () => void;
};

export function OutputRow({
    id,
    condition,
    fields,
    operators,
    onUpdate,
    onRemove,
}: OutputRowProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
        useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    const [popover, setPopover] = useState<{
        target: ChipTarget;
        anchor: HTMLElement;
    } | null>(null);
    const [valueEdit, setValueEdit] = useState("");

    const openPopover = (target: ChipTarget, anchor: HTMLElement) => {
        setPopover({ target, anchor });
        if (target === "value") setValueEdit(condition.value.raw ?? "");
    };

    const closePopover = () => setPopover(null);

    const editable = !!onUpdate;

    const resolveFieldValues = (f: FieldOption) => f.fieldValues;

    const resolveOperators = (f: FieldOption) => f.operators ?? operators;

    const selectField = (f: FieldOption) => {
        onUpdate?.({
            ...condition,
            field: new Field(f.label, f.value, f.label),
            value: MatchEngine.matchValue(condition.value.raw, f),
        });
        closePopover();
    };

    const selectOperator = (op: OperatorOption) => {
        onUpdate?.({
            ...condition,
            operator: new Operator(op.label, op.value, op.label),
        });
        closePopover();
    };

    const submitValue = (raw: string) => {
        const fieldConfig = fields.find((f) => f.value === condition.field.value);
        onUpdate?.({
            ...condition,
            value: MatchEngine.matchValue(raw, fieldConfig),
        });
        closePopover();
    };

    const currentField = fields.find((f) => f.value === condition.field.value);
    const fieldValues = currentField ? resolveFieldValues(currentField) : undefined;
    const activeOperators = currentField ? resolveOperators(currentField) : operators;

    const rowClass = ["rcui-row", isOver && !isDragging ? "rcui-row--over" : ""]
        .filter(Boolean)
        .join(" ");

    return (
        <div ref={setNodeRef} style={style} className={rowClass}>
            <div
                {...attributes}
                {...listeners}
                className="rcui-drag-handle"
                aria-label="drag handle"
            >
                <DragIndicatorIcon fontSize="small" />
            </div>
            <Chip
                label={condition.field.label}
                color={condition.field.isValid ? "primary" : "error"}
                variant="filled"
                onClick={editable ? (e) => openPopover("field", e.currentTarget) : undefined}
                className={condition.field.isValid ? "rcui-chip-field" : "rcui-chip-field--error"}
            />
            <Chip
                label={condition.operator.label}
                color={condition.operator.isValid ? "secondary" : "error"}
                variant="filled"
                onClick={editable ? (e) => openPopover("operator", e.currentTarget) : undefined}
                className={
                    condition.operator.isValid ? "rcui-chip-operator" : "rcui-chip-operator--error"
                }
            />
            <Chip
                label={condition.value.label || "…"}
                variant="filled"
                onClick={editable ? (e) => openPopover("value", e.currentTarget) : undefined}
                className="rcui-chip-value"
            />
            {onRemove && (
                <IconButton size="small" onClick={onRemove} aria-label="remove condition">
                    <CloseIcon fontSize="small" />
                </IconButton>
            )}

            {editable && (
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
                                    selected={f.value === condition.field.value}
                                    onClick={() => selectField(f)}
                                >
                                    <ListItemText primary={f.label} />
                                </ListItemButton>
                            ))}
                        </List>
                    )}

                    {popover?.target === "operator" && (
                        <List dense>
                            {activeOperators.map((op) => (
                                <ListItemButton
                                    key={op.value}
                                    selected={op.value === condition.operator.value}
                                    onClick={() => selectOperator(op)}
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
                                        selected={v.value === condition.value.value}
                                        onClick={() => submitValue(v.value)}
                                    >
                                        <ListItemText primary={v.label} />
                                    </ListItemButton>
                                ))}
                            </List>
                        ) : (
                            <div className="rcui-popover-value-edit">
                                <TextField
                                    size="small"
                                    autoFocus
                                    value={valueEdit}
                                    onChange={(e) => setValueEdit(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") submitValue(valueEdit);
                                    }}
                                    placeholder="Enter value"
                                />
                            </div>
                        ))}
                </Popover>
            )}
        </div>
    );
}
