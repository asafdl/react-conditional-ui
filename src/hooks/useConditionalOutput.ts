import { useState, useCallback, useRef, useEffect } from "react";
import { generateId } from "../id";
import type {
    ConditionGroup,
    ConditionEntry,
    ParsedCondition,
    LogicalOperator,
    GroupConfig,
} from "../types";

export type GroupMutations = {
    addGroup: (group: ConditionGroup) => void;
    removeEntry: (groupId: string, entryId: string) => void;
    toggleConnector: (groupId: string, entryId: string) => void;
    updateCondition: (groupId: string, entryId: string, condition: ParsedCondition) => void;
    updateGroupConfig: (groupId: string, config: Partial<GroupConfig>) => void;
    reorderWithinGroup: (groupId: string, activeId: string, overId: string) => void;
    moveBetweenGroups: (
        sourceGroupId: string,
        targetGroupId: string,
        entryId: string,
        overEntryId: string | null,
    ) => void;
    ungroupEntry: (groupId: string, entryId: string) => void;
    setGroups: (groups: ConditionGroup[]) => void;
};

export type UseConditionalOutputOptions = {
    groups?: ConditionGroup[];
    onGroupsChange?: (groups: ConditionGroup[]) => void;
};

export function useConditionalOutput({
    groups: controlledGroups,
    onGroupsChange,
}: UseConditionalOutputOptions = {}) {
    const [internalGroups, setInternalGroups] = useState<ConditionGroup[]>([]);
    const isControlled = controlledGroups !== undefined;
    const groups = isControlled ? controlledGroups : internalGroups;

    const onGroupsChangeRef = useRef(onGroupsChange);
    useEffect(() => {
        onGroupsChangeRef.current = onGroupsChange;
    }, [onGroupsChange]);

    const didMount = useRef(false);
    useEffect(() => {
        if (!didMount.current) {
            didMount.current = true;
            onGroupsChangeRef.current?.(groups);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const commit = useCallback(
        (next: ConditionGroup[]) => {
            if (!isControlled) setInternalGroups(next);
            onGroupsChangeRef.current?.(next);
        },
        [isControlled],
    );

    const addGroup = useCallback(
        (group: ConditionGroup) => {
            commit([...groups, group]);
        },
        [groups, commit],
    );

    const removeEntry = useCallback(
        (groupId: string, entryId: string) => {
            commit(
                groups
                    .map((g) =>
                        g.id === groupId
                            ? { ...g, entries: g.entries.filter((e) => e.id !== entryId) }
                            : g,
                    )
                    .filter((g) => g.entries.length > 0),
            );
        },
        [groups, commit],
    );

    const toggleConnector = useCallback(
        (groupId: string, entryId: string) => {
            commit(
                groups.map((g) => {
                    if (g.id !== groupId) return g;
                    return {
                        ...g,
                        entries: g.entries.map((e) =>
                            e.id === entryId
                                ? { ...e, connector: (e.connector === "and" ? "or" : "and") as LogicalOperator }
                                : e,
                        ),
                    };
                }),
            );
        },
        [groups, commit],
    );

    const updateCondition = useCallback(
        (groupId: string, entryId: string, condition: ParsedCondition) => {
            commit(
                groups.map((g) => {
                    if (g.id !== groupId) return g;
                    return {
                        ...g,
                        entries: g.entries.map((e) =>
                            e.id === entryId ? { ...e, condition } : e,
                        ),
                    };
                }),
            );
        },
        [groups, commit],
    );

    const updateGroupConfig = useCallback(
        (groupId: string, config: Partial<GroupConfig>) => {
            commit(
                groups.map((g) =>
                    g.id === groupId ? { ...g, config: { ...g.config, ...config } } : g,
                ),
            );
        },
        [groups, commit],
    );

    const reorderWithinGroup = useCallback(
        (groupId: string, activeId: string, overId: string) => {
            commit(
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
        [groups, commit],
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

            commit(newGroups.filter((g) => g.entries.length > 0));
        },
        [groups, commit],
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

            let newGroups = groups
                .map((g) =>
                    g.id === groupId
                        ? { ...g, entries: g.entries.filter((e) => e.id !== entryId) }
                        : g,
                )
                .filter((g) => g.entries.length > 0);

            newGroups.push(newGroup);
            commit(newGroups);
        },
        [groups, commit],
    );

    const setGroups = useCallback(
        (next: ConditionGroup[]) => commit(next),
        [commit],
    );

    const mutations: GroupMutations = {
        addGroup,
        removeEntry,
        toggleConnector,
        updateCondition,
        updateGroupConfig,
        reorderWithinGroup,
        moveBetweenGroups,
        ungroupEntry,
        setGroups,
    };

    return { groups, mutations };
}
