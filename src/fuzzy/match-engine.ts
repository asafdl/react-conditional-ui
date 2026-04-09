import Fuse from "fuse.js";
import type { FieldOption, FieldType, OperatorOption, ParsedCondition } from "../types";
import { createLogger } from "../logger";
import { Operator, Value, Field } from "../condition-structure";
import { matchFieldValue } from "./field-value-matcher";
import { adjustOperatorScore } from "./score";
import { stripLeadingNoise } from "./word-utils";

const log = createLogger("match-engine");

type FlatAlias = { alias: string; operator: OperatorOption };
type FuseMatch<T> = { option: T; score: number };
type OpCandidate = {
    match: FuseMatch<OperatorOption>;
    raw: string;
    endIdx: number;
    adjustedScore: number;
};

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

    public parse(text: string): ParsedCondition | null {
        const input = text.trim().toLowerCase();
        if (!input) return null;

        const allWords = input.split(/\s+/);
        const words = stripLeadingNoise(allWords);
        if (words.length === 0) return null;

        const fieldResult = this.identifyField(words);
        if (!fieldResult) return null;

        if (fieldResult.remaining.length === 0) {
            return {
                field: fieldResult.field,
                operator: Operator.invalid(""),
                value: Value.empty(),
                score: fieldResult.fieldScore,
            };
        }

        const { operator, value, operatorScore } = this.resolveOperator(
            fieldResult.remaining,
            fieldResult.fieldOption,
        );

        const result: ParsedCondition = {
            field: fieldResult.field,
            operator,
            value,
            score: fieldResult.fieldScore + operatorScore,
        };

        log(
            "result: field=%s(%s) op=%s(%s) value=%s (valid: %o)",
            result.field.value,
            result.field.label,
            result.operator.value,
            result.operator.label,
            result.value.value,
            {
                field: result.field.isValid,
                op: result.operator.isValid,
                value: result.value.isValid,
            },
        );

        return result;
    }

    public identifyField(words: string[]): {
        field: Field;
        fieldOption: FieldOption;
        fieldScore: number;
        remaining: string[];
    } | null {
        let best: { candidate: string; match: FuseMatch<FieldOption>; wordCount: number } | null =
            null;

        for (let i = words.length; i >= 1; i--) {
            const candidate = words.slice(0, i).join(" ");
            const match = this.matchField(candidate);
            if (match && (!best || match.score < best.match.score)) {
                best = { candidate, match, wordCount: i };
            }
        }

        if (!best) return null;

        return {
            field: new Field(best.candidate, best.match.option.value, best.match.option.label),
            fieldOption: best.match.option,
            fieldScore: best.match.score,
            remaining: words.slice(best.wordCount),
        };
    }

    private resolveOperator(
        words: string[],
        fieldOption: FieldOption,
    ): { operator: Operator; value: Value; operatorScore: number } {
        const candidates = this.getOperatorCandidates(words, fieldOption);

        if (candidates.length === 0) {
            return {
                operator: Operator.invalid(words.join(" ")),
                value: Value.empty(),
                operatorScore: 1,
            };
        }

        for (const candidate of candidates) {
            const valueRaw = words.slice(candidate.endIdx).join(" ");
            const value = matchFieldValue(valueRaw, fieldOption);

            if (value.isValid) {
                const op = candidate.match.option;
                return {
                    operator: new Operator(candidate.raw, op.value, op.label),
                    value,
                    operatorScore: candidate.adjustedScore,
                };
            }

            log(
                "operator '%s' (%s) rejected — value '%s' invalid, trying next",
                candidate.raw,
                candidate.match.option.value,
                valueRaw,
            );
        }

        const best = candidates[0];
        const bestOp = best.match.option;
        const valueRaw = words.slice(best.endIdx).join(" ");
        return {
            operator: new Operator(best.raw, bestOp.value, bestOp.label),
            value: matchFieldValue(valueRaw, fieldOption),
            operatorScore: best.adjustedScore,
        };
    }

    public getOperatorCandidates(words: string[], fieldOption: FieldOption): OpCandidate[] {
        const candidates: OpCandidate[] = [];

        for (let start = 0; start < words.length; start++) {
            for (let end = start + 1; end <= words.length; end++) {
                const opRaw = words.slice(start, end).join(" ");
                const opMatch = this.matchOperator(opRaw, fieldOption);
                if (!opMatch) continue;

                const adjustedScore = adjustOperatorScore(opMatch.score, words, start, end);

                candidates.push({
                    match: opMatch,
                    raw: opRaw,
                    endIdx: end,
                    adjustedScore,
                });
            }
        }

        candidates.sort((a, b) => a.adjustedScore - b.adjustedScore);

        if (candidates.length > 0) {
            log(
                "operator candidates: %o",
                candidates.map(
                    (c) => `${c.raw} -> ${c.match.option.value} (${c.adjustedScore.toFixed(3)})`,
                ),
            );
        }

        return candidates;
    }

    private resolveOpsForField(field: FieldOption, allOps: OperatorOption[]): OperatorOption[] {
        if (field.operators) return field.operators;
        if (field.type) {
            const allowed = TYPE_ALLOWED_OPS[field.type];
            return allOps.filter((op) => allowed.has(op.value));
        }
        return allOps;
    }

    allowedOpsForField(field: FieldOption): OperatorOption[] {
        return this.resolveOpsForField(field, this.operators);
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

    prefixMatch(
        partial: string,
        candidates: string[],
    ): { completion: string; display: string } | null {
        const matches = this.prefixMatches(partial, candidates);
        return matches.length > 0 ? matches[0] : null;
    }

    prefixMatches(
        partial: string,
        candidates: string[],
        limit = 6,
    ): { completion: string; display: string }[] {
        const lower = partial.toLowerCase();
        const results: { completion: string; display: string }[] = [];
        for (const candidate of candidates) {
            const cl = candidate.toLowerCase();
            if (cl.startsWith(lower) && cl !== lower) {
                results.push({ completion: cl.slice(lower.length), display: candidate });
                if (results.length >= limit) break;
            }
        }
        return results;
    }
}
