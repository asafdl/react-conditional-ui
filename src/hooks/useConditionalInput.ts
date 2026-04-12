import { useState, useCallback } from "react";
import { DEFAULT_OPERATORS } from "../condition-structure";
import type { FieldOption, OperatorOption, ConditionGroup, Diagnostic } from "../types";
import { useConditionDataProvider } from "./useConditionDataProvider";

export type UseConditionalInputOptions = {
    fields: FieldOption[];
    operators?: OperatorOption[];
    value?: string;
    onChange?: (raw: string) => void;
    onSubmit?: (group: ConditionGroup) => void;
};

export function useConditionalInput({
    fields,
    operators = DEFAULT_OPERATORS,
    value,
    onChange,
    onSubmit,
}: UseConditionalInputOptions) {
    const [internal, setInternal] = useState("");
    const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
    const text = value ?? internal;

    const { parseComplexCondition, getSuggestion, getCompletions, diagnose } =
        useConditionDataProvider({
            fields,
            operators,
        });

    const handleChange = useCallback(
        (next: string) => {
            if (value === undefined) setInternal(next);
            onChange?.(next);
            setDiagnostics([]);
        },
        [value, onChange],
    );

    const handleSubmit = useCallback(() => {
        const group = parseComplexCondition(text);
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
        setDiagnostics(diagnose(text));
    }, [text, parseComplexCondition, diagnose, value, onChange, onSubmit]);

    return { text, diagnostics, handleChange, handleSubmit, getSuggestion, getCompletions };
}
