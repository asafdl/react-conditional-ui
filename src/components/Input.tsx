import { useCallback, useMemo } from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import Tooltip from "@mui/material/Tooltip";
import { useConditionalInput } from "../hooks/useConditionalInput";
import type { FieldOption, OperatorOption, ConditionGroup, Diagnostic } from "../types";

type BaseProps = {
    placeholder?: string;
    className?: string;
    style?: React.CSSProperties;
};

type StandaloneProps = BaseProps & {
    fields: FieldOption[];
    operators?: OperatorOption[];
    values?: Record<string, FieldOption[]>;
    value?: string;
    onChange?: (value: string) => void;
    onSubmit?: (group: ConditionGroup) => void;
};

type ControlledProps = BaseProps & {
    fields?: undefined;
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    getSuggestion?: (text: string) => { completion: string; display: string } | null;
    diagnostics?: Diagnostic[];
};

export type InputProps = StandaloneProps | ControlledProps;

type InputViewProps = {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    placeholder?: string;
    getSuggestion?: (text: string) => { completion: string; display: string } | null;
    diagnostics?: Diagnostic[];
    className?: string;
    style?: React.CSSProperties;
};

export function Input(props: InputProps) {
    if (isStandalone(props)) {
        return <StandaloneInput {...props} />;
    }

    return (
        <InputView
            value={props.value}
            onChange={props.onChange}
            onSubmit={props.onSubmit}
            getSuggestion={props.getSuggestion}
            diagnostics={props.diagnostics}
            placeholder={props.placeholder}
            className={props.className}
            style={props.style}
        />
    );
}

function isStandalone(props: InputProps): props is StandaloneProps {
    return props.fields !== undefined;
}

function buildOverlaySegments(value: string, diagnostics: Diagnostic[]) {
    const sorted = [...diagnostics].sort((a, b) => a.start - b.start);
    const segments: { text: string; diagnostic?: Diagnostic }[] = [];
    let cursor = 0;
    for (const d of sorted) {
        if (d.start > cursor) segments.push({ text: value.slice(cursor, d.start) });
        segments.push({ text: value.slice(d.start, d.end), diagnostic: d });
        cursor = d.end;
    }
    if (cursor < value.length) segments.push({ text: value.slice(cursor) });
    return segments;
}

function StandaloneInput({
    fields,
    operators,
    values,
    value: controlledValue,
    onChange: controlledOnChange,
    onSubmit: onGroupParsed,
    placeholder,
    className,
    style,
}: StandaloneProps) {
    const { text, diagnostics, handleChange, handleSubmit, getSuggestion } = useConditionalInput({
        fields,
        operators,
        values,
        value: controlledValue,
        onChange: controlledOnChange,
        onSubmit: onGroupParsed,
    });

    return (
        <InputView
            value={text}
            onChange={handleChange}
            onSubmit={handleSubmit}
            getSuggestion={getSuggestion}
            diagnostics={diagnostics}
            placeholder={placeholder}
            className={className}
            style={style}
        />
    );
}

function InputView({
    value,
    onChange,
    onSubmit,
    placeholder = "e.g. age greater than 18",
    getSuggestion,
    diagnostics = [],
    className,
    style,
}: InputViewProps) {
    const ghost = useMemo(() => {
        if (!getSuggestion || !value) return null;
        const result = getSuggestion(value);
        return result ? result.completion : null;
    }, [value, getSuggestion]);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange(e.target.value);
        },
        [onChange],
    );

    const acceptGhost = useCallback(() => {
        if (ghost) {
            onChange(value + ghost);
        }
    }, [ghost, value, onChange]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
                e.preventDefault();
                onSubmit();
                return;
            }
            if (e.key === "Tab" && ghost) {
                e.preventDefault();
                acceptGhost();
            }
        },
        [onSubmit, ghost, acceptGhost],
    );

    const hasErrors = diagnostics.length > 0;
    const errorSummary = diagnostics.map((d) => d.message).join("; ");
    const overlaySegments = hasErrors ? buildOverlaySegments(value, diagnostics) : null;

    return (
        <div className={["rcui-input-wrapper", className].filter(Boolean).join(" ")} style={style}>
            <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="rcui-input"
                slotProps={{
                    input: {
                        endAdornment: (
                            <InputAdornment position="end">
                                {hasErrors ? (
                                    <Tooltip title={errorSummary} arrow>
                                        <IconButton size="small" onClick={onSubmit} edge="end">
                                            <ErrorOutlineIcon fontSize="small" className="rcui-adornment-error" />
                                        </IconButton>
                                    </Tooltip>
                                ) : (
                                    <IconButton size="small" onClick={onSubmit} edge="end">
                                        <KeyboardReturnIcon fontSize="small" className="rcui-adornment-enter" />
                                    </IconButton>
                                )}
                            </InputAdornment>
                        ),
                    },
                }}
            />
            <div className="rcui-overlay" aria-hidden="true">
                {(overlaySegments ?? [{ text: value }]).map((seg, i) =>
                    seg.diagnostic ? (
                        <span key={i} className="rcui-squiggly" title={seg.diagnostic.message}>{seg.text}</span>
                    ) : seg.text,
                )}
                {ghost && <span className="rcui-ghost">{ghost}</span>}
            </div>
        </div>
    );
}
