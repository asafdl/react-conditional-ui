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
import { applyOutputDragEnd } from "../dnd/output-drag-end";

export {
    UNGROUP_ZONE_ID,
    GROUP_DROPPABLE_PREFIX,
    applyOutputDragEnd,
} from "../dnd/output-drag-end";

type Props = {
    groups: ConditionGroup[];
    mutations: GroupMutations;
    children: ReactNode;
    renderOverlay?: (entry: ConditionEntry) => ReactNode;
};

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
            const over = event.over;
            applyOutputDragEnd(
                groups,
                String(event.active.id),
                over ? String(over.id) : null,
                mutations,
            );
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
