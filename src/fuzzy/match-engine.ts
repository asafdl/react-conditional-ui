import Fuse from "fuse.js";
import type { FieldOption, OperatorOption } from "../types";
import { Value } from "../condition-structure/Value";
import { createLogger } from "../logger";
import { allowedOperatorsForField } from "./operator-policy";

const log = createLogger("match-engine");
const valueLog = createLogger("value");

type FlatAlias = { alias: string; operator: OperatorOption };
export type FuseMatch<T> = { option: T; score: number };

const FUSE_THRESHOLD = 0.4;
const OPERATOR_ALIAS_MIN_COVERAGE = 0.5;

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
            threshold: FUSE_THRESHOLD,
            includeScore: true,
        });

        this.opFuse = this.createOperatorAliasFuse(operators);

        this.perFieldOpFuse = new Map();
        for (const field of fields) {
            const restricted = this.resolveOpsForField(field, operators);
            if (restricted !== operators) {
                this.perFieldOpFuse.set(field.value, this.createOperatorAliasFuse(restricted));
            }
        }
    }

    matchField(candidate: string): FuseMatch<FieldOption> | null {
        const results = this.fieldFuse.search(candidate);
        const best = results[0];
        if (best && MatchEngine.isWithinThreshold(best.score)) {
            log("field match: %s -> %s (score: %f)", candidate, best.item.value, best.score);
            return { option: best.item, score: best.score ?? 1 };
        }
        return null;
    }

    matchOperator(candidate: string, field?: FieldOption): FuseMatch<OperatorOption> | null {
        const fuse = (field && this.perFieldOpFuse.get(field.value)) ?? this.opFuse;
        const results = fuse.search(candidate);
        const best = results[0];
        if (best && MatchEngine.isWithinThreshold(best.score)) {
            const alias = best.item.alias;
            const candidateWords = candidate.split(/\s+/).length;
            const aliasWords = alias.split(/\s+/).length;
            if (candidateWords !== aliasWords) return null;
            if (candidate.length < alias.length * OPERATOR_ALIAS_MIN_COVERAGE) return null;

            log(
                "operator match: %s -> %s (score: %f)",
                candidate,
                best.item.operator.value,
                best.score,
            );
            return { option: best.item.operator, score: best.score ?? 1 };
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
            threshold: FUSE_THRESHOLD,
            includeScore: true,
        });

        const results = fuse.search(raw);
        const best = results[0];
        if (best && MatchEngine.isWithinThreshold(best.score)) {
            valueLog("fuzzy match: raw=%s -> %s (score: %f)", raw, best.item.value, best.score);
            return MatchEngine.applyValidator(raw, best.item, validateValue);
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
        return allowedOperatorsForField(field, allOps);
    }

    private createOperatorAliasFuse(operators: OperatorOption[]): Fuse<FlatAlias> {
        const aliases: FlatAlias[] = operators.flatMap((op) =>
            op.aliases.map((alias) => ({ alias: alias.toLowerCase(), operator: op })),
        );
        return new Fuse(aliases, {
            keys: ["alias"],
            threshold: FUSE_THRESHOLD,
            includeScore: true,
        });
    }

    private static isWithinThreshold(score: number | undefined): boolean {
        return (score ?? 1) <= FUSE_THRESHOLD;
    }
}
