import Chip from "@mui/material/Chip";
import type { LogicalOperator } from "../types";

export type ConnectorChipProps = {
    connector: LogicalOperator;
    onToggle?: () => void;
};

export function ConnectorChip({ connector, onToggle }: ConnectorChipProps) {
    const chipClass = [
        "rcui-connector-chip",
        onToggle ? "rcui-connector-chip--clickable" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className="rcui-connector">
            <Chip
                label={connector.toUpperCase()}
                size="small"
                variant="filled"
                onClick={onToggle}
                className={chipClass}
            />
        </div>
    );
}
