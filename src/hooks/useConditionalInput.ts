import { useState, useCallback, useMemo } from "react";
import { ConditionParser } from "../fuzzy/parser";
import { DEFAULT_OPERATORS } from "../condition-structure";
import type { FieldOption, OperatorOption, ConditionGroup, Diagnostic } from "../types";

export type UseConditionalInputOptions = {
    fields: FieldOption[];
    operators?: OperatorOption[];
    values?: Record<string, FieldOption[]>;
    value?: string;
    onChange?: (raw: string) => void;
    onSubmit?: (group: ConditionGroup) => void;
};

export function useConditionalInput({
    fields,
    operators = DEFAULT_OPERATORS,
    values,
    value,
    onChange,
    onSubmit,
}: UseConditionalInputOptions) {
    const [internal, setInternal] = useState("");
    const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
    const text = value ?? internal;

    const parser = useMemo(
        () => new ConditionParser(fields, operators, values),
        [fields, operators, values],
    );

    const handleChange = useCallback(
        (next: string) => {
            if (value === undefined) setInternal(next);
            onChange?.(next);
            setDiagnostics([]);
        },
        [value, onChange],
    );

    const handleSubmit = useCallback(() => {
        const group = parser.parseCompound(text);
        if (group) {
            const hasInvalid = group.entries.some(
                (e) =>
                    !e.condition.field.isValid ||
                    !e.condition.operator.isValid ||
                    !e.condition.value.isValid,
            );
            if (!hasInvalid) {
                onSubmit?.(group);
                setDiagnostics([]);
                if (value === undefined) setInternal("");
                onChange?.("");
                return;
            }
        }
        setDiagnostics(parser.diagnose(text));
    }, [text, parser, value, onChange, onSubmit]);

    const getSuggestion = useCallback((input: string) => parser.getSuggestion(input), [parser]);
    const getCompletions = useCallback(
        (input: string, limit?: number) => parser.getCompletions(input, limit),
        [parser],
    );

    return { text, diagnostics, handleChange, handleSubmit, getSuggestion, getCompletions };
}
