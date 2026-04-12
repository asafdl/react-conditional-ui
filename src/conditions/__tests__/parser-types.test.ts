import { describe, it, expect } from "vitest";
import { ConditionDataProvider } from "../../condition-data-provider";
import { DEFAULT_OPERATORS } from "../../condition-structure";
import type { FieldOption } from "../../types";

describe("parser: field types and validation", () => {
    describe("field types", () => {
        const typedFields: FieldOption[] = [
            { label: "Age", value: "age", type: "number" },
            {
                label: "Status",
                value: "status",
                type: "enum",
                fieldValues: [
                    { label: "Ready", value: "ready" },
                    { label: "Progressing", value: "progressing" },
                    { label: "Complete", value: "complete" },
                ],
            },
            { label: "Name", value: "name", type: "text" },
            { label: "Score", value: "score", type: "number" },
        ];

        const tp = new ConditionDataProvider(typedFields, DEFAULT_OPERATORS);

        it("parses numeric field with valid number", () => {
            const c = tp.parseComplexCondition("age gt 25")!.entries[0].condition;
            expect(c.value.isValid).toBe(true);
        });
        it("marks non-numeric value as invalid", () => {
            const c = tp.parseComplexCondition("age gt hello")!.entries[0].condition;
            expect(c.value.isValid).toBe(false);
            expect(c.value.errorMessage).toBe("Expected a number");
        });
        it("parses enum field with valid value", () => {
            const c = tp.parseComplexCondition("status is ready")!.entries[0].condition;
            expect(c.value.isValid).toBe(true);
        });
        it("parses 'is not' as ne on enum field", () => {
            const c = tp.parseComplexCondition("status is not ready")!.entries[0].condition;
            expect(c.operator.value).toBe("ne");
            expect(c.value.value).toBe("ready");
            expect(c.value.isValid).toBe(true);
        });
        it("rejects gt on enum field", () => {
            const g = tp.parseComplexCondition("status gt ready");
            expect(g).not.toBeNull();
            expect(g!.entries[0].condition.field.value).toBe("status");
            expect(g!.entries[0].condition.operator.isValid).toBe(false);
        });
        it("rejects gt on text field", () => {
            const g = tp.parseComplexCondition("name gt something");
            expect(g).not.toBeNull();
            expect(g!.entries[0].condition.field.value).toBe("name");
            expect(g!.entries[0].condition.operator.isValid).toBe(false);
        });
        it("allows eq on text field", () => {
            const c = tp.parseComplexCondition("name is john")!.entries[0].condition;
            expect(c.value.isValid).toBe(true);
        });
    });

    describe("validateValue on FieldOption", () => {
        const validatedFields: FieldOption[] = [
            {
                label: "Age",
                value: "age",
                type: "number",
                validateValue: (raw) => {
                    const n = Number(raw);
                    if (!isFinite(n)) return "Expected a number";
                    if (n < 0 || n > 150) return "Age must be between 0 and 150";
                    return true;
                },
            },
            {
                label: "Email",
                value: "email",
                type: "text",
                validateValue: (raw) => (raw.includes("@") ? true : "Must be a valid email"),
            },
        ];

        const vp = new ConditionDataProvider(validatedFields, DEFAULT_OPERATORS);

        it("accepts value passing custom validator", () => {
            const c = vp.parseComplexCondition("age is 25")!.entries[0].condition;
            expect(c.value.isValid).toBe(true);
        });
        it("rejects value failing custom validator", () => {
            const c = vp.parseComplexCondition("age is 200")!.entries[0].condition;
            expect(c.value.isValid).toBe(false);
            expect(c.value.errorMessage).toBe("Age must be between 0 and 150");
        });
    });
});
