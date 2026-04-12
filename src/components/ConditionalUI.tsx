import { ManagedInput } from "./Input";
import { ControlledOutput } from "./Output";
import { useConditionalOutput } from "../hooks/useConditionalOutput";
import { DEFAULT_OPERATORS } from "../condition-structure";
import type { ConditionalUIProps } from "../types";

export function ConditionalUI({
    fields,
    operators = DEFAULT_OPERATORS,
    value,
    onChange,
    onConditionsChange,
    InputComponent = ManagedInput,
    OutputComponent = ControlledOutput,
    className,
    style,
}: ConditionalUIProps) {
    const { groups, mutations } = useConditionalOutput({
        onGroupsChange: onConditionsChange,
    });

    const rootClass = ["rcui-root", className].filter(Boolean).join(" ");

    return (
        <div className={rootClass} style={style}>
            <InputComponent
                fields={fields}
                operators={operators}
                value={value}
                onChange={onChange}
                onSubmit={mutations.addGroup}
            />
            <OutputComponent
                groups={groups}
                fields={fields}
                operators={operators}
                onGroupsChange={mutations.setGroups}
            />
        </div>
    );
}
