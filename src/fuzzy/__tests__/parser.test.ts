import { describe, it, expect } from "vitest";
import { ConditionParser } from "../../condition-parser";
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

const parser = new ConditionParser(fields, DEFAULT_OPERATORS);

function expectCondition(text: string, field: string, operator: string, value: string) {
    const group = parser.parseCompound(text);
    expect(group).not.toBeNull();
    expect(group!.entries).toHaveLength(1);
    const c = group!.entries[0].condition;
    expect(c.field.value).toBe(field);
    expect(c.operator.value).toBe(operator);
    expect(c.value.value).toBe(value);
}

function expectGroup(
    text: string,
    connector: "and" | "or",
    expected: { field: string; operator: string; value: string }[],
    p = parser,
) {
    const group = p.parseCompound(text);
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
        it("is at least -> gte", () => expectCondition("age is at least 18", "age", "gte", "18"));
        it("is at most -> lte", () => expectCondition("age is at most 65", "age", "lte", "65"));
        it("is greater than -> gt", () =>
            expectCondition("age is greater than 18", "age", "gt", "18"));
        it("is less than -> lt", () => expectCondition("age is less than 5", "age", "lt", "5"));
        it("is above -> gt", () => expectCondition("score is above 90", "score", "gt", "90"));
    });

    describe("fuzzy / typo tolerance", () => {
        it("greter than (typo) -> gt", () => {
            const g = parser.parseCompound("age greter than 18");
            expect(g!.entries[0].condition.operator.value).toBe("gt");
        });
        it("equls (typo) -> eq", () => {
            const g = parser.parseCompound("age equls 18");
            expect(g!.entries[0].condition.operator.value).toBe("eq");
        });
        it("contians (typo) -> contains", () => {
            const g = parser.parseCompound("name contians john");
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

    describe("class instances", () => {
        it("field has correct properties", () => {
            const c = parser.parseCompound("age gt 18")!.entries[0].condition;
            expect(c.field.isValid).toBe(true);
            expect(c.field.label).toBe("Age");
            expect(c.field.value).toBe("age");
            expect(c.field.raw).toBe("age");
        });
        it("operator has correct properties", () => {
            const c = parser.parseCompound("age gt 18")!.entries[0].condition;
            expect(c.operator.isValid).toBe(true);
            expect(c.operator.label).toBe("greater than");
            expect(c.operator.value).toBe("gt");
        });
        it("value has correct properties", () => {
            const c = parser.parseCompound("age gt 18")!.entries[0].condition;
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
            const p = new ConditionParser(fieldsWithValues, DEFAULT_OPERATORS);
            const c = p.parseCompound("status is active")!.entries[0].condition;
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
            const p = new ConditionParser(fieldsWithValues, DEFAULT_OPERATORS);
            const c = p.parseCompound("status is bogus")!.entries[0].condition;
            expect(c.value.isValid).toBe(false);
        });
    });

    describe("multi-word fields", () => {
        it("parses two-word field", () => {
            const multiFields: FieldOption[] = [
                { label: "First Name", value: "first_name" },
                { label: "Age", value: "age" },
            ];
            const p = new ConditionParser(multiFields, DEFAULT_OPERATORS);
            const c = p.parseCompound("first name contains john")!.entries[0].condition;
            expect(c.field.value).toBe("first_name");
            expect(c.operator.value).toBe("contains");
            expect(c.value.value).toBe("john");
        });
        it("parses three-word field", () => {
            const multiFields: FieldOption[] = [{ label: "Date Of Birth", value: "dob" }];
            const p = new ConditionParser(multiFields, DEFAULT_OPERATORS);
            const c = p.parseCompound("date of birth is 1990")!.entries[0].condition;
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
            const p = new ConditionParser(fields, customOps);
            const c = p.parseCompound("name matches regex ^foo")!.entries[0].condition;
            expect(c.operator.value).toBe("regex");
            expect(c.value.value).toBe("^foo");
        });
        it("single-alias operator", () => {
            const customOps = [
                { label: "starts with", value: "startsWith", aliases: ["starts with"] },
            ];
            const p = new ConditionParser(fields, customOps);
            const c = p.parseCompound("name starts with J")!.entries[0].condition;
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
            expect(parser.parseCompound("")).toBeNull();
        });
        it("whitespace only returns null", () => {
            expect(parser.parseCompound("   ")).toBeNull();
        });
        it("unknown field returns null", () => {
            expect(parser.parseCompound("height greater than 180")).toBeNull();
        });
        it("noise words only returns null", () => {
            expect(parser.parseCompound("when if the")).toBeNull();
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

    describe("compound conditions", () => {
        it("OR with inherited field+op", () => {
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
        it("OR with inherited field only: age gt 18 or lt 5", () => {
            expectGroup("age gt 18 or lt 5", "or", [
                { field: "age", operator: "gt", value: "18" },
                { field: "age", operator: "lt", value: "5" },
            ]);
        });
        it("case-insensitive conjunction", () => {
            expectGroup("age gt 18 AND status is active", "and", [
                { field: "age", operator: "gt", value: "18" },
                { field: "status", operator: "eq", value: "active" },
            ]);
        });
        it("OR with noise words", () => {
            expectGroup("when status is green or blue", "or", [
                { field: "status", operator: "eq", value: "green" },
                { field: "status", operator: "eq", value: "blue" },
            ]);
        });
        it("OR with repeated linking verb", () => {
            expectGroup("status is green or is blue", "or", [
                { field: "status", operator: "eq", value: "green" },
                { field: "status", operator: "eq", value: "blue" },
            ]);
        });
        it("AND with verbose operators", () => {
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
        it("OR with symbol operators: age > 18 or < 5", () => {
            expectGroup("age > 18 or < 5", "or", [
                { field: "age", operator: "gt", value: "18" },
                { field: "age", operator: "lt", value: "5" },
            ]);
        });
        it("'or equal' inside operator alias does not split", () => {
            const group = parser.parseCompound("age greater than or equal to 18");
            expect(group).not.toBeNull();
            expect(group!.entries[0].condition.field.value).toBe("age");
            expect(group!.entries[0].condition.value.value).toBe("18");
        });
        it("unknown second segment inherits field+op from first", () => {
            const group = parser.parseCompound("age gt 18 and xyzzy bloop 42");
            expect(group).not.toBeNull();
            expect(group!.entries).toHaveLength(2);
            expect(group!.entries[1].condition.field.value).toBe("age");
            expect(group!.entries[1].condition.value.value).toBe("xyzzy bloop 42");
        });
        it("group and entries have unique IDs", () => {
            const group = parser.parseCompound("status is green or blue")!;
            expect(group.id).toBeTruthy();
            expect(group.entries[0].id).not.toBe(group.entries[1].id);
            expect(group.id).not.toBe(group.entries[0].id);
        });
    });
});

describe("ConditionParser with fieldValues", () => {
    const p = new ConditionParser(fieldsWithConfig, DEFAULT_OPERATORS);

    it("fuzzy matches a value from field.fieldValues", () => {
        const c = p.parseCompound("status is read")!.entries[0].condition;
        expect(c.value.isValid).toBe(true);
        expect(c.value.value).toBe("ready");
        expect(c.value.label).toBe("Ready");
    });
    it("exact matches a value from field.fieldValues", () => {
        const c = p.parseCompound("status is ready")!.entries[0].condition;
        expect(c.value.isValid).toBe(true);
        expect(c.value.value).toBe("ready");
    });
    it("fuzzy matches value with 'progressing' fieldValue", () => {
        const c = p.parseCompound("status is prog")!.entries[0].condition;
        expect(c.value.isValid).toBe(true);
        expect(c.value.value).toBe("progressing");
    });
    it("freeform value on field without fieldValues", () => {
        const c = p.parseCompound("age gt 42")!.entries[0].condition;
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
});

describe("ConditionParser with per-field operators", () => {
    const p = new ConditionParser(fieldsWithConfig, DEFAULT_OPERATORS);

    it("matches restricted operator for field with custom operators", () => {
        const c = p.parseCompound("priority is high")!.entries[0].condition;
        expect(c.field.value).toBe("priority");
        expect(c.operator.value).toBe("eq");
        expect(c.value.value).toBe("high");
    });
    it("returns invalid operator when operator is not in field.operators", () => {
        const g = p.parseCompound("priority greater than high");
        expect(g).not.toBeNull();
        expect(g!.entries[0].condition.field.value).toBe("priority");
        expect(g!.entries[0].condition.operator.isValid).toBe(false);
    });
    it("falls back to global operators for fields without field.operators", () => {
        const c = p.parseCompound("status greater than ready")!.entries[0].condition;
        expect(c.field.value).toBe("status");
        expect(c.operator.value).toBe("gt");
    });
    it("fuzzy matches values on field with restricted operators", () => {
        const c = p.parseCompound("priority is hig")!.entries[0].condition;
        expect(c.value.isValid).toBe(true);
        expect(c.value.value).toBe("high");
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
            expect(p.getSuggestion("status")).toBeNull();
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
        it("suggests value after field + operator + partial", () => {
            const s = p.getSuggestion("status is re");
            expect(s).not.toBeNull();
            expect(s!.display).toBe("Ready");
            expect(s!.completion).toBe("ady");
        });
        it("does not ghost-suggest when no partial typed", () => {
            expect(p.getSuggestion("status is ")).toBeNull();
            expect(p.getSuggestion("status ")).toBeNull();
            expect(p.getSuggestion("age ")).toBeNull();
        });
        it("returns null for field without fieldValues", () => {
            expect(p.getSuggestion("age is ")).toBeNull();
        });
        it("suggests value for field with fieldValues", () => {
            const s = p.getSuggestion("priority is hi");
            expect(s).not.toBeNull();
            expect(s!.display).toBe("High");
            expect(s!.completion).toBe("gh");
        });
    });

    describe("suggestions after fuzzy-matched field/operator", () => {
        it("suggests operator after fuzzy-matched field", () => {
            const s = p.getSuggestion("stauts equa");
            expect(s).not.toBeNull();
            expect(s!.display).toBe("equals");
            expect(s!.completion).toBe("ls");
        });
        it("suggests value after fuzzy-matched operator", () => {
            const s = p.getSuggestion("status equls read");
            expect(s).not.toBeNull();
            expect(s!.display).toBe("Ready");
            expect(s!.completion).toBe("y");
        });
        it("suggests value after fuzzy-matched field", () => {
            const s = p.getSuggestion("stauts is re");
            expect(s).not.toBeNull();
            expect(s!.display).toBe("Ready");
            expect(s!.completion).toBe("ady");
        });
    });

    describe("compound conditions (after and/or)", () => {
        it("suggests field after 'and '", () => {
            expect(p.getSuggestion("age gt 3 and sta")!.display).toBe("Status");
        });
        it("suggests field after 'or '", () => {
            expect(p.getSuggestion("status eq ready or a")!.display).toBe("Age");
        });
        it("suggests operator in second condition", () => {
            expect(p.getSuggestion("age gt 3 and status equa")!.display).toBe("equals");
        });
        it("suggests value in second condition", () => {
            expect(p.getSuggestion("age gt 3 and status is re")!.display).toBe("Ready");
        });
        it("returns null right after conjunction", () => {
            expect(p.getSuggestion("age gt 3 and")).toBeNull();
        });
        it("does not split on 'or' inside operator alias", () => {
            expect(p.getSuggestion("age greater than or equal to 5 and sta")!.display).toBe(
                "Status",
            );
        });
        it("inherits field+operator and suggests value after 'or'", () => {
            expect(p.getSuggestion("status is ready or pro")!.display).toBe("Progressing");
        });
        it("inherits field+operator and suggests value after 'and'", () => {
            expect(p.getSuggestion("priority is high and lo")!.display).toBe("Low");
        });
    });
});

describe("ConditionParser.getCompletions", () => {
    const p = new ConditionParser(fieldsWithConfig, DEFAULT_OPERATORS);

    it("returns field labels on empty input", () => {
        const items = p.getCompletions("");
        expect(items.length).toBeGreaterThan(0);
        expect(items.map((i) => i.display)).toContain("Age");
        expect(items.map((i) => i.display)).toContain("Status");
    });
    it("returns operator labels after field + space", () => {
        const items = p.getCompletions("age ");
        expect(items.length).toBeGreaterThan(0);
        expect(items.map((i) => i.display)).toContain("equals");
    });
    it("returns type-appropriate operators for enum field", () => {
        const typedFields: FieldOption[] = [
            { label: "Status", value: "status", type: "enum" as const },
        ];
        const tp = new ConditionParser(typedFields, DEFAULT_OPERATORS);
        const items = tp.getCompletions("status ");
        expect(items.length).toBeGreaterThan(0);
        expect(items.every((i) => !i.display.match(/greater|less/i))).toBe(true);
    });
    it("returns value labels after field + operator + space", () => {
        const items = p.getCompletions("status is ");
        expect(items.length).toBeGreaterThan(0);
        expect(items.map((i) => i.display)).toContain("Ready");
    });
    it("returns empty for value position on field without fieldValues", () => {
        const items = p.getCompletions("age is ");
        expect(items).toHaveLength(0);
    });
});

describe("ConditionParser.diagnose", () => {
    const p = new ConditionParser(fieldsWithConfig, DEFAULT_OPERATORS);

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
});

describe("ConditionParser with field types", () => {
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

    const tp = new ConditionParser(typedFields, DEFAULT_OPERATORS);

    it("parses numeric field with valid number", () => {
        const c = tp.parseCompound("age gt 25")!.entries[0].condition;
        expect(c.value.isValid).toBe(true);
    });
    it("marks non-numeric value as invalid", () => {
        const c = tp.parseCompound("age gt hello")!.entries[0].condition;
        expect(c.value.isValid).toBe(false);
        expect(c.value.errorMessage).toBe("Expected a number");
    });
    it("parses enum field with valid value", () => {
        const c = tp.parseCompound("status is ready")!.entries[0].condition;
        expect(c.value.isValid).toBe(true);
    });
    it("parses 'is not' as ne on enum field", () => {
        const c = tp.parseCompound("status is not ready")!.entries[0].condition;
        expect(c.operator.value).toBe("ne");
        expect(c.value.value).toBe("ready");
        expect(c.value.isValid).toBe(true);
    });
    it("rejects gt on enum field", () => {
        const g = tp.parseCompound("status gt ready");
        expect(g).not.toBeNull();
        expect(g!.entries[0].condition.field.value).toBe("status");
        expect(g!.entries[0].condition.operator.isValid).toBe(false);
    });
    it("rejects gt on text field", () => {
        const g = tp.parseCompound("name gt something");
        expect(g).not.toBeNull();
        expect(g!.entries[0].condition.field.value).toBe("name");
        expect(g!.entries[0].condition.operator.isValid).toBe(false);
    });
    it("allows eq on text field", () => {
        const c = tp.parseCompound("name is john")!.entries[0].condition;
        expect(c.value.isValid).toBe(true);
    });
    it("diagnoses non-numeric value on number field", () => {
        const d = tp.diagnose("age gt hello");
        expect(d).toHaveLength(1);
        expect(d[0].message).toBe("Expected a number");
    });
    it("diagnoses operator not supported for enum field", () => {
        const d = tp.diagnose("status greater than ready");
        expect(d.length).toBeGreaterThan(0);
        expect(d[0].message).toMatch(/operator not supported|could not understand/i);
    });
});

describe("ConditionParser with validateValue callback", () => {
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

    const vp = new ConditionParser(validatedFields, DEFAULT_OPERATORS);

    it("accepts value passing custom validator", () => {
        const c = vp.parseCompound("age is 25")!.entries[0].condition;
        expect(c.value.isValid).toBe(true);
    });
    it("rejects value failing custom validator", () => {
        const c = vp.parseCompound("age is 200")!.entries[0].condition;
        expect(c.value.isValid).toBe(false);
        expect(c.value.errorMessage).toBe("Age must be between 0 and 150");
    });
    it("diagnoses custom validation error", () => {
        const d = vp.diagnose("age is 200");
        expect(d).toHaveLength(1);
        expect(d[0].message).toBe("Age must be between 0 and 150");
    });
    it("diagnoses email validation error", () => {
        const d = vp.diagnose("email is john");
        expect(d).toHaveLength(1);
        expect(d[0].message).toBe("Must be a valid email");
    });
    it("no diagnostics for valid email", () => {
        expect(vp.diagnose("email is john@test.com")).toHaveLength(0);
    });
});
