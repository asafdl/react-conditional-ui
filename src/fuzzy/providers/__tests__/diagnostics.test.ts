import { describe, it, expect } from "vitest";
import { DEFAULT_OPERATORS } from "../../../condition-structure";
import { ConditionDataProvider } from "../../../condition-data-provider";
import type { FieldOption } from "../../../types";
import { fieldsWithConfig } from "../../../__tests__/condition-fixtures";

describe("diagnostics", () => {
    const p = new ConditionDataProvider(fieldsWithConfig, DEFAULT_OPERATORS);

    it("returns empty array for a fully valid condition", () => {
        expect(p.diagnose("age gt 5")).toEqual([]);
    });
    it("returns empty array for valid condition with fieldValues", () => {
        expect(p.diagnose("status is ready")).toEqual([]);
    });
    it("diagnoses completely unrecognized input", () => {
        const d = p.diagnose("xyzzy foobar baz");
        expect(d).toHaveLength(1);
        expect(d[0].message).toMatch(/could not understand/i);
    });
    it("diagnoses empty input", () => {
        const d = p.diagnose("");
        expect(d).toHaveLength(1);
        expect(d[0].message).toMatch(/empty/i);
    });
    it("diagnoses invalid value for field with fieldValues", () => {
        const d = p.diagnose("status is banana");
        expect(d).toHaveLength(1);
        expect(d[0].message).toMatch(/value not recognized/i);
    });
    it("diagnoses operator not supported for restricted field", () => {
        const d = p.diagnose("priority greater than high");
        expect(d).toHaveLength(1);
        expect(d[0].message).toMatch(/Operator not supported for Priority/i);
    });
    it("returns diagnostics per segment in compound condition", () => {
        const d = p.diagnose("age gt 5 and status is banana");
        expect(d.some((diag) => diag.message.match(/value not recognized/i))).toBe(true);
    });

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

    const typedParser = new ConditionDataProvider(typedFields, DEFAULT_OPERATORS);

    it("diagnoses non-numeric value on number field", () => {
        const d = typedParser.diagnose("age gt hello");
        expect(d).toHaveLength(1);
        expect(d[0].message).toBe("Expected a number");
    });
    it("diagnoses operator not supported for enum field", () => {
        const d = typedParser.diagnose("status greater than ready");
        expect(d.length).toBeGreaterThan(0);
        expect(d[0].message).toMatch(/operator not supported|could not understand/i);
    });

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

    const validatedParser = new ConditionDataProvider(validatedFields, DEFAULT_OPERATORS);

    it("diagnoses custom validation error", () => {
        const d = validatedParser.diagnose("age is 200");
        expect(d).toHaveLength(1);
        expect(d[0].message).toBe("Age must be between 0 and 150");
    });
    it("diagnoses email validation error", () => {
        const d = validatedParser.diagnose("email is john");
        expect(d).toHaveLength(1);
        expect(d[0].message).toBe("Must be a valid email");
    });
    it("no diagnostics for valid email", () => {
        expect(validatedParser.diagnose("email is john@test.com")).toHaveLength(0);
    });
});
