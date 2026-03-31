import { useCallback, useMemo, useLayoutEffect, useState, useRef } from "react";
import TextField from "@mui/material/TextField";

export type InputProps = {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    placeholder?: string;
    getSuggestion?: (text: string) => { completion: string; display: string } | null;
};

export function Input({
    value,
    onChange,
    onSubmit,
    placeholder = "e.g. age greater than 18",
    getSuggestion,
}: InputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [ghostLeft, setGhostLeft] = useState(0);

    const ghost = useMemo(() => {
        if (!getSuggestion || !value) return null;
        const result = getSuggestion(value);
        return result ? result.completion : null;
    }, [value, getSuggestion]);

    useLayoutEffect(() => {
        if (!ghost || !inputRef.current) return;
        if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
        const ctx = canvasRef.current.getContext("2d")!;
        ctx.font = getComputedStyle(inputRef.current).font;
        setGhostLeft(ctx.measureText(value).width);
    }, [ghost, value]);

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

    return (
        <div className="rcui-input-wrapper">
            <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="rcui-input"
                inputRef={inputRef}
            />
            {ghost && (
                <span
                    className="rcui-ghost"
                    aria-hidden="true"
                    style={{ left: ghostLeft }}
                >
                    {ghost}
                </span>
            )}
        </div>
    );
}
