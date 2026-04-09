import { describe, it, expect } from "vitest";
import { Field } from "../Field";
import { Operator } from "../Operator";
import { Value } from "../Value";
import { matchFieldValue } from "../../fuzzy/field-value-matcher";

describe("Field", () => {
    it("valid field has correct properties", () => {
        const f = new Field("age", "age", "Age");
        expect(f.isValid).toBe(true);
        expect(f.label).toBe("Age");
        expect(f.value).toBe("age");
        expect(f.raw).toBe("age");
    });

    it("invalid field from static factory", () => {
        const f = Field.invalid("xyz");
        expect(f.isValid).toBe(false);
        expect(f.label).toBe("xyz");
        expect(f.value).toBe("");
    });
});

describe("Operator", () => {
    it("valid operator has correct properties", () => {
        const op = new Operator("equals", "eq", "equals");
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

describe("Value (POJO)", () => {
    it("defaults to valid when raw is non-empty", () => {
        const v = new Value("hello");
        expect(v.isValid).toBe(true);
        expect(v.value).toBe("hello");
        expect(v.label).toBe("hello");
        expect(v.matchedOption).toBeNull();
        expect(v.errorMessage).toBeNull();
    });

    it("defaults to invalid when raw is empty", () => {
        const v = new Value("");
        expect(v.isValid).toBe(false);
    });

    it("static valid with matched option", () => {
        const opt = { label: "Active", value: "active" };
        const v = Value.valid("act", opt);
        expect(v.isValid).toBe(true);
        expect(v.value).toBe("active");
        expect(v.label).toBe("Active");
        expect(v.matchedOption).toBe(opt);
    });

    it("static invalid with error message", () => {
        const v = Value.invalid("bad", "nope");
        expect(v.isValid).toBe(false);
        expect(v.errorMessage).toBe("nope");
        expect(v.raw).toBe("bad");
    });

    it("static empty", () => {
        const v = Value.empty();
        expect(v.isValid).toBe(false);
        expect(v.raw).toBe("");
        expect(v.errorMessage).toBe("Missing value");
    });
});

describe("matchFieldValue", () => {
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
