import { useCallback } from "react";
import TextField from "@mui/material/TextField";

export type InputProps = {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
};

export function Input({ value, onChange, onSubmit }: InputProps) {
    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange(e.target.value);
        },
        [onChange],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
                e.preventDefault();
                onSubmit();
            }
        },
        [onSubmit],
    );

    return (
        <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="e.g. age greater than 18"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
        />
    );
}
