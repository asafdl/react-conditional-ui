import type { OperatorOption } from "../types";

export class Operator {
    readonly raw: string;
    readonly value: string;
    readonly label: string;
    readonly isValid: boolean;
    readonly score: number;
    readonly option: OperatorOption | null;

    constructor(raw: string, option: OperatorOption | null, score: number) {
        this.raw = raw;
        this.option = option;
        this.value = option?.value ?? "";
        this.label = option?.label ?? raw;
        this.isValid = option !== null;
        this.score = score;
    }

    static invalid(raw: string): Operator {
        return new Operator(raw, null, 1);
    }
}
