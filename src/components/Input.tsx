import { useCallback, useState, useRef, useLayoutEffect, forwardRef } from "react";
import TextField from "@mui/material/TextField";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import AddIcon from "@mui/icons-material/Add";
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

export type ManagedInputProps = BaseProps & {
    fields: FieldOption[];
    operators?: OperatorOption[];
    value?: string;
    onChange?: (value: string) => void;
    onSubmit?: (group: ConditionGroup) => void;
};

export type ControlledInputProps = BaseProps & {
    fields?: undefined;
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    getSuggestion?: (text: string) => { completion: string; display: string } | null;
    getCompletions?: (text: string, limit?: number) => { completion: string; display: string }[];
    diagnostics?: Diagnostic[];
};

export type InputProps = ManagedInputProps | ControlledInputProps;

type InputViewProps = {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    placeholder?: string;
    getSuggestion?: (text: string) => { completion: string; display: string } | null;
    getCompletions?: (text: string, limit?: number) => { completion: string; display: string }[];
    diagnostics?: Diagnostic[];
    className?: string;
    style?: React.CSSProperties;
};

export function Input(props: InputProps) {
    if (isManaged(props)) {
        return <ManagedInput {...props} />;
    }

    return <ControlledInput {...props} />;
}

export function ControlledInput(props: ControlledInputProps) {
    return (
        <InputView
            value={props.value}
            onChange={props.onChange}
            onSubmit={props.onSubmit}
            getSuggestion={props.getSuggestion}
            getCompletions={props.getCompletions}
            diagnostics={props.diagnostics}
            placeholder={props.placeholder}
            className={props.className}
            style={props.style}
        />
    );
}

function isManaged(props: InputProps): props is ManagedInputProps {
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

// ── Custom input component that renders ghost + squiggly inline ──

type GhostInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    ghost?: string | null;
    diagnosticSegments?: { text: string; diagnostic?: Diagnostic }[] | null;
    inputValue?: string;
    onCursorOffset?: (left: number) => void;
};

const GhostInput = forwardRef<HTMLInputElement, GhostInputProps>(function GhostInput(
    { ghost, diagnosticSegments, inputValue, onCursorOffset, className, ...inputProps },
    ref,
) {
    const innerRef = useRef<HTMLInputElement | null>(null);
    const mirrorRef = useRef<HTMLSpanElement>(null);
    const ghostRef = useRef<HTMLSpanElement>(null);
    const squigglyRef = useRef<HTMLSpanElement>(null);

    useLayoutEffect(() => {
        if (!mirrorRef.current || !innerRef.current) return;
        const padding = parseFloat(getComputedStyle(innerRef.current).paddingLeft) || 0;
        const left = mirrorRef.current.offsetWidth + padding;

        if (ghostRef.current) ghostRef.current.style.left = `${left}px`;
        if (squigglyRef.current) {
            squigglyRef.current.style.paddingLeft = `${padding}px`;
            squigglyRef.current.style.paddingRight = `${padding}px`;
        }
        onCursorOffset?.(left);
    });

    const setRefs = useCallback(
        (el: HTMLInputElement | null) => {
            innerRef.current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
        },
        [ref],
    );

    const showSquiggly = diagnosticSegments && diagnosticSegments.some((s) => s.diagnostic);

    return (
        <div className="rcui-input-inner">
            <input ref={setRefs} className={className} {...inputProps} />
            <span ref={mirrorRef} className="rcui-mirror" aria-hidden="true">
                {inputValue}
            </span>
            {ghost && (
                <span ref={ghostRef} className="rcui-ghost" aria-hidden="true">
                    {ghost}
                </span>
            )}
            {showSquiggly && (
                <span ref={squigglyRef} className="rcui-squiggly-layer" aria-hidden="true">
                    {diagnosticSegments.map((seg, i) =>
                        seg.diagnostic ? (
                            <span key={i} className="rcui-squiggly" title={seg.diagnostic.message}>
                                {seg.text}
                            </span>
                        ) : (
                            <span key={i}>{seg.text}</span>
                        ),
                    )}
                </span>
            )}
        </div>
    );
});

// ── Component variants ──

