import { describe, it, expect } from "vitest";
import { ConditionDataProvider } from "../../condition-data-provider";
import { DEFAULT_OPERATORS } from "../../condition-structure";
import type { FieldOption } from "../../types";
import { defaultParser, expectCondition, fields } from "../../__tests__/condition-fixtures";

describe("parser", () => {
    describe("exact operator aliases", () => {
        it("equals", () => expectCondition("age equals 18", "age", "eq", "18"));
        it("eq shorthand", () => expectCondition("age eq 18", "age", "eq", "18"));
        it("= symbol", () => expectCondition("age = 18", "age", "eq", "18"));
        it("is", () => expectCondition("age is 18", "age", "eq", "18"));
        it("greater than", () => expectCondition("age greater than 18", "age", "gt", "18"));
        it("gt shorthand", () => expectCondition("age gt 18", "age", "gt", "18"));
        it("> symbol", () => expectCondition("age > 18", "age", "gt", "18"));
        it("less than", () => expectCondition("age less than 18", "age", "lt", "18"));
        it("lt shorthand", () => expectCondition("age lt 18", "age", "lt", "18"));
        it("gte", () => expectCondition("age gte 18", "age", "gte", "18"));
        it(">= symbol", () => expectCondition("age >= 18", "age", "gte", "18"));
        it("lte", () => expectCondition("age lte 18", "age", "lte", "18"));
        it("<= symbol", () => expectCondition("age <= 18", "age", "lte", "18"));
        it("contains", () => expectCondition("name contains john", "name", "contains", "john"));
        it("includes", () => expectCondition("name includes john", "name", "contains", "john"));
    });

    describe("natural language aliases", () => {
        it("more than -> gt", () => expectCondition("age more than 18", "age", "gt", "18"));
        it("above -> gt", () => expectCondition("age above 18", "age", "gt", "18"));
        it("below -> lt", () => expectCondition("age below 18", "age", "lt", "18"));
        it("at least -> gte", () => expectCondition("age at least 18", "age", "gte", "18"));
        it("at most -> lte", () => expectCondition("age at most 18", "age", "lte", "18"));
    });

    describe("negation operators", () => {
        it("is not -> ne", () => expectCondition("age is not 18", "age", "ne", "18"));
        it("not equals -> ne", () => expectCondition("age not equals 18", "age", "ne", "18"));
        it("!= -> ne", () => expectCondition("age != 18", "age", "ne", "18"));
        it("not greater than -> lte", () =>
            expectCondition("age not greater than 18", "age", "lte", "18"));
        it("not less than -> gte", () =>
            expectCondition("age not less than 18", "age", "gte", "18"));
        it("not above -> lte", () => expectCondition("age not above 18", "age", "lte", "18"));
        it("not below -> gte", () => expectCondition("age not below 18", "age", "gte", "18"));
    });

    describe("linking verb + negation operators", () => {
        it("is not bigger than -> lte", () =>
            expectCondition("status is not bigger than 10", "status", "lte", "10"));
        it("is not greater than -> lte", () =>
            expectCondition("age is not greater than 18", "age", "lte", "18"));
        it("is not less than -> gte", () =>
            expectCondition("age is not less than 5", "age", "gte", "5"));
        it("is not above -> lte", () =>
            expectCondition("score is not above 50", "score", "lte", "50"));
        it("is not below -> gte", () =>
            expectCondition("score is not below 10", "score", "gte", "10"));
        it("is not more than -> lte", () =>
            expectCondition("age is not more than 30", "age", "lte", "30"));
        it("is at least -> gte", () => expectCondition("age is at least 18", "age", "gte", "18"));
        it("is at most -> lte", () => expectCondition("age is at most 65", "age", "lte", "65"));
        it("is greater than -> gt", () =>
            expectCondition("age is greater than 18", "age", "gt", "18"));
        it("is less than -> lt", () => expectCondition("age is less than 5", "age", "lt", "5"));
        it("is above -> gt", () => expectCondition("score is above 90", "score", "gt", "90"));
    });

    describe("fuzzy / typo tolerance", () => {
        it("greter than (typo) -> gt", () => {
            const g = defaultParser.parseComplexCondition("age greter than 18");
            expect(g!.entries[0].condition.operator.value).toBe("gt");
        });
        it("equls (typo) -> eq", () => {
            const g = defaultParser.parseComplexCondition("age equls 18");
            expect(g!.entries[0].condition.operator.value).toBe("eq");
        });
        it("contians (typo) -> contains", () => {
            const g = defaultParser.parseComplexCondition("name contians john");
            expect(g!.entries[0].condition.operator.value).toBe("contains");
        });
    });

    describe("case insensitivity", () => {
        it("uppercase field", () => expectCondition("AGE greater than 18", "age", "gt", "18"));
        it("mixed case operator", () => expectCondition("age Greater Than 18", "age", "gt", "18"));
    });

    describe("fuzzy field matching", () => {
        it("stat -> status", () => expectCondition("stat is active", "status", "eq", "active"));
        it("scor -> score", () => expectCondition("scor gt 50", "score", "gt", "50"));
        it("nam -> name", () => expectCondition("nam contains john", "name", "contains", "john"));
    });

    describe("noise word stripping", () => {
        it("when prefix", () => expectCondition("when age is 18", "age", "eq", "18"));
        it("if prefix", () => expectCondition("if age gt 18", "age", "gt", "18"));
        it("where prefix", () =>
            expectCondition("where status is active", "status", "eq", "active"));
        it("show the prefix", () =>
            expectCondition("show the age greater than 18", "age", "gt", "18"));
        it("multiple noise words", () => expectCondition("if the age is 18", "age", "eq", "18"));
    });

    describe("complex natural language", () => {
        it("multi-word value", () =>
            expectCondition("name contains hello world", "name", "contains", "hello world"));
        it("when + linking verb + negation", () =>
            expectCondition("when status is not active", "status", "ne", "active"));
        it("if + linking verb + comparison", () =>
            expectCondition("if age is greater than 21", "age", "gt", "21"));
        it("numeric field value with spaces", () =>
            expectCondition("score is 100", "score", "eq", "100"));
    });

    describe("parsed Field / Operator / Value instances", () => {
        it("field has correct properties", () => {
            const c = defaultParser.parseComplexCondition("age gt 18")!.entries[0].condition;
            expect(c.field.isValid).toBe(true);
            expect(c.field.label).toBe("Age");
            expect(c.field.value).toBe("age");
            expect(c.field.raw).toBe("age");
        });
        it("operator has correct properties", () => {
            const c = defaultParser.parseComplexCondition("age gt 18")!.entries[0].condition;
            expect(c.operator.isValid).toBe(true);
            expect(c.operator.label).toBe("greater than");
            expect(c.operator.value).toBe("gt");
        });
        it("value has correct properties", () => {
            const c = defaultParser.parseComplexCondition("age gt 18")!.entries[0].condition;
            expect(c.value.raw).toBe("18");
            expect(c.value.value).toBe("18");
            expect(c.value.isValid).toBe(true);
        });
        it("value validates against known values", () => {
            const fieldsWithValues: FieldOption[] = [
                ...fields.filter((f) => f.value !== "status"),
                {
                    label: "Status",
                    value: "status",
                    fieldValues: [{ label: "Active", value: "active" }],
                },
            ];
            const p = new ConditionDataProvider(fieldsWithValues, DEFAULT_OPERATORS);
            const c = p.parseComplexCondition("status is active")!.entries[0].condition;
            expect(c.value.isValid).toBe(true);
            expect(c.value.label).toBe("Active");
        });
        it("value marks unknown against known values", () => {
            const fieldsWithValues: FieldOption[] = [
                ...fields.filter((f) => f.value !== "status"),
                {
                    label: "Status",
                    value: "status",
                    fieldValues: [{ label: "Active", value: "active" }],
                },
            ];
            const p = new ConditionDataProvider(fieldsWithValues, DEFAULT_OPERATORS);
            const c = p.parseComplexCondition("status is bogus")!.entries[0].condition;
            expect(c.value.isValid).toBe(false);
        });
    });

    describe("multi-word fields", () => {
        it("parses two-word field", () => {
            const multiFields: FieldOption[] = [
                { label: "First Name", value: "first_name" },
                { label: "Age", value: "age" },
            ];
            const p = new ConditionDataProvider(multiFields, DEFAULT_OPERATORS);
            const c = p.parseComplexCondition("first name contains john")!.entries[0].condition;
            expect(c.field.value).toBe("first_name");
            expect(c.operator.value).toBe("contains");
            expect(c.value.value).toBe("john");
        });
        it("parses three-word field", () => {
            const multiFields: FieldOption[] = [{ label: "Date Of Birth", value: "dob" }];
            const p = new ConditionDataProvider(multiFields, DEFAULT_OPERATORS);
            const c = p.parseComplexCondition("date of birth is 1990")!.entries[0].condition;
            expect(c.field.value).toBe("dob");
            expect(c.value.value).toBe("1990");
        });
    });

    describe("custom operators", () => {
        it("works with user-defined operators", () => {
            const customOps = [
                {
                    label: "matches regex",
                    value: "regex",
                    aliases: ["matches regex", "regex", "~"],
                },
            ];
            const p = new ConditionDataProvider(fields, customOps);
            const c = p.parseComplexCondition("name matches regex ^foo")!.entries[0].condition;
            expect(c.operator.value).toBe("regex");
            expect(c.value.value).toBe("^foo");
        });
        it("single-alias operator", () => {
            const customOps = [
                { label: "starts with", value: "startsWith", aliases: ["starts with"] },
            ];
            const p = new ConditionDataProvider(fields, customOps);
            const c = p.parseComplexCondition("name starts with J")!.entries[0].condition;
            expect(c.operator.value).toBe("startsWith");
            expect(c.value.value).toBe("j");
        });
    });

    describe("verbose / wordy phrasing", () => {
        it("is equal to -> eq", () => expectCondition("age is equal to 18", "age", "eq", "18"));
        it("is not equal to -> ne", () =>
            expectCondition("age is not equal to 18", "age", "ne", "18"));
        it("is greater than or equal to -> gte", () =>
            expectCondition("age is greater than or equal to 18", "age", "gte", "18"));
        it("is less than or equal to -> lte", () =>
            expectCondition("age is less than or equal to 18", "age", "lte", "18"));
        it("does not equal -> ne", () =>
            expectCondition("status does not equal active", "status", "ne", "active"));
        it("doesn't equal -> ne", () =>
            expectCondition("status doesn't equal active", "status", "ne", "active"));
        it("no less than -> gte", () =>
            expectCondition("score no less than 50", "score", "gte", "50"));
        it("no more than -> lte", () =>
            expectCondition("score no more than 100", "score", "lte", "100"));
    });

    describe("linking verb variations", () => {
        it("is higher than -> gt", () =>
            expectCondition("score is higher than 90", "score", "gt", "90"));
        it("is lower than -> lt", () =>
            expectCondition("score is lower than 10", "score", "lt", "10"));
        it("is fewer than -> lt", () => expectCondition("age is fewer than 5", "age", "lt", "5"));
        it("is smaller than -> lt", () =>
            expectCondition("age is smaller than 10", "age", "lt", "10"));
        it("is not smaller than -> gte", () =>
            expectCondition("score is not smaller than 20", "score", "gte", "20"));
        it("is not under -> gte", () => expectCondition("age is not under 18", "age", "gte", "18"));
    });

    describe("synonym operators", () => {
        it("exceeds -> gt", () => expectCondition("score exceeds 100", "score", "gt", "100"));
        it("under -> lt", () => expectCondition("age under 18", "age", "lt", "18"));
        it("has -> contains", () => expectCondition("name has john", "name", "contains", "john"));
        it("not missing -> contains", () =>
            expectCondition("name not missing data", "name", "contains", "data"));
    });

    describe("multi-word values", () => {
        it("contains phrase", () =>
            expectCondition(
                "name contains hello world foo",
                "name",
                "contains",
                "hello world foo",
            ));
        it("is not with multi-word value", () =>
            expectCondition("status is not very active", "status", "ne", "very active"));
        it("equals multi-word string", () =>
            expectCondition("name equals john doe", "name", "eq", "john doe"));
    });

    describe("combined noise + linking verb", () => {
        it("when + is not equal to", () =>
            expectCondition("when status is not equal to active", "status", "ne", "active"));
        it("if the + is at least", () =>
            expectCondition("if the score is at least 80", "score", "gte", "80"));
        it("where + is not above", () =>
            expectCondition("where age is not above 65", "age", "lte", "65"));
        it("show the + greater than", () =>
            expectCondition("show the score greater than 50", "score", "gt", "50"));
    });

    describe("edge cases", () => {
        it("empty string returns null", () => {
            expect(defaultParser.parseComplexCondition("")).toBeNull();
        });
        it("whitespace only returns null", () => {
            expect(defaultParser.parseComplexCondition("   ")).toBeNull();
        });
        it("unknown field returns null", () => {
            expect(defaultParser.parseComplexCondition("height greater than 180")).toBeNull();
        });
        it("noise words only returns null", () => {
            expect(defaultParser.parseComplexCondition("when if the")).toBeNull();
        });
        it("extra whitespace between words", () =>
            expectCondition("age   greater   than   18", "age", "gt", "18"));
        it("leading and trailing whitespace", () =>
            expectCondition("  age gt 18  ", "age", "gt", "18"));
        it("single character value", () =>
            expectCondition("name contains x", "name", "contains", "x"));
        it("numeric value with decimals", () =>
            expectCondition("score gt 3.14", "score", "gt", "3.14"));
        it("negative number as value", () => expectCondition("score gt -5", "score", "gt", "-5"));
    });
});
