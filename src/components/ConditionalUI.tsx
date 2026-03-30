import { useState, useCallback, useMemo, useEffect } from "react";
import { Input } from "./Input";
import { Output } from "./Output";
import { ConditionParser } from "../fuzzy/parser";
import { DEFAULT_OPERATORS } from "../condition-structure";
import type { ConditionalUIProps, ConditionGroup, ParsedCondition } from "../types";

export function ConditionalUI({
    fields,
    operators = DEFAULT_OPERATORS,
    values,
    value,
    onChange,
    onConditionsChange,
}: ConditionalUIProps) {
    const [internal, setInternal] = useState("");
    const [groups, setGroups] = useState<ConditionGroup[]>([]);
    const text = value ?? internal;

    const parser = useMemo(
        () => new ConditionParser(fields, operators, values),
        [fields, operators, values],
    );

    useEffect(() => {
        onConditionsChange?.(groups);
    }, [groups, onConditionsChange]);

    const handleChange = useCallback(
        (next: string) => {
            if (value === undefined) setInternal(next);
            onChange?.(next);
        },
        [value, onChange],
    );

    const handleSubmit = useCallback(() => {
        const group = parser.parseCompound(text);
        if (group) {
            setGroups((prev) => [...prev, group]);
            if (value === undefined) setInternal("");
            onChange?.("");
        }
    }, [text, parser, value, onChange]);

    const getSuggestion = useCallback(
        (text: string) => parser.getSuggestion(text),
        [parser],
    );

    const handleGroupsChange = useCallback((newGroups: ConditionGroup[]) => {
        setGroups(newGroups);
    }, []);

    const handleUpdateCondition = useCallback(
        (groupId: string, entryId: string, condition: ParsedCondition) => {
            setGroups((prev) =>
                prev.map((g) => {
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
        [],
    );

    return (
        <div className="rcui-root">
            <Input value={text} onChange={handleChange} onSubmit={handleSubmit} getSuggestion={getSuggestion} />
            <Output
                groups={groups}
                fields={fields}
                operators={operators}
                values={values}
                onGroupsChange={handleGroupsChange}
                onUpdateCondition={handleUpdateCondition}
            />
        </div>
    );
}
