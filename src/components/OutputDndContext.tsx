import { type ReactNode, useCallback, useState } from "react";
import {
    DndContext,
    DragOverlay,
    pointerWithin,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { ConditionGroup, ConditionEntry, LogicalOperator } from "../types";
import { generateId } from "../id";

export const UNGROUP_ZONE_ID = "ungrouped-drop-zone";
export const GROUP_DROPPABLE_PREFIX = "group:";

export type GroupMutations = {
    reorderWithinGroup: (groupId: string, activeId: string, overId: string) => void;
    moveBetweenGroups: (
        sourceGroupId: string,
        targetGroupId: string,
        entryId: string,
        overEntryId: string | null,
    ) => void;
    ungroupEntry: (groupId: string, entryId: string) => void;
    removeEntry: (groupId: string, entryId: string) => void;
    toggleConnector: (groupId: string, entryId: string) => void;
    updateEntry: (groupId: string, entryId: string, entry: Partial<ConditionEntry>) => void;
};

type Props = {
    groups: ConditionGroup[];
    onGroupsChange: (groups: ConditionGroup[]) => void;
    children: (mutations: GroupMutations) => ReactNode;
    renderOverlay?: (entry: ConditionEntry) => ReactNode;
};

function findGroupByEntryId(groups: ConditionGroup[], entryId: string) {
    for (const group of groups) {
        if (group.entries.some((e) => e.id === entryId)) return group;
    }
    return null;
}

export function OutputDndContext({ groups, onGroupsChange, children, renderOverlay }: Props) {
    const [activeEntry, setActiveEntry] = useState<ConditionEntry | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragStart = useCallback(
        (event: DragStartEvent) => {
            const entryId = String(event.active.id);
            for (const group of groups) {
                const entry = group.entries.find((e) => e.id === entryId);
                if (entry) {
                    setActiveEntry(entry);
                    return;
                }
            }
        },
        [groups],
    );

    const reorderWithinGroup = useCallback(
        (groupId: string, activeId: string, overId: string) => {
            onGroupsChange(
                groups.map((g) => {
                    if (g.id !== groupId) return g;
                    const oldIdx = g.entries.findIndex((e) => e.id === activeId);
                    const newIdx = g.entries.findIndex((e) => e.id === overId);
                    if (oldIdx === -1 || newIdx === -1) return g;
                    const entries = [...g.entries];
                    const [moved] = entries.splice(oldIdx, 1);
                    entries.splice(newIdx, 0, moved);
                    return { ...g, entries };
                }),
            );
        },
        [groups, onGroupsChange],
    );

    const moveBetweenGroups = useCallback(
        (sourceGroupId: string, targetGroupId: string, entryId: string, overEntryId: string | null) => {
            const sourceGroup = groups.find((g) => g.id === sourceGroupId);
            const targetGroup = groups.find((g) => g.id === targetGroupId);
            if (!sourceGroup || !targetGroup) return;

            const entry = sourceGroup.entries.find((e) => e.id === entryId);
            if (!entry) return;

            const targetConnector: LogicalOperator =
                targetGroup.entries.length > 0 ? targetGroup.entries[0].connector : "and";

            const movedEntry: ConditionEntry = { ...entry, connector: targetConnector };

            let newGroups = groups.map((g) => {
                if (g.id === sourceGroupId) {
                    return { ...g, entries: g.entries.filter((e) => e.id !== entryId) };
                }
                if (g.id === targetGroupId) {
                    const entries = [...g.entries];
                    if (overEntryId) {
                        const idx = entries.findIndex((e) => e.id === overEntryId);
                        entries.splice(idx + 1, 0, movedEntry);
                    } else {
                        entries.push(movedEntry);
                    }
                    return { ...g, entries };
                }
                return g;
            });

            newGroups = newGroups.filter((g) => g.entries.length > 0);
            onGroupsChange(newGroups);
        },
        [groups, onGroupsChange],
    );

    const ungroupEntry = useCallback(
        (groupId: string, entryId: string) => {
            const group = groups.find((g) => g.id === groupId);
            if (!group) return;
            const entry = group.entries.find((e) => e.id === entryId);
            if (!entry) return;

            const newGroup: ConditionGroup = {
                id: generateId(),
                entries: [{ ...entry, connector: "and" }],
            };

            let newGroups = groups.map((g) => {
                if (g.id !== groupId) return g;
                return { ...g, entries: g.entries.filter((e) => e.id !== entryId) };
            });

            newGroups = newGroups.filter((g) => g.entries.length > 0);
            newGroups.push(newGroup);
            onGroupsChange(newGroups);
        },
        [groups, onGroupsChange],
    );

    const removeEntry = useCallback(
        (groupId: string, entryId: string) => {
            let newGroups = groups.map((g) => {
                if (g.id !== groupId) return g;
                return { ...g, entries: g.entries.filter((e) => e.id !== entryId) };
            });
            newGroups = newGroups.filter((g) => g.entries.length > 0);
            onGroupsChange(newGroups);
        },
        [groups, onGroupsChange],
    );

    const toggleConnector = useCallback(
        (groupId: string, entryId: string) => {
            onGroupsChange(
                groups.map((g) => {
                    if (g.id !== groupId) return g;
                    return {
                        ...g,
                        entries: g.entries.map((e) =>
                            e.id === entryId
                                ? { ...e, connector: e.connector === "and" ? "or" : "and" as LogicalOperator }
                                : e,
                        ),
                    };
                }),
            );
        },
        [groups, onGroupsChange],
    );

    const updateEntry = useCallback(
        (groupId: string, entryId: string, partial: Partial<ConditionEntry>) => {
            onGroupsChange(
                groups.map((g) => {
                    if (g.id !== groupId) return g;
                    return {
                        ...g,
                        entries: g.entries.map((e) =>
                            e.id === entryId ? { ...e, ...partial } : e,
                        ),
                    };
                }),
            );
        },
        [groups, onGroupsChange],
    );

    const mutations: GroupMutations = {
        reorderWithinGroup,
        moveBetweenGroups,
        ungroupEntry,
        removeEntry,
        toggleConnector,
        updateEntry,
    };

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            setActiveEntry(null);

            const { active, over } = event;
            if (!over || active.id === over.id) return;

            const activeId = String(active.id);
            const overId = String(over.id);

            const sourceGroup = findGroupByEntryId(groups, activeId);
            if (!sourceGroup) return;

            if (overId === UNGROUP_ZONE_ID) {
                ungroupEntry(sourceGroup.id, activeId);
                return;
            }

            if (overId.startsWith(GROUP_DROPPABLE_PREFIX)) {
                const targetGroupId = overId.slice(GROUP_DROPPABLE_PREFIX.length);
                if (targetGroupId !== sourceGroup.id) {
                    moveBetweenGroups(sourceGroup.id, targetGroupId, activeId, null);
                }
                return;
            }

            const targetGroup = findGroupByEntryId(groups, overId);

            if (targetGroup && sourceGroup.id === targetGroup.id) {
                reorderWithinGroup(sourceGroup.id, activeId, overId);
            } else if (targetGroup) {
                moveBetweenGroups(sourceGroup.id, targetGroup.id, activeId, overId);
            } else {
                ungroupEntry(sourceGroup.id, activeId);
            }
        },
        [groups, reorderWithinGroup, moveBetweenGroups, ungroupEntry],
    );

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {children(mutations)}
            <DragOverlay dropAnimation={null}>
                {activeEntry && renderOverlay ? renderOverlay(activeEntry) : null}
            </DragOverlay>
        </DndContext>
    );
}