export function ManagedInput({
    fields,
    operators,
    value: controlledValue,
    onChange: controlledOnChange,
    onSubmit: onGroupParsed,
    placeholder,
    className,
    style,
}: ManagedInputProps) {
    const { text, diagnostics, handleChange, handleSubmit, getSuggestion, getCompletions } =
        useConditionalInput({
            fields,
            operators,
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
            getCompletions={getCompletions}
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
    placeholder = "e.g. age greater than 18 — Control(Option)+Space for suggestions",
    getSuggestion,
    getCompletions,
    diagnostics = [],
    className,
    style,
}: InputViewProps) {
    const [completions, setCompletions] = useState<{ completion: string; display: string }[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [cursorLeft, setCursorLeft] = useState(0);
    const listRef = useRef<HTMLUListElement>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const ghost = getSuggestion && value ? (getSuggestion(value)?.completion ?? null) : null;

    function closeCompletions() {
        setCompletions([]);
        setActiveIndex(-1);
    }

    function handleCompletionsClickAway() {
        if (completions.length === 0) return;
        closeCompletions();
        queueMicrotask(() => inputRef.current?.focus());
    }

    function openCompletions() {
        if (!getCompletions) return;
        const items = getCompletions(value);
        setCompletions(items);
        setActiveIndex(items.length > 0 ? 0 : -1);
    }

    function acceptCompletion(item: { completion: string }) {
        onChange(value + item.completion);
        closeCompletions();
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        onChange(e.target.value);
        closeCompletions();
    }

    function acceptGhost() {
        if (ghost) onChange(value + ghost);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        const isSpace = e.key === " " || e.code === "Space";
        const suggestChord = isSpace && !e.shiftKey && !e.metaKey && (e.ctrlKey || e.altKey);
        if (suggestChord) {
            e.preventDefault();
            openCompletions();
            return;
        }

        if (completions.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => (i + 1) % completions.length);
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => (i - 1 + completions.length) % completions.length);
                return;
            }
            if (e.key === "Enter") {
                e.preventDefault();
                if (activeIndex >= 0) {
                    acceptCompletion(completions[activeIndex]);
                } else {
                    closeCompletions();
                    onSubmit();
                }
                return;
            }
            if (e.key === "Escape") {
                e.preventDefault();
                closeCompletions();
                return;
            }
            if (e.key === "Tab") {
                e.preventDefault();
                if (activeIndex >= 0) {
                    acceptCompletion(completions[activeIndex]);
                }
                return;
            }
        }

        if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
            return;
        }
        if (e.key === "Tab" && ghost) {
            e.preventDefault();
            acceptGhost();
        }
    }

    const hasErrors = diagnostics.length > 0;
    const errorSummary = diagnostics.map((d) => d.message).join("; ");
    const diagnosticSegments = hasErrors ? buildOverlaySegments(value, diagnostics) : null;

    const ghostInputProps = {
        ghost,
        diagnosticSegments,
        inputValue: value,
        onCursorOffset: setCursorLeft,
    };

    return (
        <ClickAwayListener onClickAway={handleCompletionsClickAway}>
            <div
                className={["rcui-input-wrapper", className].filter(Boolean).join(" ")}
                style={style}
            >
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
                            inputRef,
                            inputComponent: GhostInput,
                            inputProps: ghostInputProps,
                            endAdornment: (
                                <InputAdornment position="end">
                                    <Stack direction="row" alignItems="center" spacing={0}>
                                        {getCompletions ? (
                                            <Tooltip title="Show suggestions" arrow>
                                                <IconButton
                                                    size="small"
                                                    aria-label="Show suggestions"
                                                    className="rcui-adornment-suggestions"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        openCompletions();
                                                    }}
                                                >
                                                    <AddIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        ) : null}
                                        {hasErrors ? (
                                            <Tooltip title={errorSummary} arrow>
                                                <IconButton
                                                    size="small"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={onSubmit}
                                                    edge="end"
                                                >
                                                    <ErrorOutlineIcon
                                                        fontSize="small"
                                                        className="rcui-adornment-error"
                                                    />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <IconButton
                                                size="small"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={onSubmit}
                                                edge="end"
                                            >
                                                <KeyboardReturnIcon
                                                    fontSize="small"
                                                    className="rcui-adornment-enter"
                                                />
                                            </IconButton>
                                        )}
                                    </Stack>
                                </InputAdornment>
                            ),
                        },
                    }}
                />
                {completions.length > 0 && (
                    <ul
                        ref={listRef}
                        className="rcui-completions"
                        role="listbox"
                        style={{ left: cursorLeft }}
                    >
                        {completions.map((item, i) => (
                            <li
                                key={item.display}
                                id={`rcui-completion-${i}`}
                                role="option"
                                aria-selected={i === activeIndex}
                                className={`rcui-completion-item${i === activeIndex ? " rcui-completion-item--active" : ""}`}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    acceptCompletion(item);
                                }}
                                onMouseEnter={() => setActiveIndex(i)}
                            >
                                {item.display}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </ClickAwayListener>
    );
}
