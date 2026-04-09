import Fuse from "fuse.js";
import type { FieldOption, FieldType, OperatorOption } from "../types";
import { createLogger } from "../logger";

const log = createLogger("match-engine");

export type FlatAlias = { alias: string; operator: OperatorOption };
export type FuseMatch<T> = { option: T; score: number };

export const NOISE_WORDS = new Set([
    "when",
    "if",
    "the",
    "where",
    "show",
    "that",
    "then",
    "a",
    "an",
    "for",
    "while",
    "can",
    "expect",
    "check",
    "verify",
    "ensure",
    "find",
    "get",
    "list",
    "filter",
    "only",
    "all",
    "with",
    "having",
    "whose",
    "which",
    "given",
    "assuming",
    "suppose",
    "i",
    "want",
    "need",
    "like",
    "please",
    "me",
    "my",
]);

const TYPE_ALLOWED_OPS: Record<FieldType, Set<string>> = {
    number: new Set(["eq", "ne", "gt", "lt", "gte", "lte"]),
    enum: new Set(["eq", "ne"]),
    text: new Set(["eq", "ne", "contains", "starts_with"]),
};

export function stripLeadingNoise(words: string[]): string[] {
    let i = 0;
    while (i < words.length && NOISE_WORDS.has(words[i])) i++;
    const result = words.slice(i);
    if (result.length !== words.length) {
        log("noise stripped: %o -> %o", words, result);
    }
    return result;
}

export class MatchEngine {
    protected readonly fields: FieldOption[];
    protected readonly operators: OperatorOption[];

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
