import Fuse from "fuse.js";
import type { FieldOption, FieldType } from "../types";
import { createLogger } from "../logger";

const log = createLogger("value");

export type ValueOptions = {
    knownValues?: FieldOption[];
    fieldType?: FieldType;
    validateValue?: (raw: string) => true | string;
};

export class Value {
    readonly raw: string;
    readonly isValid: boolean;
    readonly score: number;
    readonly matchedOption: FieldOption | null;
    readonly errorMessage: string | null;

    constructor(raw: string, opts: ValueOptions = {}) {
        const { knownValues, fieldType, validateValue } = opts;
        this.raw = raw;

        if (knownValues && knownValues.length > 0) {
            const resolved = this.resolveKnown(raw, knownValues);
            this.matchedOption = resolved.matchedOption;
            this.isValid = resolved.isValid;
            this.score = resolved.score;
            this.errorMessage = resolved.isValid ? null : `Value not recognized`;
            if (resolved.isValid && validateValue) {
                const result = validateValue(raw);
                if (result !== true) {
                    this.isValid = false;
                    this.errorMessage = result;
                }
            }
            return;
        }

        this.matchedOption = null;

        if (raw.length === 0) {
            this.isValid = false;
            this.score = 1;
            this.errorMessage = "Missing value";
            return;
        }

        if (validateValue) {
            const result = validateValue(raw);
            if (result !== true) {
                this.isValid = false;
                this.score = 1;
                this.errorMessage = result;
                return;
            }
            this.isValid = true;
            this.score = 0;
            this.errorMessage = null;
            return;
        }

        if (fieldType === "number" && !isFinite(Number(raw))) {
            this.isValid = false;
            this.score = 1;
            this.errorMessage = "Expected a number";
            log("numeric validation failed: raw=%s", raw);
            return;
        }

        this.isValid = true;
        this.score = 0;
        this.errorMessage = null;
    }

    private resolveKnown(raw: string, knownValues: FieldOption[]) {
        const lower = raw.toLowerCase();
        const exact = knownValues.find(
            (v) => v.value.toLowerCase() === lower || v.label.toLowerCase() === lower,
        );

        if (exact) {
            log("exact match: raw=%s -> %s", raw, exact.value);
            return { matchedOption: exact, isValid: true, score: 0 };
        }

        if (raw.length === 0) {
            return { matchedOption: null, isValid: false, score: 1 };
        }

        const fuse = new Fuse(knownValues, {
            keys: ["label", "value"],
            threshold: 0.4,
            includeScore: true,
        });

        const results = fuse.search(raw);
        if (results.length > 0 && (results[0].score ?? 1) <= 0.4) {
            log(
                "fuzzy match: raw=%s -> %s (score: %f)",
                raw,
                results[0].item.value,
                results[0].score,
            );
            return { matchedOption: results[0].item, isValid: true, score: results[0].score ?? 0 };
        }

        log("no match: raw=%s", raw);
        return { matchedOption: null, isValid: false, score: 1 };
    }

    get label(): string {
        return this.matchedOption?.label ?? this.raw;
    }

    get value(): string {
        return this.matchedOption?.value ?? this.raw;
    }
}
