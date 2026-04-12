import type { FieldOption, FieldType, OperatorOption } from "../types";

const TYPE_ALLOWED_OPS: Record<FieldType, Set<string>> = {
    number: new Set(["eq", "ne", "gt", "lt", "gte", "lte"]),
    enum: new Set(["eq", "ne"]),
    text: new Set(["eq", "ne", "contains", "starts_with"]),
};

export function allowedOperatorsForField(
    field: FieldOption,
    allOperators: OperatorOption[],
): OperatorOption[] {
    if (field.operators) return field.operators;
    if (field.type) {
        const allowed = TYPE_ALLOWED_OPS[field.type];
        return allOperators.filter((op) => allowed.has(op.value));
    }
    return allOperators;
}
