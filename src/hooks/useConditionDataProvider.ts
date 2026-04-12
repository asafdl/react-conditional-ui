import { useMemo, useCallback } from "react";
import { ConditionDataProvider } from "../condition-data-provider";
import { DEFAULT_OPERATORS } from "../condition-structure";
import type { FieldOption, OperatorOption, ConditionGroup, Diagnostic } from "../types";

export type UseConditionDataProviderOptions = {
    fields: FieldOption[];
    operators?: OperatorOption[];
};

export type UseConditionDataProviderResult = {
    provider: ConditionDataProvider;
    parseComplexCondition: (text: string) => ConditionGroup | null;
    getCompletions: (text: string, limit?: number) => { completion: string; display: string }[];
    getSuggestion: (text: string) => { completion: string; display: string } | null;
    diagnose: (text: string) => Diagnostic[];
};

export function useConditionDataProvider({
    fields,
    operators = DEFAULT_OPERATORS,
}: UseConditionDataProviderOptions): UseConditionDataProviderResult {
    const provider = useMemo(
        () => new ConditionDataProvider(fields, operators),
        [fields, operators],
    );

    const parseComplexCondition = useCallback(
        (text: string) => provider.parseComplexCondition(text),
        [provider],
    );
    const getCompletions = useCallback(
        (text: string, limit?: number) => provider.getCompletions(text, limit),
        [provider],
    );
    const getSuggestion = useCallback((text: string) => provider.getSuggestion(text), [provider]);
    const diagnose = useCallback((text: string) => provider.diagnose(text), [provider]);

    return { provider, parseComplexCondition, getCompletions, getSuggestion, diagnose };
}
