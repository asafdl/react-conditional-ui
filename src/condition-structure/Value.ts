import Fuse from "fuse.js";
import type { FieldOption } from "../types";
import { createLogger } from "../logger";

const log = createLogger("value");

export class Value {
    readonly raw: string;
    readonly isValid: boolean;
    readonly score: number;
    readonly matchedOption: FieldOption | null;

    constructor(raw: string, knownValues?: FieldOption[]) {
        this.raw = raw;

        if (!knownValues || knownValues.length === 0) {
            this.isValid = raw.length > 0;
            this.matchedOption = null;
            this.score = this.isValid ? 0 : 1;
            return;
        }

        const lower = raw.toLowerCase();
        const exact = knownValues.find(
            (v) => v.value.toLowerCase() === lower || v.label.toLowerCase() === lower,
        );

        if (exact) {
            this.matchedOption = exact;
            this.isValid = true;
            this.score = 0;
            log("exact match: raw=%s -> %s", raw, exact.value);
            return;
        }

        if (raw.length === 0) {
            this.matchedOption = null;
            this.isValid = false;
            this.score = 1;
            return;
        }

        const fuse = new Fuse(knownValues, {
            keys: ["label", "value"],
            threshold: 0.4,
            includeScore: true,
        });

        const results = fuse.search(raw);
        if (results.length > 0 && (results[0].score ?? 1) <= 0.4) {
            this.matchedOption = results[0].item;
            this.isValid = true;
            this.score = results[0].score ?? 0;
            log("fuzzy match: raw=%s -> %s (score: %f)", raw, this.matchedOption.value, this.score);
        } else {
            this.matchedOption = null;
            this.isValid = false;
            this.score = 1;
            log("no match: raw=%s", raw);
        }
    }

    get label(): string {
        return this.matchedOption?.label ?? this.raw;
    }

    get value(): string {
        return this.matchedOption?.value ?? this.raw;
    }
}
