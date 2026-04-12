import "../assets/styles.css";

export { ConditionalUI } from "./components/ConditionalUI";
export { Input, ManagedInput, ControlledInput } from "./components/Input";
export { Output, ManagedOutput, ControlledOutput, ReadOnlyOutput } from "./components/Output";
export { useConditionalInput } from "./hooks/useConditionalInput";
export { useConditionalOutput } from "./hooks/useConditionalOutput";
export { useConditionDataProvider } from "./hooks/useConditionDataProvider";
export {
    ConditionDataProvider,
    ConditionDataProvider as ConditionParser,
} from "./condition-data-provider";
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
    ConditionalUIInputSlotProps,
    ConditionalUIOutputSlotProps,
    Diagnostic,
} from "./types";
export type { InputProps, ManagedInputProps, ControlledInputProps } from "./components/Input";
export type {
    OutputProps,
    ManagedOutputProps,
    ControlledOutputProps,
    ReadOnlyOutputProps,
    GroupMutations,
} from "./components/Output";
export type { UseConditionalInputOptions } from "./hooks/useConditionalInput";
export type { UseConditionalOutputOptions } from "./hooks/useConditionalOutput";
export type {
    UseConditionDataProviderOptions,
    UseConditionDataProviderResult,
} from "./hooks/useConditionDataProvider";
