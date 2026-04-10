import Fuse from "fuse.js";
import type { FieldOption, FieldType, OperatorOption } from "../types";
import { Value } from "../condition-structure/Value";
import { createLogger } from "../logger";

const log = createLogger("match-engine");
const valueLog = createLogger("value");

type FlatAlias = { alias: string; operator: OperatorOption };
export type FuseMatch<T> = { option: T; score: number };

const TYPE_ALLOWED_OPS: Record<FieldType, Set<string>> = {
    number: new Set(["eq", "ne", "gt", "lt", "gte", "lte"]),
    enum: new Set(["eq", "ne"]),
    text: new Set(["eq", "ne", "contains", "starts_with"]),
};

export class MatchEngine {
    readonly fields: FieldOption[];
    readonly operators: OperatorOption[];

    private readonly fieldFuse: Fuse<FieldOption>;
    private readonly opFuse: Fuse<FlatAlias>;
    private readonly perFieldOpFuse: Map<string, Fuse<FlatAlias>>;

    constructor(fields: FieldOption[], operators: OperatorOption[]) {
        this.fields = fields;
        this.operators = operators;

        this.fieldFuse = new Fuse(fields, {
            keys: ["label"],
            threshold: 0.4,
            includeScore: true,
        });

        const flatAliases: FlatAlias[] = operators.flatMap((op) =>
            op.aliases.map((alias) => ({ alias: alias.toLowerCase(), operator: op })),
        );
        this.opFuse = new Fuse(flatAliases, {
            keys: ["alias"],
            threshold: 0.4,
            includeScore: true,
        });

        this.perFieldOpFuse = new Map();
        for (const field of fields) {
            const restricted = this.resolveOpsForField(field, operators);
            if (restricted !== operators) {
                const aliases: FlatAlias[] = restricted.flatMap((op) =>
                    op.aliases.map((alias) => ({ alias: alias.toLowerCase(), operator: op })),
                );
                this.perFieldOpFuse.set(
                    field.value,
                    new Fuse(aliases, { keys: ["alias"], threshold: 0.4, includeScore: true }),
                );
            }
        }
    }

    matchField(candidate: string): FuseMatch<FieldOption> | null {
        const results = this.fieldFuse.search(candidate);
        if (results.length > 0 && (results[0].score ?? 1) <= 0.4) {
            log(
                "field match: %s -> %s (score: %f)",
                candidate,
                results[0].item.value,
                results[0].score,
            );
            return { option: results[0].item, score: results[0].score ?? 1 };
        }
        return null;
    }

    matchOperator(candidate: string, field?: FieldOption): FuseMatch<OperatorOption> | null {
        const fuse = (field && this.perFieldOpFuse.get(field.value)) ?? this.opFuse;
        const results = fuse.search(candidate);
        if (results.length > 0 && (results[0].score ?? 1) <= 0.4) {
            const alias = results[0].item.alias;
            const candidateWords = candidate.split(/\s+/).length;
            const aliasWords = alias.split(/\s+/).length;
            if (candidateWords !== aliasWords) return null;
            if (candidate.length < alias.length * 0.5) return null;

            log(
                "operator match: %s -> %s (score: %f)",
                candidate,
                results[0].item.operator.value,
                results[0].score,
            );
            return { option: results[0].item.operator, score: results[0].score ?? 1 };
        }
        return null;
    }

    static matchValue(raw: string, fieldConfig?: FieldOption): Value {
        const knownValues = fieldConfig?.fieldValues;
        const validateValue = fieldConfig?.validateValue;
        const fieldType = fieldConfig?.type;

        if (knownValues && knownValues.length > 0) {
            return MatchEngine.matchKnownValue(raw, knownValues, validateValue);
        }

        if (raw.length === 0) return Value.empty();

        if (validateValue) {
            const result = validateValue(raw);
            if (result !== true) return Value.invalid(raw, result);
            return Value.valid(raw);
        }

        if (fieldType === "number" && !isFinite(Number(raw))) {
            valueLog("numeric validation failed: raw=%s", raw);
            return Value.invalid(raw, "Expected a number");
        }

        return Value.valid(raw);
    }

    private static matchKnownValue(
        raw: string,
        knownValues: FieldOption[],
        validateValue?: (raw: string) => true | string,
    ): Value {
        const lower = raw.toLowerCase();
        const exact = knownValues.find(
            (v) => v.value.toLowerCase() === lower || v.label.toLowerCase() === lower,
        );

        if (exact) {
            valueLog("exact match: raw=%s -> %s", raw, exact.value);
            return MatchEngine.applyValidator(raw, exact, validateValue);
        }

        if (raw.length === 0) return Value.invalid(raw, "Value not recognized");

        const fuse = new Fuse(knownValues, {
            keys: ["label", "value"],
            threshold: 0.4,
            includeScore: true,
        });

        const results = fuse.search(raw);
        if (results.length > 0 && (results[0].score ?? 1) <= 0.4) {
            valueLog(
                "fuzzy match: raw=%s -> %s (score: %f)",
                raw,
                results[0].item.value,
                results[0].score,
            );
            return MatchEngine.applyValidator(raw, results[0].item, validateValue);
        }

        valueLog("no match: raw=%s", raw);
        return Value.invalid(raw, "Value not recognized");
    }

    private static applyValidator(
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

    private resolveOpsForField(field: FieldOption, allOps: OperatorOption[]): OperatorOption[] {
        if (field.operators) return field.operators;
        if (field.type) {
            const allowed = TYPE_ALLOWED_OPS[field.type];
            return allOps.filter((op) => allowed.has(op.value));
        }
        return allOps;
    }
}
