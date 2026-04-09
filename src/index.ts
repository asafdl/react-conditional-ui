import "../assets/styles.css";

export { ConditionalUI } from "./components/ConditionalUI";
export { Input } from "./components/Input";
export { Output } from "./components/Output";
export { useConditionalInput } from "./hooks/useConditionalInput";
export { useConditionalOutput } from "./hooks/useConditionalOutput";
export { ConditionParser } from "./condition-parser";
export { DEFAULT_OPERATORS } from "./fuzzy/operators";
export type {
    FieldOption,
    FieldType,
    OperatorOption,
    ParsedCondition,
    LogicalOperator,
    ConditionEntry,
    ConditionGroup,
    GroupConfig,
    ConditionalUIProps,
    Diagnostic,
} from "./types";
export type { InputProps } from "./components/Input";
export type { OutputProps, GroupMutations } from "./components/Output";
export type { UseConditionalInputOptions } from "./hooks/useConditionalInput";
export type { UseConditionalOutputOptions } from "./hooks/useConditionalOutput";
