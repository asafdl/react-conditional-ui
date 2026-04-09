import type { FieldOption } from "../types";

export class Value {
    readonly raw: string;
    readonly value: string;
    readonly label: string;
    readonly isValid: boolean;
    readonly errorMessage: string | null;
    readonly matchedOption: FieldOption | null;

    constructor(
        raw: string,
        opts: {
            isValid: boolean;
            errorMessage?: string | null;
            matchedOption?: FieldOption | null;
        } = { isValid: raw.length > 0 },
    ) {
        this.raw = raw;
        this.isValid = opts.isValid;
        this.errorMessage = opts.errorMessage ?? null;
        this.matchedOption = opts.matchedOption ?? null;
        this.value = this.matchedOption?.value ?? raw;
        this.label = this.matchedOption?.label ?? raw;
    }

    static valid(raw: string, matchedOption?: FieldOption): Value {
        return new Value(raw, { isValid: true, matchedOption });
    }

    static invalid(raw: string, errorMessage: string): Value {
        return new Value(raw, { isValid: false, errorMessage });
    }

    static empty(): Value {
        return new Value("", { isValid: false, errorMessage: "Missing value" });
    }
}
