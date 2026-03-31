import { describe, it, expect } from "vitest";
import { Field } from "../Field";
import { Operator } from "../Operator";
import { Value } from "../Value";

describe("Field", () => {
    it("valid field has correct properties", () => {
        const option = { label: "Age", value: "age" };
        const f = new Field("age", option, 0);
        expect(f.isValid).toBe(true);
        expect(f.label).toBe("Age");
        expect(f.value).toBe("age");
        expect(f.raw).toBe("age");
        expect(f.score).toBe(0);
    });

    it("invalid field from static factory", () => {
        const f = Field.invalid("xyz");
        expect(f.isValid).toBe(false);
        expect(f.label).toBe("xyz");
        expect(f.value).toBe("");
        expect(f.score).toBe(1);
    });
});

describe("Operator", () => {
    it("valid operator has correct properties", () => {
        const option = { label: "equals", value: "eq", aliases: ["equals"] };
        const op = new Operator("equals", option, 0);
        expect(op.isValid).toBe(true);
        expect(op.label).toBe("equals");
        expect(op.value).toBe("eq");
    });

    it("invalid operator from static factory", () => {
        const op = Operator.invalid("blah");
        expect(op.isValid).toBe(false);
        expect(op.label).toBe("blah");
        expect(op.value).toBe("");
    });
});

describe("Value", () => {
    it("non-empty free-text value is valid", () => {
        const v = new Value("hello");
        expect(v.isValid).toBe(true);
        expect(v.value).toBe("hello");
        expect(v.label).toBe("hello");
    });

    it("empty free-text value is invalid", () => {
        const v = new Value("");
        expect(v.isValid).toBe(false);
        expect(v.value).toBe("");
    });

    it("matches against known values (exact)", () => {
        const known = [{ label: "Active", value: "active" }];
        const v = new Value("active", { knownValues: known });
        expect(v.isValid).toBe(true);
        expect(v.label).toBe("Active");
        expect(v.value).toBe("active");
    });

    it("matches against known values (case-insensitive)", () => {
        const known = [{ label: "Active", value: "active" }];
        const v = new Value("ACTIVE", { knownValues: known });
        expect(v.isValid).toBe(true);
        expect(v.label).toBe("Active");
    });

    it("matches by label when value differs", () => {
        const known = [{ label: "Yes", value: "true" }];
        const v = new Value("yes", { knownValues: known });
        expect(v.isValid).toBe(true);
        expect(v.value).toBe("true");
    });

    it("unknown value against known values is invalid", () => {
        const known = [{ label: "Active", value: "active" }];
        const v = new Value("bogus", { knownValues: known });
        expect(v.isValid).toBe(false);
        expect(v.label).toBe("bogus");
    });

    it("empty value with known values is invalid", () => {
        const known = [{ label: "Active", value: "active" }];
        const v = new Value("", { knownValues: known });
        expect(v.isValid).toBe(false);
    });

    it("fuzzy matches a typo against known values", () => {
        const known = [
            { label: "Ready", value: "ready" },
            { label: "Progressing", value: "progressing" },
        ];
        const v = new Value("read", { knownValues: known });
        expect(v.isValid).toBe(true);
        expect(v.value).toBe("ready");
        expect(v.label).toBe("Ready");
        expect(v.score).toBeGreaterThan(0);
        expect(v.score).toBeLessThanOrEqual(0.4);
    });

    it("fuzzy matches close misspelling", () => {
        const known = [
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
        ];
        const v = new Value("actve", { knownValues: known });
        expect(v.isValid).toBe(true);
        expect(v.value).toBe("active");
    });

    it("exact match has score 0", () => {
        const known = [{ label: "Active", value: "active" }];
        const v = new Value("active", { knownValues: known });
        expect(v.score).toBe(0);
    });

    it("free-text valid value has score 0", () => {
        const v = new Value("anything");
        expect(v.score).toBe(0);
    });

    describe("fieldType: number", () => {
        it("accepts a valid number", () => {
            const v = new Value("42", { fieldType: "number" });
            expect(v.isValid).toBe(true);
            expect(v.errorMessage).toBeNull();
        });

        it("accepts a decimal number", () => {
            const v = new Value("3.14", { fieldType: "number" });
            expect(v.isValid).toBe(true);
        });

        it("accepts negative numbers", () => {
            const v = new Value("-7", { fieldType: "number" });
            expect(v.isValid).toBe(true);
        });

        it("rejects non-numeric string", () => {
            const v = new Value("hello", { fieldType: "number" });
            expect(v.isValid).toBe(false);
            expect(v.errorMessage).toBe("Expected a number");
        });

        it("rejects empty string", () => {
            const v = new Value("", { fieldType: "number" });
            expect(v.isValid).toBe(false);
        });
    });

    describe("fieldType: text", () => {
        it("accepts any non-empty string", () => {
            const v = new Value("hello", { fieldType: "text" });
            expect(v.isValid).toBe(true);
        });

        it("rejects empty string", () => {
            const v = new Value("", { fieldType: "text" });
            expect(v.isValid).toBe(false);
        });
    });

    describe("validateValue callback", () => {
        it("accepts when callback returns true", () => {
            const v = new Value("42", { validateValue: () => true });
            expect(v.isValid).toBe(true);
            expect(v.errorMessage).toBeNull();
        });

        it("rejects when callback returns error string", () => {
            const v = new Value("42", { validateValue: () => "Must be positive" });
            expect(v.isValid).toBe(false);
            expect(v.errorMessage).toBe("Must be positive");
        });

        it("takes priority over fieldType", () => {
            const v = new Value("hello", {
                fieldType: "number",
                validateValue: () => true,
            });
            expect(v.isValid).toBe(true);
        });

        it("can reject a value that fieldType would accept", () => {
            const v = new Value("999", {
                fieldType: "number",
                validateValue: (raw) => Number(raw) <= 100 ? true : "Max value is 100",
            });
            expect(v.isValid).toBe(false);
            expect(v.errorMessage).toBe("Max value is 100");
        });

        it("works with knownValues — runs after fuzzy match", () => {
            const known = [{ label: "Active", value: "active" }];
            const v = new Value("active", {
                knownValues: known,
                validateValue: () => "Custom rejection",
            });
            expect(v.isValid).toBe(false);
            expect(v.errorMessage).toBe("Custom rejection");
        });
    });
});
