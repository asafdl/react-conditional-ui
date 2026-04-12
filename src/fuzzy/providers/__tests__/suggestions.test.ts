import { describe, it, expect } from "vitest";
import { DEFAULT_OPERATORS } from "../../../condition-structure";
import { ConditionDataProvider } from "../../../condition-data-provider";
import type { FieldOption } from "../../../types";
import { fieldsWithConfig } from "../../../__tests__/condition-fixtures";

describe("suggestions", () => {
    const p = new ConditionDataProvider(fieldsWithConfig, DEFAULT_OPERATORS);

    describe("getSuggestion", () => {
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

    describe("getCompletions", () => {
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
            const tp = new ConditionDataProvider(typedFields, DEFAULT_OPERATORS);
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
});
