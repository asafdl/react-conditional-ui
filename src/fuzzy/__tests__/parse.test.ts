import { describe, it, expect } from "vitest";
import { parseCondition } from "../parse";
import type { FieldOption } from "../../types";
import { DEFAULT_OPERATORS } from "../../operators";

const fields: FieldOption[] = [
    { label: "Age", value: "age" },
    { label: "Status", value: "status" },
    { label: "Name", value: "name" },
    { label: "Score", value: "score" },
];

const parse = (text: string) => parseCondition(text, fields, DEFAULT_OPERATORS);

describe("parseCondition", () => {
    describe("exact operator aliases", () => {
        it("equals", () => {
            expect(parse("age equals 18")).toEqual({ field: "age", operator: "eq", value: "18" });
        });

        it("eq shorthand", () => {
            expect(parse("age eq 18")).toEqual({ field: "age", operator: "eq", value: "18" });
        });

        it("= symbol", () => {
            expect(parse("age = 18")).toEqual({ field: "age", operator: "eq", value: "18" });
        });

        it("is", () => {
            expect(parse("age is 18")).toEqual({ field: "age", operator: "eq", value: "18" });
        });

        it("greater than", () => {
            expect(parse("age greater than 18")).toEqual({
                field: "age",
                operator: "gt",
                value: "18",
            });
        });

        it("gt shorthand", () => {
            expect(parse("age gt 18")).toEqual({ field: "age", operator: "gt", value: "18" });
        });

        it("> symbol", () => {
            expect(parse("age > 18")).toEqual({ field: "age", operator: "gt", value: "18" });
        });

        it("less than", () => {
            expect(parse("age less than 18")).toEqual({
                field: "age",
                operator: "lt",
                value: "18",
            });
        });

        it("lt shorthand", () => {
            expect(parse("age lt 18")).toEqual({ field: "age", operator: "lt", value: "18" });
        });

        it("gte", () => {
            expect(parse("age gte 18")).toEqual({ field: "age", operator: "gte", value: "18" });
        });

        it(">= symbol", () => {
            expect(parse("age >= 18")).toEqual({ field: "age", operator: "gte", value: "18" });
        });

        it("lte", () => {
            expect(parse("age lte 18")).toEqual({ field: "age", operator: "lte", value: "18" });
        });

        it("<= symbol", () => {
            expect(parse("age <= 18")).toEqual({ field: "age", operator: "lte", value: "18" });
        });

        it("contains", () => {
            expect(parse("name contains john")).toEqual({
                field: "name",
                operator: "contains",
                value: "john",
            });
        });

        it("includes", () => {
            expect(parse("name includes john")).toEqual({
                field: "name",
                operator: "contains",
                value: "john",
            });
        });
    });

    describe("natural language aliases", () => {
        it("more than -> gt", () => {
            expect(parse("age more than 18")).toEqual({
                field: "age",
                operator: "gt",
                value: "18",
            });
        });

        it("above -> gt", () => {
            expect(parse("age above 18")).toEqual({ field: "age", operator: "gt", value: "18" });
        });

        it("below -> lt", () => {
            expect(parse("age below 18")).toEqual({ field: "age", operator: "lt", value: "18" });
        });

        it("at least -> gte", () => {
            expect(parse("age at least 18")).toEqual({
                field: "age",
                operator: "gte",
                value: "18",
            });
        });

        it("at most -> lte", () => {
            expect(parse("age at most 18")).toEqual({
                field: "age",
                operator: "lte",
                value: "18",
            });
        });
    });

    describe("negation operators", () => {
        it("is not -> ne", () => {
            expect(parse("age is not 18")).toEqual({ field: "age", operator: "ne", value: "18" });
        });

        it("not equals -> ne", () => {
            expect(parse("age not equals 18")).toEqual({
                field: "age",
                operator: "ne",
                value: "18",
            });
        });

        it("!= -> ne", () => {
            expect(parse("age != 18")).toEqual({ field: "age", operator: "ne", value: "18" });
        });

        it("not greater than -> lte", () => {
            expect(parse("age not greater than 18")).toEqual({
                field: "age",
                operator: "lte",
                value: "18",
            });
        });

        it("not less than -> gte", () => {
            expect(parse("age not less than 18")).toEqual({
                field: "age",
                operator: "gte",
                value: "18",
            });
        });

        it("not above -> lte", () => {
            expect(parse("age not above 18")).toEqual({
                field: "age",
                operator: "lte",
                value: "18",
            });
        });

        it("not below -> gte", () => {
            expect(parse("age not below 18")).toEqual({
                field: "age",
                operator: "gte",
                value: "18",
            });
        });
    });

    describe("fuzzy / typo tolerance", () => {
        it("greter than (typo) -> gt", () => {
            expect(parse("age greter than 18")?.operator).toBe("gt");
        });

        it("equls (typo) -> eq", () => {
            expect(parse("age equls 18")?.operator).toBe("eq");
        });

        it("contians (typo) -> contains", () => {
            expect(parse("name contians john")?.operator).toBe("contains");
        });
    });

    describe("case insensitivity", () => {
        it("uppercase field", () => {
            expect(parse("AGE greater than 18")).toEqual({
                field: "age",
                operator: "gt",
                value: "18",
            });
        });

        it("mixed case operator", () => {
            expect(parse("age Greater Than 18")).toEqual({
                field: "age",
                operator: "gt",
                value: "18",
            });
        });
    });

    describe("edge cases", () => {
        it("empty string returns null", () => {
            expect(parse("")).toBeNull();
        });

        it("whitespace only returns null", () => {
            expect(parse("   ")).toBeNull();
        });

        it("unknown field returns null", () => {
            expect(parse("height greater than 180")).toBeNull();
        });

        it("field only returns partial result", () => {
            expect(parse("age")).toEqual({ field: "age", operator: "", value: "" });
        });

        it("field + unrecognized text returns empty operator", () => {
            expect(parse("age xyzzy 18")).toEqual({ field: "age", operator: "", value: "" });
        });
    });
});
