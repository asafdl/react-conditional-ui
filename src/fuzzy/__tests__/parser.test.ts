import { describe, it, expect } from "vitest";
import { ConditionParser } from "../parser";
import type { FieldOption } from "../../types";
import { DEFAULT_OPERATORS } from "../../condition-structure";

const fields: FieldOption[] = [
    { label: "Age", value: "age" },
    { label: "Status", value: "status" },
    { label: "Name", value: "name" },
    { label: "Score", value: "score" },
];

const fieldsWithConfig: FieldOption[] = [
    { label: "Age", value: "age" },
    {
        label: "Status",
        value: "status",
        fieldValues: [
            { label: "Ready", value: "ready" },
            { label: "Not Ready", value: "not_ready" },
            { label: "In Progress", value: "in_progress" },
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

const parser = new ConditionParser(fields, DEFAULT_OPERATORS);

function expectCondition(text: string, field: string, operator: string, value: string) {
    const result = parser.parse(text);
    expect(result).not.toBeNull();
    expect(result!.field.value).toBe(field);
    expect(result!.operator.value).toBe(operator);
    expect(result!.value.value).toBe(value);
}

describe("ConditionParser", () => {
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
        it("is at least -> gte", () =>
            expectCondition("age is at least 18", "age", "gte", "18"));
        it("is at most -> lte", () =>
            expectCondition("age is at most 65", "age", "lte", "65"));
        it("is greater than -> gt", () =>
            expectCondition("age is greater than 18", "age", "gt", "18"));
        it("is less than -> lt", () =>
            expectCondition("age is less than 5", "age", "lt", "5"));
        it("is above -> gt", () =>
            expectCondition("score is above 90", "score", "gt", "90"));
    });

    describe("fuzzy / typo tolerance", () => {
        it("greter than (typo) -> gt", () => {
            expect(parser.parse("age greter than 18")?.operator.value).toBe("gt");
        });

        it("equls (typo) -> eq", () => {
            expect(parser.parse("age equls 18")?.operator.value).toBe("eq");
        });

        it("contians (typo) -> contains", () => {
            expect(parser.parse("name contians john")?.operator.value).toBe("contains");
        });
    });

    describe("case insensitivity", () => {
        it("uppercase field", () => expectCondition("AGE greater than 18", "age", "gt", "18"));
        it("mixed case operator", () =>
            expectCondition("age Greater Than 18", "age", "gt", "18"));
    });

    describe("fuzzy field matching", () => {
        it("stat -> status", () => expectCondition("stat is active", "status", "eq", "active"));
        it("scor -> score", () => expectCondition("scor gt 50", "score", "gt", "50"));
        it("nam -> name", () => expectCondition("nam contains john", "name", "contains", "john"));
    });

    describe("noise word stripping", () => {
        it("when prefix", () => expectCondition("when age is 18", "age", "eq", "18"));
        it("if prefix", () => expectCondition("if age gt 18", "age", "gt", "18"));
        it("where prefix", () => expectCondition("where status is active", "status", "eq", "active"));
        it("show the prefix", () => expectCondition("show the age greater than 18", "age", "gt", "18"));
        it("multiple noise words", () =>
            expectCondition("if the age is 18", "age", "eq", "18"));
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

    describe("class instances", () => {
        it("field has correct properties", () => {
            const result = parser.parse("age gt 18")!;
            expect(result.field.isValid).toBe(true);
            expect(result.field.label).toBe("Age");
            expect(result.field.value).toBe("age");
            expect(result.field.raw).toBe("age");
        });

        it("operator has correct properties", () => {
            const result = parser.parse("age gt 18")!;
            expect(result.operator.isValid).toBe(true);
            expect(result.operator.label).toBe("greater than");
            expect(result.operator.value).toBe("gt");
        });

        it("value has correct properties", () => {
            const result = parser.parse("age gt 18")!;
            expect(result.value.raw).toBe("18");
            expect(result.value.value).toBe("18");
            expect(result.value.isValid).toBe(true);
        });

        it("value validates against known values", () => {
            const knownValues = {
                status: [{ label: "Active", value: "active" }],
            };
            const p = new ConditionParser(fields, DEFAULT_OPERATORS, knownValues);
            const result = p.parse("status is active")!;
            expect(result.value.isValid).toBe(true);
            expect(result.value.label).toBe("Active");
        });

        it("value marks unknown against known values", () => {
            const knownValues = {
                status: [{ label: "Active", value: "active" }],
            };
            const p = new ConditionParser(fields, DEFAULT_OPERATORS, knownValues);
            const result = p.parse("status is bogus")!;
            expect(result.value.isValid).toBe(false);
        });
    });

    describe("multi-word fields", () => {
        it("parses two-word field", () => {
            const multiFields: FieldOption[] = [
                { label: "First Name", value: "first_name" },
                { label: "Age", value: "age" },
            ];
            const p = new ConditionParser(multiFields, DEFAULT_OPERATORS);
            const result = p.parse("first name contains john")!;
            expect(result.field.value).toBe("first_name");
            expect(result.operator.value).toBe("contains");
            expect(result.value.value).toBe("john");
        });

        it("parses three-word field", () => {
            const multiFields: FieldOption[] = [
                { label: "Date Of Birth", value: "dob" },
            ];
            const p = new ConditionParser(multiFields, DEFAULT_OPERATORS);
            const result = p.parse("date of birth is 1990")!;
            expect(result.field.value).toBe("dob");
            expect(result.value.value).toBe("1990");
        });
    });

    describe("custom operators", () => {
        it("works with user-defined operators", () => {
            const customOps = [
                { label: "matches regex", value: "regex", aliases: ["matches regex", "regex", "~"] },
            ];
            const p = new ConditionParser(fields, customOps);
            const result = p.parse("name matches regex ^foo")!;
            expect(result.operator.value).toBe("regex");
            expect(result.value.value).toBe("^foo");
        });

        it("single-alias operator", () => {
            const customOps = [
                { label: "starts with", value: "startsWith", aliases: ["starts with"] },
            ];
            const p = new ConditionParser(fields, customOps);
            const result = p.parse("name starts with J")!;
            expect(result.operator.value).toBe("startsWith");
            expect(result.value.value).toBe("j");
        });
    });

    describe("verbose / wordy phrasing", () => {
        it("is equal to -> eq", () =>
            expectCondition("age is equal to 18", "age", "eq", "18"));
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
        it("is fewer than -> lt", () =>
            expectCondition("age is fewer than 5", "age", "lt", "5"));
        it("is smaller than -> lt", () =>
            expectCondition("age is smaller than 10", "age", "lt", "10"));
        it("is not smaller than -> gte", () =>
            expectCondition("score is not smaller than 20", "score", "gte", "20"));
        it("is not under -> gte", () =>
            expectCondition("age is not under 18", "age", "gte", "18"));
    });

    describe("synonym operators", () => {
        it("exceeds -> gt", () =>
            expectCondition("score exceeds 100", "score", "gt", "100"));
        it("under -> lt", () =>
            expectCondition("age under 18", "age", "lt", "18"));
        it("has -> contains", () =>
            expectCondition("name has john", "name", "contains", "john"));
        it("not missing -> contains", () =>
            expectCondition("name not missing data", "name", "contains", "data"));
    });

    describe("multi-word values", () => {
        it("contains phrase", () =>
            expectCondition("name contains hello world foo", "name", "contains", "hello world foo"));
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
            expect(parser.parse("")).toBeNull();
        });

        it("whitespace only returns null", () => {
            expect(parser.parse("   ")).toBeNull();
        });

        it("unknown field returns null", () => {
            expect(parser.parse("height greater than 180")).toBeNull();
        });

        it("noise words only returns null", () => {
            expect(parser.parse("when if the")).toBeNull();
        });

        it("field only returns partial result", () => {
            const result = parser.parse("age")!;
            expect(result.field.value).toBe("age");
            expect(result.operator.isValid).toBe(false);
            expect(result.value.raw).toBe("");
        });

        it("extra whitespace between words", () =>
            expectCondition("age   greater   than   18", "age", "gt", "18"));

        it("leading and trailing whitespace", () =>
            expectCondition("  age gt 18  ", "age", "gt", "18"));

        it("single character value", () =>
            expectCondition("name contains x", "name", "contains", "x"));

        it("numeric value with decimals", () =>
            expectCondition("score gt 3.14", "score", "gt", "3.14"));

        it("negative number as value", () =>
            expectCondition("score gt -5", "score", "gt", "-5"));
    });

    describe("compound parsing (parseCompound)", () => {
        function expectGroup(
            text: string,
            connector: "and" | "or",
            expected: { field: string; operator: string; value: string }[],
        ) {
            const group = parser.parseCompound(text);
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

        it("OR with inherited field+op: status is green or blue", () => {
            expectGroup("status is green or blue", "or", [
                { field: "status", operator: "eq", value: "green" },
                { field: "status", operator: "eq", value: "blue" },
            ]);
        });

        it("AND with two independent conditions", () => {
            expectGroup("age gt 18 and status is active", "and", [
                { field: "age", operator: "gt", value: "18" },
                { field: "status", operator: "eq", value: "active" },
            ]);
        });

        it("OR with three segments, inherited field+op", () => {
            expectGroup("name contains foo or bar or baz", "or", [
                { field: "name", operator: "contains", value: "foo" },
                { field: "name", operator: "contains", value: "bar" },
                { field: "name", operator: "contains", value: "baz" },
            ]);
        });

        it("AND with negation in first segment", () => {
            expectGroup("status is not active and age gt 18", "and", [
                { field: "status", operator: "ne", value: "active" },
                { field: "age", operator: "gt", value: "18" },
            ]);
        });

        it("single condition returns group with one entry", () => {
            const group = parser.parseCompound("age gt 18");
            expect(group).not.toBeNull();
            expect(group!.entries).toHaveLength(1);
            expect(group!.entries[0].connector).toBe("and");
            expect(group!.entries[0].condition.field.value).toBe("age");
        });

        it("OR with inherited field only: age gt 18 or lt 5", () => {
            expectGroup("age gt 18 or lt 5", "or", [
                { field: "age", operator: "gt", value: "18" },
                { field: "age", operator: "lt", value: "5" },
            ]);
        });

        it("empty string returns null", () => {
            expect(parser.parseCompound("")).toBeNull();
        });

        it("whitespace only returns null", () => {
            expect(parser.parseCompound("   ")).toBeNull();
        });

        it("case-insensitive conjunction: age gt 18 AND status is active", () => {
            expectGroup("age gt 18 AND status is active", "and", [
                { field: "age", operator: "gt", value: "18" },
                { field: "status", operator: "eq", value: "active" },
            ]);
        });

        it("OR with noise words: when status is green or blue", () => {
            expectGroup("when status is green or blue", "or", [
                { field: "status", operator: "eq", value: "green" },
                { field: "status", operator: "eq", value: "blue" },
            ]);
        });

        it("OR with repeated linking verb: status is green or is blue", () => {
            expectGroup("status is green or is blue", "or", [
                { field: "status", operator: "eq", value: "green" },
                { field: "status", operator: "eq", value: "blue" },
            ]);
        });

        it("AND with same field different operators", () => {
            expectGroup("age gt 10 and age lt 20", "and", [
                { field: "age", operator: "gt", value: "10" },
                { field: "age", operator: "lt", value: "20" },
            ]);
        });

        it("OR with inherited field, different operators: age gt 18 or lte 5", () => {
            expectGroup("age gt 18 or lte 5", "or", [
                { field: "age", operator: "gt", value: "18" },
                { field: "age", operator: "lte", value: "5" },
            ]);
        });

        it("OR with negation operators: status is not active or not pending", () => {
            expectGroup("status is not active or not pending", "or", [
                { field: "status", operator: "ne", value: "active" },
                { field: "status", operator: "ne", value: "pending" },
            ]);
        });

        it("AND with verbose operators: age is greater than 18 and score is at least 50", () => {
            expectGroup("age is greater than 18 and score is at least 50", "and", [
                { field: "age", operator: "gt", value: "18" },
                { field: "score", operator: "gte", value: "50" },
            ]);
        });

        it("OR with four segments", () => {
            expectGroup("status is a or b or c or d", "or", [
                { field: "status", operator: "eq", value: "a" },
                { field: "status", operator: "eq", value: "b" },
                { field: "status", operator: "eq", value: "c" },
                { field: "status", operator: "eq", value: "d" },
            ]);
        });

        it("compound with noise prefix: if age gt 18 or lt 5", () => {
            expectGroup("if age gt 18 or lt 5", "or", [
                { field: "age", operator: "gt", value: "18" },
                { field: "age", operator: "lt", value: "5" },
            ]);
        });

        it("AND with contains operator: name contains foo and name contains bar", () => {
            expectGroup("name contains foo and name contains bar", "and", [
                { field: "name", operator: "contains", value: "foo" },
                { field: "name", operator: "contains", value: "bar" },
            ]);
        });

        it("OR with symbol operators: age > 18 or < 5", () => {
            expectGroup("age > 18 or < 5", "or", [
                { field: "age", operator: "gt", value: "18" },
                { field: "age", operator: "lt", value: "5" },
            ]);
        });

        it("'or equal' inside operator alias does not split: age greater than or equal to 18", () => {
            const group = parser.parseCompound("age greater than or equal to 18");
            expect(group).not.toBeNull();
            expect(group!.entries[0].condition.field.value).toBe("age");
            expect(group!.entries[0].condition.value.value).toBe("18");
        });

        it("unknown second segment inherits field+op from first", () => {
            const group = parser.parseCompound("age gt 18 and xyzzy bloop 42");
            expect(group).not.toBeNull();
            expect(group!.entries).toHaveLength(2);
            expect(group!.entries[0].condition.field.value).toBe("age");
            expect(group!.entries[0].condition.value.value).toBe("18");
            expect(group!.entries[1].condition.field.value).toBe("age");
            expect(group!.entries[1].condition.value.value).toBe("xyzzy bloop 42");
        });

        it("mixed case: Age GT 18 Or LT 5", () => {
            expectGroup("Age GT 18 Or LT 5", "or", [
                { field: "age", operator: "gt", value: "18" },
                { field: "age", operator: "lt", value: "5" },
            ]);
        });

        it("group and entries have unique IDs", () => {
            const group = parser.parseCompound("status is green or blue")!;
            expect(group.id).toBeTruthy();
            expect(group.entries[0].id).toBeTruthy();
            expect(group.entries[1].id).toBeTruthy();
            expect(group.entries[0].id).not.toBe(group.entries[1].id);
            expect(group.id).not.toBe(group.entries[0].id);
        });
    });
});

describe("ConditionParser with fieldValues", () => {
    const p = new ConditionParser(fieldsWithConfig, DEFAULT_OPERATORS);

    it("fuzzy matches a value from field.fieldValues", () => {
        const result = p.parse("status is read")!;
        expect(result.value.isValid).toBe(true);
        expect(result.value.value).toBe("ready");
        expect(result.value.label).toBe("Ready");
    });

    it("exact matches a value from field.fieldValues", () => {
        const result = p.parse("status is ready")!;
        expect(result.value.isValid).toBe(true);
        expect(result.value.value).toBe("ready");
    });

    it("fuzzy matches value with 'in progress' fieldValue", () => {
        const result = p.parse("status is in prog")!;
        expect(result.value.isValid).toBe(true);
        expect(result.value.value).toBe("in_progress");
    });

    it("freeform value on field without fieldValues", () => {
        const result = p.parse("age gt 42")!;
        expect(result.value.isValid).toBe(true);
        expect(result.value.value).toBe("42");
    });
});

describe("ConditionParser with per-field operators", () => {
    const p = new ConditionParser(fieldsWithConfig, DEFAULT_OPERATORS);

    it("matches restricted operator for field with custom operators", () => {
        const result = p.parse("priority is high")!;
        expect(result.field.value).toBe("priority");
        expect(result.operator.value).toBe("eq");
        expect(result.value.value).toBe("high");
    });

    it("returns null when operator is not in field.operators", () => {
        const result = p.parse("priority greater than high");
        expect(result).toBeNull();
    });

    it("falls back to global operators for fields without field.operators", () => {
        const result = p.parse("status greater than ready")!;
        expect(result.field.value).toBe("status");
        expect(result.operator.value).toBe("gt");
    });

    it("fuzzy matches values on field with restricted operators", () => {
        const result = p.parse("priority is hig")!;
        expect(result.value.isValid).toBe(true);
        expect(result.value.value).toBe("high");
    });
});

describe("ConditionParser.getSuggestion", () => {
    const p = new ConditionParser(fieldsWithConfig, DEFAULT_OPERATORS);

    describe("field suggestions", () => {
        it("suggests field from prefix", () => {
            const s = p.getSuggestion("sta");
            expect(s).not.toBeNull();
            expect(s!.display).toBe("Status");
            expect(s!.completion).toBe("tus");
        });

        it("suggests field from single char", () => {
            const s = p.getSuggestion("a");
            expect(s).not.toBeNull();
            expect(s!.display).toBe("Age");
            expect(s!.completion).toBe("ge");
        });

        it("returns null for empty input", () => {
            expect(p.getSuggestion("")).toBeNull();
        });

        it("returns null when field is fully typed", () => {
            const s = p.getSuggestion("status");
            expect(s).toBeNull();
        });
    });

    describe("operator suggestions", () => {
        it("suggests operator from partial alias", () => {
            const s = p.getSuggestion("status equa");
            expect(s).not.toBeNull();
            expect(s!.display).toBe("equals");
            expect(s!.completion).toBe("ls");
        });

        it("suggests 'greater than' from prefix", () => {
            const s = p.getSuggestion("age gre");
            expect(s).not.toBeNull();
            expect(s!.display).toBe("greater than");
            expect(s!.completion).toBe("ater than");
        });

        it("suggests from field-specific operators", () => {
            const s = p.getSuggestion("priority eq");
            expect(s).not.toBeNull();
            expect(s!.display).toBe("equals");
        });
    });

    describe("value suggestions", () => {
        it("suggests value after field + operator + space", () => {
            const s = p.getSuggestion("status is re");
            expect(s).not.toBeNull();
            expect(s!.display).toBe("Ready");
            expect(s!.completion).toBe("ady");
        });

        it("does not suggest value before user starts typing it", () => {
            const s = p.getSuggestion("status is ");
            expect(s).toBeNull();
        });

        it("returns null for field without fieldValues", () => {
            const s = p.getSuggestion("age is ");
            expect(s).toBeNull();
        });

        it("suggests value for field with fieldValues", () => {
            const s = p.getSuggestion("priority is hi");
            expect(s).not.toBeNull();
            expect(s!.display).toBe("High");
            expect(s!.completion).toBe("gh");
        });
    });
});
