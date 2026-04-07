import Fuse from "fuse.js";
import type { FieldOption, FieldType, OperatorOption } from "../types";
import { createLogger } from "../logger";

const log = createLogger("match-engine");

export type FlatAlias = { alias: string; operator: OperatorOption };
export type FuseMatch<T> = { option: T; score: number };
export type TaggedMatch<T> = FuseMatch<T> & { raw: string };

export type Partition = {
    field: TaggedMatch<FieldOption>;
    operator: TaggedMatch<OperatorOption>;
    valueRaw: string;
    valueWordCount: number;
    skipped: number;
};

export type ScoredPartition = Partition & { totalScore: number };

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

export function stripLeadingNoise(words: string[]): string[] {
    let i = 0;
    while (i < words.length && NOISE_WORDS.has(words[i])) i++;
    return words.slice(i);
}

const TYPE_ALLOWED_OPS: Record<FieldType, Set<string>> = {
    number: new Set(["eq", "ne", "gt", "lt", "gte", "lte"]),
    enum: new Set(["eq", "ne"]),
    text: new Set(["eq", "ne", "contains", "starts_with"]),
};

export class MatchEngine {
    protected readonly fields: FieldOption[];
    protected readonly operators: OperatorOption[];
    protected readonly knownValues?: Record<string, FieldOption[]>;

    private readonly fieldFuse: Fuse<FieldOption>;
    private readonly opFuse: Fuse<FlatAlias>;
    private readonly perFieldOpFuse: Map<string, Fuse<FlatAlias>>;

    constructor(
        fields: FieldOption[],
        operators: OperatorOption[],
        knownValues?: Record<string, FieldOption[]>,
    ) {
        this.fields = fields;
        this.operators = operators;
        this.knownValues = knownValues;

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
        for (const f of this.fields) {
            if (candidate === f.label.toLowerCase()) {
                log("field exact match: %s -> %s", candidate, f.value);
                return { option: f, score: 0 };
            }
        }
        const results = this.fieldFuse.search(candidate);
        if (results.length > 0 && (results[0].score ?? 1) <= 0.4) {
            log(
                "field fuzzy match: %s -> %s (score: %f)",
                candidate,
                results[0].item.value,
                results[0].score,
            );
            return { option: results[0].item, score: results[0].score ?? 1 };
        }
        return null;
    }

    matchOperator(candidate: string, field?: FieldOption): FuseMatch<OperatorOption> | null {
        const ops = field ? this.allowedOpsForField(field) : this.operators;
        for (const op of ops) {
            for (const alias of op.aliases) {
                if (candidate === alias.toLowerCase()) {
                    log("operator exact match: %s -> %s", candidate, op.value);
                    return { option: op, score: 0 };
                }
            }
        }
        const fuse = (field && this.perFieldOpFuse.get(field.value)) ?? this.opFuse;
        const results = fuse.search(candidate);
        if (results.length > 0 && (results[0].score ?? 1) <= 0.4) {
            log(
                "operator fuzzy match: %s -> %s (score: %f)",
                candidate,
                results[0].item.operator.value,
                results[0].score,
            );
            return { option: results[0].item.operator, score: results[0].score ?? 1 };
        }
        return null;
    }

    isPartOfOperatorAlias(words: string[], conjIdx: number): boolean {
        for (const op of this.operators) {
            for (const alias of op.aliases) {
                const aliasWords = alias.toLowerCase().split(/\s+/);
                const conjPos = aliasWords.indexOf(words[conjIdx]);
                if (conjPos === -1) continue;

                const startInInput = conjIdx - conjPos;
                if (startInInput < 0 || startInInput + aliasWords.length > words.length) continue;

                const slice = words.slice(startInInput, startInInput + aliasWords.length);
                if (slice.every((w, i) => w === aliasWords[i])) return true;
            }
        }
        return false;
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

    private static readonly SKIP_PENALTY = 0.01;
    private static readonly VALUE_WORD_PENALTY = 0.03;
    private static readonly EMPTY_VALUE_PENALTY = 0.1;

    scorePartition(p: Partition): ScoredPartition {
        const valueCost = p.valueRaw
            ? p.valueWordCount * MatchEngine.VALUE_WORD_PENALTY
            : MatchEngine.EMPTY_VALUE_PENALTY;

        return {
            ...p,
            totalScore:
                p.field.score + p.operator.score + p.skipped * MatchEngine.SKIP_PENALTY + valueCost,
        };
    }

    *enumeratePartitions(words: string[]): Generator<Partition> {
        const n = words.length;

        for (let i = 1; i <= n; i++) {
            const fieldRaw = words.slice(0, i).join(" ");
            const fieldMatch = this.matchField(fieldRaw);
            if (!fieldMatch) continue;

            if (i === n) {
                const defaultOp =
                    this.allowedOpsForField(fieldMatch.option)[0] ?? this.operators[0];
                yield {
                    field: { ...fieldMatch, raw: fieldRaw },
                    operator: { option: defaultOp, score: 1, raw: "" },
                    valueRaw: "",
                    valueWordCount: 0,
                    skipped: 0,
                };
                continue;
            }

            for (let j = i; j < n; j++) {
                for (let k = j + 1; k <= n; k++) {
                    const opRaw = words.slice(j, k).join(" ");
                    const opMatch = this.matchOperator(opRaw, fieldMatch.option);
                    if (!opMatch) continue;

                    yield {
                        field: { ...fieldMatch, raw: fieldRaw },
                        operator: { ...opMatch, raw: opRaw },
                        valueRaw: words.slice(k).join(" "),
                        valueWordCount: n - k,
                        skipped: j - i,
                    };
                }
            }
        }
    }

    findBestPartition(words: string[]): ScoredPartition | null {
        let best: ScoredPartition | null = null;

        for (const partition of this.enumeratePartitions(words)) {
            const scored = this.scorePartition(partition);
            if (!best || scored.totalScore < best.totalScore) {
                best = scored;
            }
        }

        return best;
    }
}
