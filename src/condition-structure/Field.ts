import type { FieldOption } from "../types";

export class Field {
    readonly raw: string;
    readonly value: string;
    readonly label: string;
    readonly isValid: boolean;
    readonly score: number;
    readonly option: FieldOption | null;

    constructor(raw: string, option: FieldOption | null, score: number) {
        this.raw = raw;
        this.option = option;
        this.value = option?.value ?? "";
        this.label = option?.label ?? raw;
        this.isValid = option !== null;
        this.score = score;
    }

    static invalid(raw: string): Field {
        return new Field(raw, null, 1);
    }
}
