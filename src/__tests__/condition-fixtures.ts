import { expect } from "vitest";
import { ConditionDataProvider } from "../condition-data-provider";
import type { FieldOption } from "../types";
import { DEFAULT_OPERATORS } from "../condition-structure";

export const fields: FieldOption[] = [
    { label: "Age", value: "age" },
    { label: "Status", value: "status" },
    { label: "Name", value: "name" },
    { label: "Score", value: "score" },
];

export const fieldsWithConfig: FieldOption[] = [
    { label: "Age", value: "age" },
    {
        label: "Status",
        value: "status",
        fieldValues: [
            { label: "Ready", value: "ready" },
            { label: "Progressing", value: "progressing" },
            { label: "Complete", value: "complete" },
        ],
    },
    {
        label: "Priority",
        value: "priority",
        operators: [
            { label: "equals", value: "eq", aliases: ["equals", "is", "="] },
            { label: "not equals", value: "ne", aliases: ["not equals", "is not", "!="] },
        ],
        fieldValues: [
            { label: "High", value: "high" },
            { label: "Medium", value: "medium" },
            { label: "Low", value: "low" },
        ],
    },
];

export const defaultParser = new ConditionDataProvider(fields, DEFAULT_OPERATORS);

export function expectCondition(
    text: string,
    field: string,
    operator: string,
    value: string,
    p: ConditionDataProvider = defaultParser,
) {
    const group = p.parseComplexCondition(text);
    expect(group).not.toBeNull();
    expect(group!.entries).toHaveLength(1);
    const c = group!.entries[0].condition;
    expect(c.field.value).toBe(field);
    expect(c.operator.value).toBe(operator);
    expect(c.value.value).toBe(value);
}

export function expectGroup(
    text: string,
    connector: "and" | "or",
    expected: { field: string; operator: string; value: string }[],
    p: ConditionDataProvider = defaultParser,
) {
    const group = p.parseComplexCondition(text);
    expect(group).not.toBeNull();
    expect(group!.entries).toHaveLength(expected.length);
    expected.forEach((exp, i) => {
        const entry = group!.entries[i];
        expect(entry.connector).toBe(connector);
        expect(entry.condition.field.value).toBe(exp.field);
        expect(entry.condition.operator.value).toBe(exp.operator);
        expect(entry.condition.value.value).toBe(exp.value);
    });
}
