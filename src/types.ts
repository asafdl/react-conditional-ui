export type FieldOption = {
    label: string;
    value: string;
};

export type OperatorOption = {
    label: string;
    value: string;
    aliases: string[];
};

export type ParsedCondition = {
    field: string;
    operator: string;
    value: string;
};

export type ConditionalUIProps = {
    fields: FieldOption[];
    operators?: OperatorOption[];
    values?: Record<string, FieldOption[]>;
    value?: string;
    onChange?: (raw: string) => void;
};
