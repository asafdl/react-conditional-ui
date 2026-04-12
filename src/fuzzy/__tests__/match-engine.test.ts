import { describe, it, expect } from "vitest";
import { DEFAULT_OPERATORS } from "../../condition-structure";
import { MatchEngine } from "../match-engine";
import type { FieldOption } from "../../types";

const fields: FieldOption[] = [
    { label: "Age", value: "age", type: "number" },
    { label: "Status", value: "status", type: "enum" },
    {
        label: "Priority",
        value: "priority",
        operators: [
            { label: "equals", value: "eq", aliases: ["equals", "is", "="] },
            { label: "not equals", value: "ne", aliases: ["not equals", "is not", "!="] },
        ],
    },
];

describe("match-engine", () => {
    const engine = new MatchEngine(fields, DEFAULT_OPERATORS);
    const statusField = fields.find((f) => f.value === "status")!;
    const priorityField = fields.find((f) => f.value === "priority")!;
    const matchFieldValue = MatchEngine.matchValue;

    describe("matchField", () => {
        it("matches exact field label", () => {
            const result = engine.matchField("age");
            expect(result).not.toBeNull();
            expect(result!.option.value).toBe("age");
        });

        it("matches fuzzy field label", () => {
            const result = engine.matchField("stauts");
            expect(result).not.toBeNull();
            expect(result!.option.value).toBe("status");
        });

        it("returns null for unknown field", () => {
            expect(engine.matchField("height")).toBeNull();
        });
    });

    describe("matchOperator", () => {
        it("matches exact operator alias globally", () => {
            const result = engine.matchOperator("greater than");
            expect(result).not.toBeNull();
            expect(result!.option.value).toBe("gt");
        });

        it("matches fuzzy operator alias globally", () => {
            const result = engine.matchOperator("greter than");
            expect(result).not.toBeNull();
            expect(result!.option.value).toBe("gt");
        });

        it("rejects partial alias when word-count does not match", () => {
            expect(engine.matchOperator("greater")).toBeNull();
        });

        it("respects enum type restrictions for field-specific matching", () => {
            expect(engine.matchOperator("greater than", statusField)).toBeNull();
            const valid = engine.matchOperator("is", statusField);
            expect(valid).not.toBeNull();
            expect(valid!.option.value).toBe("eq");
        });

        it("respects explicit field operator restrictions", () => {
            expect(engine.matchOperator("greater than", priorityField)).toBeNull();
            const valid = engine.matchOperator("is", priorityField);
            expect(valid).not.toBeNull();
            expect(valid!.option.value).toBe("eq");
        });
    });

    describe("matchValue", () => {
        it("non-empty free-text value is valid", () => {
            const v = matchFieldValue("hello");
            expect(v.isValid).toBe(true);
            expect(v.value).toBe("hello");
            expect(v.label).toBe("hello");
        });

        it("empty free-text value is invalid", () => {
            const v = matchFieldValue("");
            expect(v.isValid).toBe(false);
        });

        it("matches against known values (exact)", () => {
            const field = {
                label: "Status",
                value: "status",
                fieldValues: [{ label: "Active", value: "active" }],
            };
            const v = matchFieldValue("active", field);
            expect(v.isValid).toBe(true);
            expect(v.label).toBe("Active");
            expect(v.value).toBe("active");
        });

        it("matches against known values (case-insensitive)", () => {
            const field = {
                label: "Status",
                value: "status",
                fieldValues: [{ label: "Active", value: "active" }],
            };
            const v = matchFieldValue("ACTIVE", field);
            expect(v.isValid).toBe(true);
            expect(v.label).toBe("Active");
        });

        it("matches by label when value differs", () => {
            const field = {
                label: "Flag",
                value: "flag",
                fieldValues: [{ label: "Yes", value: "true" }],
            };
            const v = matchFieldValue("yes", field);
            expect(v.isValid).toBe(true);
            expect(v.value).toBe("true");
        });

        it("unknown value against known values is invalid", () => {
            const field = {
                label: "Status",
                value: "status",
                fieldValues: [{ label: "Active", value: "active" }],
            };
            const v = matchFieldValue("bogus", field);
            expect(v.isValid).toBe(false);
            expect(v.label).toBe("bogus");
        });

        it("empty value with known values is invalid", () => {
            const field = {
                label: "Status",
                value: "status",
                fieldValues: [{ label: "Active", value: "active" }],
            };
            const v = matchFieldValue("", field);
            expect(v.isValid).toBe(false);
        });

        it("fuzzy matches a typo against known values", () => {
            const field = {
                label: "Status",
                value: "status",
                fieldValues: [
                    { label: "Ready", value: "ready" },
                    { label: "Progressing", value: "progressing" },
                ],
            };
            const v = matchFieldValue("read", field);
            expect(v.isValid).toBe(true);
            expect(v.value).toBe("ready");
            expect(v.label).toBe("Ready");
        });

        it("fuzzy matches close misspelling", () => {
            const field = {
                label: "Status",
                value: "status",
                fieldValues: [
                    { label: "Active", value: "active" },
                    { label: "Inactive", value: "inactive" },
                ],
            };
            const v = matchFieldValue("actve", field);
            expect(v.isValid).toBe(true);
            expect(v.value).toBe("active");
        });

        describe("fieldType: number", () => {
            const numField = { label: "Age", value: "age", type: "number" as const };

            it("accepts a valid number", () => {
                const v = matchFieldValue("42", numField);
                expect(v.isValid).toBe(true);
                expect(v.errorMessage).toBeNull();
            });

            it("accepts a decimal number", () => {
                expect(matchFieldValue("3.14", numField).isValid).toBe(true);
            });

            it("accepts negative numbers", () => {
                expect(matchFieldValue("-7", numField).isValid).toBe(true);
            });

            it("rejects non-numeric string", () => {
                const v = matchFieldValue("hello", numField);
                expect(v.isValid).toBe(false);
                expect(v.errorMessage).toBe("Expected a number");
            });

            it("rejects empty string", () => {
                expect(matchFieldValue("", numField).isValid).toBe(false);
            });
        });

        describe("fieldType: text", () => {
            const textField = { label: "Name", value: "name", type: "text" as const };

            it("accepts any non-empty string", () => {
                expect(matchFieldValue("hello", textField).isValid).toBe(true);
            });

            it("rejects empty string", () => {
                expect(matchFieldValue("", textField).isValid).toBe(false);
            });
        });

        describe("validateValue callback", () => {
            it("accepts when callback returns true", () => {
                const field = { label: "X", value: "x", validateValue: () => true as const };
                const v = matchFieldValue("42", field);
                expect(v.isValid).toBe(true);
                expect(v.errorMessage).toBeNull();
            });

            it("rejects when callback returns error string", () => {
                const field = { label: "X", value: "x", validateValue: () => "Must be positive" };
                const v = matchFieldValue("42", field);
                expect(v.isValid).toBe(false);
                expect(v.errorMessage).toBe("Must be positive");
            });

            it("takes priority over fieldType", () => {
                const field = {
                    label: "X",
                    value: "x",
                    type: "number" as const,
                    validateValue: () => true as const,
                };
                expect(matchFieldValue("hello", field).isValid).toBe(true);
            });

            it("can reject a value that fieldType would accept", () => {
                const field = {
                    label: "X",
                    value: "x",
                    type: "number" as const,
                    validateValue: (raw: string) =>
                        Number(raw) <= 100 ? (true as const) : "Max value is 100",
                };
                const v = matchFieldValue("999", field);
                expect(v.isValid).toBe(false);
                expect(v.errorMessage).toBe("Max value is 100");
            });

            it("works with knownValues — runs after fuzzy match", () => {
                const field = {
                    label: "Status",
                    value: "status",
                    fieldValues: [{ label: "Active", value: "active" }],
                    validateValue: () => "Custom rejection",
                };
                const v = matchFieldValue("active", field);
                expect(v.isValid).toBe(false);
                expect(v.errorMessage).toBe("Custom rejection");
            });
        });
    });
});
