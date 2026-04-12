import { describe, it, expect } from "vitest";
import { defaultParser, expectGroup } from "../../__tests__/condition-fixtures";

describe("segments", () => {
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
        const group = defaultParser.parseComplexCondition("age greater than or equal to 18");
        expect(group).not.toBeNull();
        expect(group!.entries[0].condition.field.value).toBe("age");
        expect(group!.entries[0].condition.value.value).toBe("18");
    });
    it("unknown second segment inherits field+op from first", () => {
        const group = defaultParser.parseComplexCondition("age gt 18 and xyzzy bloop 42");
        expect(group).not.toBeNull();
        expect(group!.entries).toHaveLength(2);
        expect(group!.entries[1].condition.field.value).toBe("age");
        expect(group!.entries[1].condition.value.value).toBe("xyzzy bloop 42");
    });
    it("group and entries have unique IDs", () => {
        const group = defaultParser.parseComplexCondition("status is green or blue")!;
        expect(group.id).toBeTruthy();
        expect(group.entries[0].id).not.toBe(group.entries[1].id);
        expect(group.id).not.toBe(group.entries[0].id);
    });
});
