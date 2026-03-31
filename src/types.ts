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

export type ConditionGroup = {
    id: string;
    entries: ConditionEntry[];
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
};
