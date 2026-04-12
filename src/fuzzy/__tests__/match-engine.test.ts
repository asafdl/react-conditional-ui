import { describe, it, expect } from "vitest";
import { DEFAULT_OPERATORS } from "../../condition-structure";
import { ConditionDataProvider } from "../../condition-data-provider";
import { expectGroup, fieldsWithConfig } from "../../__tests__/condition-fixtures";

describe("match-engine", () => {
    const p = new ConditionDataProvider(fieldsWithConfig, DEFAULT_OPERATORS);

    it("fuzzy matches a value from field.fieldValues", () => {
        const c = p.parseComplexCondition("status is read")!.entries[0].condition;
        expect(c.value.isValid).toBe(true);
        expect(c.value.value).toBe("ready");
        expect(c.value.label).toBe("Ready");
    });
    it("exact matches a value from field.fieldValues", () => {
        const c = p.parseComplexCondition("status is ready")!.entries[0].condition;
        expect(c.value.isValid).toBe(true);
        expect(c.value.value).toBe("ready");
    });
    it("fuzzy matches value with 'progressing' fieldValue", () => {
        const c = p.parseComplexCondition("status is prog")!.entries[0].condition;
        expect(c.value.isValid).toBe(true);
        expect(c.value.value).toBe("progressing");
    });
    it("freeform value on field without fieldValues", () => {
        const c = p.parseComplexCondition("age gt 42")!.entries[0].condition;
        expect(c.value.isValid).toBe(true);
        expect(c.value.value).toBe("42");
    });
    it("OR compound with known values", () => {
        expectGroup(
            "status is ready or complete",
            "or",
            [
                { field: "status", operator: "eq", value: "ready" },
                { field: "status", operator: "eq", value: "complete" },
            ],
            p,
        );
    });
    it("AND compound with known values on both fields", () => {
        expectGroup(
            "priority is high and status is ready",
            "and",
            [
                { field: "priority", operator: "eq", value: "high" },
                { field: "status", operator: "eq", value: "ready" },
            ],
            p,
        );
    });
    it("OR with negation and known values", () => {
        expectGroup(
            "status is not ready or not complete",
            "or",
            [
                { field: "status", operator: "ne", value: "ready" },
                { field: "status", operator: "ne", value: "complete" },
            ],
            p,
        );
    });

    it("matches restricted operator for field with custom operators", () => {
        const c = p.parseComplexCondition("priority is high")!.entries[0].condition;
        expect(c.field.value).toBe("priority");
        expect(c.operator.value).toBe("eq");
        expect(c.value.value).toBe("high");
    });
    it("returns invalid operator when operator is not in field.operators", () => {
        const g = p.parseComplexCondition("priority greater than high");
        expect(g).not.toBeNull();
        expect(g!.entries[0].condition.field.value).toBe("priority");
        expect(g!.entries[0].condition.operator.isValid).toBe(false);
    });
    it("falls back to global operators for fields without field.operators", () => {
        const c = p.parseComplexCondition("status greater than ready")!.entries[0].condition;
        expect(c.field.value).toBe("status");
        expect(c.operator.value).toBe("gt");
    });
    it("fuzzy matches values on field with restricted operators", () => {
        const c = p.parseComplexCondition("priority is hig")!.entries[0].condition;
        expect(c.value.isValid).toBe(true);
        expect(c.value.value).toBe("high");
    });
});
