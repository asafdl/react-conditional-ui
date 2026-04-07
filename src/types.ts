import type React from "react";
import type { Field, Operator, Value } from "./condition-structure";

export type OperatorOption = {
    label: string;
    value: string;
    aliases: string[];
};

export type FieldType = "text" | "number" | "enum";

export type FieldOption = {
    label: string;
    value: string;
    operators?: OperatorOption[];
    fieldValues?: FieldOption[];
    type?: FieldType;
    /** Return `true` if valid, or an error message string. Takes priority over built-in type checks. */
    validateValue?: (raw: string) => true | string;
};

export type ParsedCondition = {
    field: Field;
    operator: Operator;
    value: Value;
};

export type LogicalOperator = "and" | "or";

export type ConditionEntry = {
    id: string;
    condition: ParsedCondition;
    connector: LogicalOperator;
};

export type GroupConfig = {
    /** Logical connector shown between this group and the previous one. Defaults to "and". */
    connector?: LogicalOperator;
    /** Whether condition chips can be edited via popover. Defaults to true. */
    editable?: boolean;
    /** Whether entries can be removed from this group. Defaults to true. */
    removable?: boolean;
    /** Visual variant of the group card. Defaults to "outlined". */
    variant?: "outlined" | "filled";
    /** Optional label displayed above the group. */
    label?: string;
};

export type ConditionGroup = {
    id: string;
    entries: ConditionEntry[];
    config?: GroupConfig;
};

export type Diagnostic = {
    start: number;
    end: number;
    message: string;
};

export type ConditionalUIProps = {
    fields: FieldOption[];
    operators?: OperatorOption[];
    values?: Record<string, FieldOption[]>;
    value?: string;
    onChange?: (raw: string) => void;
    onConditionsChange?: (groups: ConditionGroup[]) => void;
    className?: string;
    style?: React.CSSProperties;
};
