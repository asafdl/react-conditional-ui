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
import type { ConditionGroup, ConditionEntry } from "../types";
import type { GroupMutations } from "../hooks/useConditionalOutput";

type Props = {
    groups: ConditionGroup[];
    mutations: GroupMutations;
    children: ReactNode;
    renderOverlay?: (entry: ConditionEntry) => ReactNode;
};

export const UNGROUP_ZONE_ID = "ungrouped-drop-zone";
export const GROUP_DROPPABLE_PREFIX = "group:";

export function OutputDndContext({ groups, mutations, children, renderOverlay }: Props) {
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
        },
        [groups, mutations],
    );

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {children}
            <DragOverlay dropAnimation={null}>
                {activeEntry && renderOverlay ? renderOverlay(activeEntry) : null}
            </DragOverlay>
        </DndContext>
    );
}

function findGroupByEntryId(groups: ConditionGroup[], entryId: string) {
    for (const group of groups) {
        if (group.entries.some((e) => e.id === entryId)) return group;
    }
    return null;
}
