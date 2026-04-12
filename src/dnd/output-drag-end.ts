import type { ConditionGroup } from "../types";
import type { GroupMutations } from "../hooks/useConditionalOutput";

export const UNGROUP_ZONE_ID = "ungrouped-drop-zone";
export const GROUP_DROPPABLE_PREFIX = "group:";

function findGroupByEntryId(groups: ConditionGroup[], entryId: string): ConditionGroup | null {
    for (const group of groups) {
        if (group.entries.some((e) => e.id === entryId)) return group;
    }
    return null;
}

/**
 * Maps a finished drag (active id + drop target id) to our output mutations.
 * Kept pure so tests cover our rules without mounting @dnd-kit.
 */
export function applyOutputDragEnd(
    groups: ConditionGroup[],
    activeId: string,
    overId: string | null,
    mutations: Pick<GroupMutations, "ungroupEntry" | "moveBetweenGroups" | "reorderWithinGroup">,
): void {
    if (!overId || activeId === overId) return;

    const sourceGroup = findGroupByEntryId(groups, activeId);
    if (!sourceGroup) return;

    if (overId === UNGROUP_ZONE_ID) {
        mutations.ungroupEntry(sourceGroup.id, activeId);
        return;
    }

    if (overId.startsWith(GROUP_DROPPABLE_PREFIX)) {
        const targetGroupId = overId.slice(GROUP_DROPPABLE_PREFIX.length);
        if (targetGroupId !== sourceGroup.id) {
            mutations.moveBetweenGroups(sourceGroup.id, targetGroupId, activeId, null);
        }
        return;
    }

    const targetGroup = findGroupByEntryId(groups, overId);

    if (targetGroup && sourceGroup.id === targetGroup.id) {
        mutations.reorderWithinGroup(sourceGroup.id, activeId, overId);
    } else if (targetGroup) {
        mutations.moveBetweenGroups(sourceGroup.id, targetGroup.id, activeId, overId);
    } else {
        mutations.ungroupEntry(sourceGroup.id, activeId);
    }
}
