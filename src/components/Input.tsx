import { useCallback, useState, useEffect, useRef } from "react";
import TextField from "@mui/material/TextField";

export type InputProps = {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    placeholder?: string;
    getSuggestion?: (text: string) => { completion: string; display: string } | null;
    debounceMs?: number;
};

export function Input({
    value,
    onChange,
    onSubmit,
    placeholder = "e.g. age greater than 18",
    getSuggestion,
    debounceMs = 16,
}: InputProps) {
    const [ghost, setGhost] = useState("");
    const [ghostLeft, setGhostLeft] = useState(0);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();
    const inputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const measureTextWidth = useCallback((text: string): number => {
        const el = inputRef.current;
        if (!el) return 0;
        if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
        const ctx = canvasRef.current.getContext("2d")!;
        ctx.font = getComputedStyle(el).font;
        return ctx.measureText(text).width;
    }, []);

    useEffect(() => {
        if (!getSuggestion || !value) {
            setGhost("");
            return;
        }

        setGhost("");
        timerRef.current = setTimeout(() => {
            const result = getSuggestion(value);
            if (result) {
                setGhost(result.completion);
                setGhostLeft(measureTextWidth(value));
            } else {
                setGhost("");
            }
        }, debounceMs);

        return () => clearTimeout(timerRef.current);
    }, [value, getSuggestion, debounceMs, measureTextWidth]);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange(e.target.value);
        },
        [onChange],
    );

    const acceptGhost = useCallback(() => {
        if (ghost) {
            onChange(value + ghost);
            setGhost("");
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
            {ghost && value && (
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
