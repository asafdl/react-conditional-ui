export class Operator {
    readonly raw: string;
    readonly value: string;
    readonly label: string;
    readonly isValid: boolean;

    constructor(raw: string, value: string, label: string) {
        this.raw = raw;
        this.value = value;
        this.label = label;
        this.isValid = value !== "";
    }

    static invalid(raw: string): Operator {
        return new Operator(raw, "", raw);
    }
}
