import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { OutputRow } from "./OutputRow";
import { ConnectorChip } from "./ConnectorChip";
import { OutputDndContext, UNGROUP_ZONE_ID } from "./OutputDndContext";
import type { FieldOption, OperatorOption, ParsedCondition, ConditionGroup, ConditionEntry } from "../types";
import type { GroupMutations } from "./OutputDndContext";

export type OutputProps = {
    groups: ConditionGroup[];
    fields: FieldOption[];
    operators: OperatorOption[];
    values?: Record<string, FieldOption[]>;
    onGroupsChange?: (groups: ConditionGroup[]) => void;
    onUpdateCondition?: (groupId: string, entryId: string, condition: ParsedCondition) => void;
};

export function Output({
    groups,
    fields,
    operators,
    values,
    onGroupsChange,
    onUpdateCondition,
}: OutputProps) {
    if (groups.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                Parsed condition will appear here…
            </Typography>
        );
    }

    const editable = !!onGroupsChange;

    if (!editable) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {groups.map((group) => (
                    <GroupCard key={group.id} group={group} fields={fields} operators={operators} values={values} />
                ))}
            </div>
        );
    }

    const renderOverlay = (entry: ConditionEntry) => (
        <div className="rcui-overlay">
            <Chip
                label={entry.condition.field.label}
                size="small"
                className="rcui-chip-field"
            />
            <Chip
                label={entry.condition.operator.label}
                size="small"
                className="rcui-chip-operator"
            />
            <Chip
                label={entry.condition.value.label || "…"}
                size="small"
                className="rcui-chip-value"
            />
        </div>
    );

    return (
        <OutputDndContext groups={groups} onGroupsChange={onGroupsChange} renderOverlay={renderOverlay}>
            {(mutations) => (
                <UngroupDropZone>
                    {groups.map((group) => (
                        <DroppableGroup
                            key={group.id}
                            group={group}
                            fields={fields}
                            operators={operators}
                            values={values}
                            mutations={mutations}
                            onUpdateCondition={onUpdateCondition}
                        />
                    ))}
                </UngroupDropZone>
            )}
        </OutputDndContext>
    );
}

function DroppableGroup({
    group,
    fields,
    operators,
    values,
    mutations,
    onUpdateCondition,
}: {
    group: ConditionGroup;
    fields: FieldOption[];
    operators: OperatorOption[];
    values?: Record<string, FieldOption[]>;
    mutations: GroupMutations;
    onUpdateCondition?: (groupId: string, entryId: string, condition: ParsedCondition) => void;
}) {
    const allIds = group.entries.map((e) => e.id);
    const isMulti = group.entries.length > 1;
    const { setNodeRef, isOver } = useDroppable({ id: `group:${group.id}` });

    const content = (
        <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {group.entries.map((entry, idx) => (
                    <div key={entry.id}>
                        {idx > 0 && (
                            <ConnectorChip
                                connector={entry.connector}
                                onToggle={() => mutations.toggleConnector(group.id, entry.id)}
                            />
                        )}
                        <OutputRow
                            id={entry.id}
                            condition={entry.condition}
                            fields={fields}
                            operators={operators}
                            values={values}
                            onUpdate={
                                onUpdateCondition
                                    ? (c) => onUpdateCondition(group.id, entry.id, c)
                                    : undefined
                            }
                            onRemove={() => mutations.removeEntry(group.id, entry.id)}
                        />
                    </div>
                ))}
            </div>
        </SortableContext>
    );

    if (isMulti) {
        const paperClass = [
            "rcui-group-paper",
            isOver ? "rcui-group-paper--over" : "",
        ]
            .filter(Boolean)
            .join(" ");

        return (
            <Paper ref={setNodeRef} variant="outlined" className={paperClass}>
                {content}
            </Paper>
        );
    }

    const singleClass = [
        "rcui-droppable-single",
        isOver ? "rcui-droppable-single--over" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div ref={setNodeRef} className={singleClass}>
            {content}
        </div>
    );
}

function UngroupDropZone({ children }: { children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: UNGROUP_ZONE_ID });

    const zoneClass = [
        "rcui-drop-zone",
        isOver ? "rcui-drop-zone--over" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div ref={setNodeRef} className={zoneClass}>
            {children}
        </div>
    );
}

function GroupCard({
    group,
    fields,
    operators,
    values,
}: {
    group: ConditionGroup;
    fields: FieldOption[];
    operators: OperatorOption[];
    values?: Record<string, FieldOption[]>;
}) {
    const isMulti = group.entries.length > 1;
    const content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {group.entries.map((entry, idx) => (
                <div key={entry.id}>
                    {idx > 0 && <ConnectorChip connector={entry.connector} />}
                    <OutputRow
                        id={entry.id}
                        condition={entry.condition}
                        fields={fields}
                        operators={operators}
                        values={values}
                        draggable={false}
                    />
                </div>
            ))}
        </div>
    );

    if (isMulti) {
        return (
            <Paper variant="outlined" className="rcui-group-paper">
                {content}
            </Paper>
        );
    }

    return content;
}
