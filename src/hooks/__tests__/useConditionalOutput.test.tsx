import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useConditionalOutput } from "../useConditionalOutput";
import type { ConditionGroup, ParsedCondition } from "../../types";
import { Field, Operator, Value } from "../../condition-structure";
function cond(
    field: string,
    fieldLabel: string,
    opValue: string,
    opLabel: string,
    val: string,
): ParsedCondition {
    return {
        field: new Field(field, field, fieldLabel),
        operator: new Operator(opLabel, opValue, opLabel),
        value: new Value(val),
    };
}

function entry(id: string, c: ParsedCondition, connector: "and" | "or" = "and") {
    return { id, condition: c, connector };
}

describe("useConditionalOutput", () => {
    it("addGroup appends a group", () => {
        const { result } = renderHook(() => useConditionalOutput());
        const g: ConditionGroup = {
            id: "g1",
            entries: [entry("e1", cond("age", "Age", "eq", "equals", "1"))],
        };
        act(() => result.current.mutations.addGroup(g));
        expect(result.current.groups).toHaveLength(1);
        expect(result.current.groups[0].id).toBe("g1");
    });

    it("removeEntry drops the group when it becomes empty", () => {
        const { result } = renderHook(() => useConditionalOutput());
        const g: ConditionGroup = {
            id: "g1",
            entries: [entry("e1", cond("age", "Age", "eq", "equals", "1"))],
        };
        act(() => result.current.mutations.addGroup(g));
        act(() => result.current.mutations.removeEntry("g1", "e1"));
        expect(result.current.groups).toHaveLength(0);
    });

    it("toggleConnector flips and/or on the matching entry", () => {
        const { result } = renderHook(() => useConditionalOutput());
        const g: ConditionGroup = {
            id: "g1",
            entries: [
                entry("e1", cond("age", "Age", "eq", "equals", "1")),
                entry("e2", cond("status", "Status", "eq", "equals", "a"), "and"),
            ],
        };
        act(() => result.current.mutations.addGroup(g));
        act(() => result.current.mutations.toggleConnector("g1", "e2"));
        expect(result.current.groups[0].entries[1].connector).toBe("or");
    });

    it("updateCondition replaces the entry condition", () => {
        const { result } = renderHook(() => useConditionalOutput());
        const g: ConditionGroup = {
            id: "g1",
            entries: [entry("e1", cond("age", "Age", "eq", "equals", "1"))],
        };
        act(() => result.current.mutations.addGroup(g));
        const next = cond("status", "Status", "eq", "equals", "on");
        act(() => result.current.mutations.updateCondition("g1", "e1", next));
        expect(result.current.groups[0].entries[0].condition.field.value).toBe("status");
    });

    it("updateGroupConfig merges into group.config", () => {
        const { result } = renderHook(() => useConditionalOutput());
        const g: ConditionGroup = {
            id: "g1",
            entries: [entry("e1", cond("age", "Age", "eq", "equals", "1"))],
            config: { label: "A" },
        };
        act(() => result.current.mutations.addGroup(g));
        act(() => result.current.mutations.updateGroupConfig("g1", { editable: false }));
        expect(result.current.groups[0].config?.editable).toBe(false);
        expect(result.current.groups[0].config?.label).toBe("A");
    });

    it("reorderWithinGroup moves active entry before over entry index", () => {
        const { result } = renderHook(() => useConditionalOutput());
        const g: ConditionGroup = {
            id: "g1",
            entries: [
                entry("e1", cond("age", "Age", "eq", "equals", "1")),
                entry("e2", cond("status", "Status", "eq", "equals", "x"), "and"),
            ],
        };
        act(() => result.current.mutations.addGroup(g));
        act(() => result.current.mutations.reorderWithinGroup("g1", "e2", "e1"));
        expect(result.current.groups[0].entries.map((e) => e.id)).toEqual(["e2", "e1"]);
    });

    it("moveBetweenGroups appends when overEntryId is null", () => {
        const { result } = renderHook(() => useConditionalOutput());
        const g1: ConditionGroup = {
            id: "a",
            entries: [entry("e1", cond("age", "Age", "eq", "equals", "1"))],
        };
        const g2: ConditionGroup = {
            id: "b",
            entries: [entry("e2", cond("status", "Status", "eq", "equals", "y"))],
        };
        act(() => result.current.mutations.addGroup(g1));
        act(() => result.current.mutations.addGroup(g2));
        act(() => result.current.mutations.moveBetweenGroups("a", "b", "e1", null));
        expect(result.current.groups.find((g) => g.id === "a")?.entries ?? []).toHaveLength(0);
        const b = result.current.groups.find((x) => x.id === "b")!;
        expect(b.entries.map((e) => e.id)).toEqual(["e2", "e1"]);
    });

    it("moveBetweenGroups inserts after overEntryId when set", () => {
        const { result } = renderHook(() => useConditionalOutput());
        const g1: ConditionGroup = {
            id: "a",
            entries: [entry("move", cond("age", "Age", "eq", "equals", "1"))],
        };
        const g2: ConditionGroup = {
            id: "b",
            entries: [
                entry("first", cond("status", "Status", "eq", "equals", "a")),
                entry("second", cond("name", "Name", "contains", "contains", "n"), "and"),
            ],
        };
        act(() => result.current.mutations.addGroup(g1));
        act(() => result.current.mutations.addGroup(g2));
        act(() => result.current.mutations.moveBetweenGroups("a", "b", "move", "first"));
        expect(result.current.groups.find((g) => g.id === "a")).toBeUndefined();
        const b = result.current.groups.find((x) => x.id === "b")!;
        expect(b.entries.map((e) => e.id)).toEqual(["first", "move", "second"]);
    });

    it("ungroupEntry removes from source and adds a single-entry group", () => {
        const { result } = renderHook(() => useConditionalOutput());
        const g: ConditionGroup = {
            id: "g1",
            entries: [
                entry("keep", cond("age", "Age", "eq", "equals", "1")),
                entry("split", cond("status", "Status", "eq", "equals", "on"), "and"),
            ],
        };
        act(() => result.current.mutations.addGroup(g));
        act(() => result.current.mutations.ungroupEntry("g1", "split"));
        expect(result.current.groups).toHaveLength(2);
        const solo = result.current.groups.find((x) => x.entries[0]?.id === "split")!;
        expect(solo.entries[0].id).toBe("split");
        expect(solo.entries[0].connector).toBe("and");
    });

    it("setGroups replaces the list", () => {
        const { result } = renderHook(() => useConditionalOutput());
        act(() =>
            result.current.mutations.setGroups([
                { id: "x", entries: [entry("e", cond("age", "Age", "eq", "equals", "1"))] },
            ]),
        );
        expect(result.current.groups).toHaveLength(1);
        expect(result.current.groups[0].id).toBe("x");
    });

    it("controlled mode uses external groups and notifies on commit", () => {
        const onGroupsChange = vi.fn();
        const g: ConditionGroup = {
            id: "g1",
            entries: [entry("e1", cond("age", "Age", "eq", "equals", "1"))],
        };
        const { result, rerender } = renderHook(
            ({ groups }) => useConditionalOutput({ groups, onGroupsChange }),
            { initialProps: { groups: [g] as ConditionGroup[] } },
        );
        expect(result.current.groups).toHaveLength(1);
        onGroupsChange.mockClear();

        const next: ConditionGroup[] = [];
        rerender({ groups: next });
        act(() => result.current.mutations.addGroup(g));
        expect(onGroupsChange).toHaveBeenCalled();
        expect(onGroupsChange.mock.calls.at(-1)![0]).toHaveLength(1);
    });

    it("calls onGroupsChange once on mount with initial groups", () => {
        const onGroupsChange = vi.fn();
        const g: ConditionGroup = {
            id: "g1",
            entries: [entry("e1", cond("age", "Age", "eq", "equals", "1"))],
        };
        renderHook(() => useConditionalOutput({ groups: [g], onGroupsChange }));
        expect(onGroupsChange).toHaveBeenCalledWith([g]);
    });
});
