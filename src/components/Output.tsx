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

type SharedOutputProps = {
    fields: FieldOption[];
    operators: OperatorOption[];
    defaultGroupConfig?: GroupConfig;
    className?: string;
    style?: React.CSSProperties;
};

export type ManagedOutputProps = SharedOutputProps & {
    onGroupsChange?: (groups: ConditionGroup[]) => void;
    groups?: undefined;
};

export type ControlledOutputProps = SharedOutputProps & {
    groups: ConditionGroup[];
    onGroupsChange: (groups: ConditionGroup[]) => void;
};

export type ReadOnlyOutputProps = SharedOutputProps & {
    groups: ConditionGroup[];
    onGroupsChange?: undefined;
};

export type OutputProps = ManagedOutputProps | ControlledOutputProps | ReadOnlyOutputProps;

export type { GroupMutations };

type ResolvedConfig = Required<Omit<GroupConfig, "label" | "connector">> &
    Pick<GroupConfig, "label" | "connector">;

const DEFAULT_GROUP_CONFIG: Required<Omit<GroupConfig, "label" | "connector">> = {
    editable: true,
    removable: true,
    variant: "outlined",
};

export function Output(props: OutputProps) {
    if (isManagedOutput(props)) return <ManagedOutput {...props} />;
    if (isReadOnlyOutput(props)) return <ReadOnlyOutput {...props} />;
    return <ControlledOutput {...props} />;
}

export function ManagedOutput({
    fields,
    operators,
    onGroupsChange,
    defaultGroupConfig,
    className,
    style,
}: ManagedOutputProps) {
    const { groups, mutations } = useConditionalOutput({ onGroupsChange });
    return (
        <OutputView
            groups={groups}
            mutations={mutations}
            readOnly={false}
            fields={fields}
            operators={operators}
            defaultGroupConfig={defaultGroupConfig}
            className={className}
            style={style}
        />
    );
}

export function ControlledOutput({
    fields,
    operators,
    groups,
    onGroupsChange,
    defaultGroupConfig,
    className,
    style,
}: ControlledOutputProps) {
    const { mutations } = useConditionalOutput({ groups, onGroupsChange });
    return (
        <OutputView
            groups={groups}
            mutations={mutations}
            readOnly={false}
            fields={fields}
            operators={operators}
            defaultGroupConfig={defaultGroupConfig}
            className={className}
            style={style}
        />
    );
}

export function ReadOnlyOutput({
    fields,
    operators,
    groups,
    defaultGroupConfig,
    className,
    style,
}: ReadOnlyOutputProps) {
    const { mutations } = useConditionalOutput({ groups });
    return (
        <OutputView
            groups={groups}
            mutations={mutations}
            readOnly={true}
            fields={fields}
            operators={operators}
            defaultGroupConfig={defaultGroupConfig}
            className={className}
            style={style}
        />
    );
}

function OutputView({
    groups,
    mutations,
    readOnly,
    fields,
    operators,
    defaultGroupConfig,
    className,
    style,
}: {
    groups: ConditionGroup[];
    mutations: GroupMutations;
    readOnly: boolean;
    fields: FieldOption[];
    operators: OperatorOption[];
    defaultGroupConfig?: GroupConfig;
    className?: string;
    style?: React.CSSProperties;
}) {
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

function isManagedOutput(props: OutputProps): props is ManagedOutputProps {
    return props.groups === undefined;
}

function isReadOnlyOutput(props: OutputProps): props is ReadOnlyOutputProps {
    return props.groups !== undefined && props.onGroupsChange === undefined;
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
