import Fuse from "fuse.js";
import type { FieldOption } from "../types";
import { Value } from "../condition-structure/Value";
import { createLogger } from "../logger";

const log = createLogger("value");

export function matchFieldValue(raw: string, fieldConfig?: FieldOption): Value {
    const knownValues = fieldConfig?.fieldValues;
    const validateValue = fieldConfig?.validateValue;
    const fieldType = fieldConfig?.type;

    if (knownValues && knownValues.length > 0) {
        return matchKnown(raw, knownValues, validateValue);
    }

    if (raw.length === 0) {
        return Value.empty();
    }

    if (validateValue) {
        const result = validateValue(raw);
        if (result !== true) return Value.invalid(raw, result);
        return Value.valid(raw);
    }

    if (fieldType === "number" && !isFinite(Number(raw))) {
        log("numeric validation failed: raw=%s", raw);
        return Value.invalid(raw, "Expected a number");
    }

    return Value.valid(raw);
}

function matchKnown(
    raw: string,
    knownValues: FieldOption[],
    validateValue?: (raw: string) => true | string,
): Value {
    const lower = raw.toLowerCase();
    const exact = knownValues.find(
        (v) => v.value.toLowerCase() === lower || v.label.toLowerCase() === lower,
    );

    if (exact) {
        log("exact match: raw=%s -> %s", raw, exact.value);
        return applyValidator(raw, exact, validateValue);
    }

    if (raw.length === 0) {
        return Value.invalid(raw, "Value not recognized");
    }

    const fuse = new Fuse(knownValues, {
        keys: ["label", "value"],
        threshold: 0.4,
        includeScore: true,
    });

    const results = fuse.search(raw);
    if (results.length > 0 && (results[0].score ?? 1) <= 0.4) {
        log("fuzzy match: raw=%s -> %s (score: %f)", raw, results[0].item.value, results[0].score);
        return applyValidator(raw, results[0].item, validateValue);
    }

    log("no match: raw=%s", raw);
    return Value.invalid(raw, "Value not recognized");
}

function applyValidator(
    raw: string,
    matched: FieldOption,
    validateValue?: (raw: string) => true | string,
): Value {
    if (validateValue) {
        const result = validateValue(raw);
        if (result !== true) return Value.invalid(raw, result);
    }
    return Value.valid(raw, matched);
}
