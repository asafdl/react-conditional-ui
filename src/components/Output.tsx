import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { OutputRow } from "./OutputRow";
import { ConnectorChip } from "./ConnectorChip";
import { OutputDndContext, UNGROUP_ZONE_ID } from "./OutputDndContext";
import { useConditionalOutput } from "../hooks/useConditionalOutput";
import type {
    FieldOption,
    OperatorOption,
    ConditionGroup,
    ConditionEntry,
    GroupConfig,
} from "../types";
import type { GroupMutations } from "../hooks/useConditionalOutput";

export type OutputProps = {
    fields: FieldOption[];
    operators: OperatorOption[];
    /** Controlled groups. Omit for uncontrolled (internal state). */
    groups?: ConditionGroup[];
    /** Fires whenever groups change (works in both controlled and uncontrolled mode). */
    onGroupsChange?: (groups: ConditionGroup[]) => void;
    /** Default config applied to every group unless overridden by group.config. */
    defaultGroupConfig?: GroupConfig;
    className?: string;
    style?: React.CSSProperties;
};

export type { GroupMutations };

type ResolvedConfig = Required<Omit<GroupConfig, "label" | "connector">> &
    Pick<GroupConfig, "label" | "connector">;

const DEFAULT_GROUP_CONFIG: Required<Omit<GroupConfig, "label" | "connector">> = {
    editable: true,
    removable: true,
    variant: "outlined",
};

export function Output({
    fields,
    operators,
    groups: controlledGroups,
    onGroupsChange,
    defaultGroupConfig,
    className,
    style,
}: OutputProps) {
    const { groups, mutations } = useConditionalOutput({
        groups: controlledGroups,
        onGroupsChange,
    });

    const readOnly = controlledGroups !== undefined && !onGroupsChange;
    const effectiveDefault: GroupConfig | undefined = readOnly
        ? { editable: false, removable: false, ...defaultGroupConfig }
        : defaultGroupConfig;

    const rootClass = ["rcui-output", className].filter(Boolean).join(" ");

    const renderOverlay = (entry: ConditionEntry) => (
        <div className="rcui-overlay">
            <Chip label={entry.condition.field.label} size="small" className="rcui-chip-field" />
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
        <OutputDndContext groups={groups} mutations={mutations} renderOverlay={renderOverlay}>
            <DropZone className={rootClass} style={style}>
                {groups.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        Parsed condition will appear here…
                    </Typography>
                ) : (
                    groups.map((group) => (
                        <GroupCard
                            key={group.id}
                            group={group}
                            fields={fields}
                            operators={operators}
                            config={resolveConfig(group.config, effectiveDefault)}
                            mutations={mutations}
                        />
                    ))
                )}
            </DropZone>
        </OutputDndContext>
    );
}

function resolveConfig(groupConfig?: GroupConfig, defaultConfig?: GroupConfig): ResolvedConfig {
    return { ...DEFAULT_GROUP_CONFIG, ...defaultConfig, ...groupConfig };
}

function GroupCard({
    group,
    fields,
    operators,
    config,
    mutations,
}: {
    group: ConditionGroup;
    fields: FieldOption[];
    operators: OperatorOption[];
    config: ResolvedConfig;
    mutations: GroupMutations;
}) {
    const allIds = group.entries.map((e) => e.id);
    const isMulti = group.entries.length > 1;
    const { setNodeRef, isOver } = useDroppable({ id: `group:${group.id}` });

    const entries = (
        <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
            {config.label && (
                <Typography variant="caption" color="text.secondary" className="rcui-group-label">
                    {config.label}
                </Typography>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {group.entries.map((entry, idx) => (
                    <div key={entry.id}>
                        {idx > 0 && (
                            <ConnectorChip
                                connector={entry.connector}
                                onToggle={
                                    config.editable
                                        ? () => mutations.toggleConnector(group.id, entry.id)
                                        : undefined
                                }
                            />
                        )}
                        <OutputRow
                            id={entry.id}
                            condition={entry.condition}
                            fields={fields}
                            operators={operators}
                            onUpdate={
                                config.editable
                                    ? (c) => mutations.updateCondition(group.id, entry.id, c)
                                    : undefined
                            }
                            onRemove={
                                config.removable
                                    ? () => mutations.removeEntry(group.id, entry.id)
                                    : undefined
                            }
                        />
                    </div>
                ))}
            </div>
        </SortableContext>
    );

    if (!isMulti) {
        const singleClass = ["rcui-droppable-single", isOver ? "rcui-droppable-single--over" : ""]
            .filter(Boolean)
            .join(" ");

        return (
            <div ref={setNodeRef} className={singleClass}>
                {entries}
            </div>
        );
    }

    const paperClass = ["rcui-group-paper", isOver ? "rcui-group-paper--over" : ""]
        .filter(Boolean)
        .join(" ");

    return (
        <Paper
            ref={setNodeRef}
            variant={config.variant as "outlined" | "elevation"}
            className={paperClass}
        >
            {entries}
        </Paper>
    );
}

function DropZone({
    children,
    className,
    style,
}: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: UNGROUP_ZONE_ID });

    const zoneClass = ["rcui-drop-zone", isOver ? "rcui-drop-zone--over" : "", className]
        .filter(Boolean)
        .join(" ");

    return (
        <div ref={setNodeRef} className={zoneClass} style={style}>
            {children}
        </div>
    );
}
