import { describe, it, expect, vi } from "vitest";
import {
    applyOutputDragEnd,
    UNGROUP_ZONE_ID,
    GROUP_DROPPABLE_PREFIX,
} from "../output-drag-end";
import type { ConditionGroup, ParsedCondition } from "../../types";

const stubCondition = {} as ParsedCondition;

function makeGroup(id: string, entryIds: string[]): ConditionGroup {
    return {
        id,
        entries: entryIds.map((eid) => ({
            id: eid,
            connector: "and" as const,
            condition: stubCondition,
        })),
    };
}

describe("applyOutputDragEnd", () => {
    it("no-ops when over is null", () => {
        const mutations = {
            ungroupEntry: vi.fn(),
            moveBetweenGroups: vi.fn(),
            reorderWithinGroup: vi.fn(),
        };
        const groups = [makeGroup("g1", ["a"])];
        applyOutputDragEnd(groups, "a", null, mutations);
        expect(mutations.ungroupEntry).not.toHaveBeenCalled();
        expect(mutations.moveBetweenGroups).not.toHaveBeenCalled();
        expect(mutations.reorderWithinGroup).not.toHaveBeenCalled();
    });

    it("no-ops when active and over are the same id", () => {
        const mutations = {
            ungroupEntry: vi.fn(),
            moveBetweenGroups: vi.fn(),
            reorderWithinGroup: vi.fn(),
        };
        const groups = [makeGroup("g1", ["a"])];
        applyOutputDragEnd(groups, "a", "a", mutations);
        expect(mutations.reorderWithinGroup).not.toHaveBeenCalled();
    });

    it("no-ops when active entry is not in any group", () => {
        const mutations = {
            ungroupEntry: vi.fn(),
            moveBetweenGroups: vi.fn(),
            reorderWithinGroup: vi.fn(),
        };
        const groups = [makeGroup("g1", ["a"])];
        applyOutputDragEnd(groups, "missing", UNGROUP_ZONE_ID, mutations);
        expect(mutations.ungroupEntry).not.toHaveBeenCalled();
    });

    it("ungroups when dropped on ungroup zone", () => {
        const mutations = {
            ungroupEntry: vi.fn(),
            moveBetweenGroups: vi.fn(),
            reorderWithinGroup: vi.fn(),
        };
        const groups = [makeGroup("g1", ["e1"])];
        applyOutputDragEnd(groups, "e1", UNGROUP_ZONE_ID, mutations);
        expect(mutations.ungroupEntry).toHaveBeenCalledWith("g1", "e1");
    });

    it("moves to another group when dropped on group droppable", () => {
        const mutations = {
            ungroupEntry: vi.fn(),
            moveBetweenGroups: vi.fn(),
            reorderWithinGroup: vi.fn(),
        };
        const groups = [makeGroup("g1", ["e1"]), makeGroup("g2", ["e2"])];
        applyOutputDragEnd(groups, "e1", `${GROUP_DROPPABLE_PREFIX}g2`, mutations);
        expect(mutations.moveBetweenGroups).toHaveBeenCalledWith("g1", "g2", "e1", null);
    });

    it("does not move when group droppable is the same group", () => {
        const mutations = {
            ungroupEntry: vi.fn(),
            moveBetweenGroups: vi.fn(),
            reorderWithinGroup: vi.fn(),
        };
        const groups = [makeGroup("g1", ["e1", "e2"])];
        applyOutputDragEnd(groups, "e1", `${GROUP_DROPPABLE_PREFIX}g1`, mutations);
        expect(mutations.moveBetweenGroups).not.toHaveBeenCalled();
    });

    it("reorders within the same group when over is another entry in that group", () => {
        const mutations = {
            ungroupEntry: vi.fn(),
            moveBetweenGroups: vi.fn(),
            reorderWithinGroup: vi.fn(),
        };
        const groups = [makeGroup("g1", ["e1", "e2"])];
        applyOutputDragEnd(groups, "e1", "e2", mutations);
        expect(mutations.reorderWithinGroup).toHaveBeenCalledWith("g1", "e1", "e2");
    });

    it("moves between groups when over is an entry id in a different group", () => {
        const mutations = {
            ungroupEntry: vi.fn(),
            moveBetweenGroups: vi.fn(),
            reorderWithinGroup: vi.fn(),
        };
        const groups = [makeGroup("g1", ["e1"]), makeGroup("g2", ["e2"])];
        applyOutputDragEnd(groups, "e1", "e2", mutations);
        expect(mutations.moveBetweenGroups).toHaveBeenCalledWith("g1", "g2", "e1", "e2");
    });

    it("ungroups when over id does not resolve to a known entry group", () => {
        const mutations = {
            ungroupEntry: vi.fn(),
            moveBetweenGroups: vi.fn(),
            reorderWithinGroup: vi.fn(),
        };
        const groups = [makeGroup("g1", ["e1"])];
        applyOutputDragEnd(groups, "e1", "not-an-entry-id", mutations);
        expect(mutations.ungroupEntry).toHaveBeenCalledWith("g1", "e1");
    });
});
