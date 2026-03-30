import Fuse from "fuse.js";
import type { FieldOption, OperatorOption, ParsedCondition, ConditionGroup, ConditionEntry, LogicalOperator } from "../types";
import { createLogger } from "../logger";
import { Field, Operator, Value } from "../condition-structure";
import { generateId } from "../id";

const log = createLogger("parser");

type FlatAlias = { alias: string; operator: OperatorOption };

const NOISE_WORDS = new Set([
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

function stripLeadingNoise(words: string[]): string[] {
    let i = 0;
    while (i < words.length && NOISE_WORDS.has(words[i])) i++;
    return words.slice(i);
}

type FuseMatch<T> = { option: T; score: number };
type TaggedMatch<T> = FuseMatch<T> & { raw: string };

type Partition = {
    field: TaggedMatch<FieldOption>;
    operator: TaggedMatch<OperatorOption>;
    valueRaw: string;
    valueWordCount: number;
    skipped: number;
};

type ScoredPartition = Partition & { totalScore: number };

export class ConditionParser {
    private readonly fields: FieldOption[];
    private readonly operators: OperatorOption[];
    private readonly knownValues?: Record<string, FieldOption[]>;

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
            if (field.operators) {
                const aliases: FlatAlias[] = field.operators.flatMap((op) =>
                    op.aliases.map((alias) => ({ alias: alias.toLowerCase(), operator: op })),
                );
                this.perFieldOpFuse.set(
                    field.value,
                    new Fuse(aliases, { keys: ["alias"], threshold: 0.4, includeScore: true }),
                );
            }
        }
    }

    private static readonly CONJUNCTION_RE = /\b(and|or)\b/i;

    public parseCompound(text: string): ConditionGroup | null {
        const input = text.trim();
        if (!input) return null;

        const { segments, connector } = this.splitOnConjunction(input);

        const entries: ConditionEntry[] = [];
        let previous: ParsedCondition | null = null;

        for (const segment of segments) {
            let result = this.parse(segment);

            if (previous) {
                const isFieldOnly = result && !result.operator.isValid;
                if (!result || isFieldOnly) {
                    const inherited = `${previous.field.raw} ${previous.operator.raw} ${segment}`;
                    log("inheriting field+op for segment: %s -> %s", segment, inherited);
                    const inheritedResult = this.parse(inherited);
                    if (inheritedResult) result = inheritedResult;
                }
            }

            if (result) {
                entries.push({
                    id: generateId(),
                    condition: result,
                    connector,
                });
                previous = result;
            }
        }

        if (entries.length === 0) return null;

        return { id: generateId(), entries };
    }

    private splitOnConjunction(text: string): { segments: string[]; connector: LogicalOperator } {
        const lower = text.toLowerCase();
        const words = lower.split(/\s+/);
        const splitIndices: { wordIdx: number; conjunction: LogicalOperator }[] = [];

        for (let wi = 0; wi < words.length; wi++) {
            const w = words[wi];
            if (w !== "and" && w !== "or") continue;
            if (this.isPartOfOperatorAlias(words, wi)) continue;
            splitIndices.push({ wordIdx: wi, conjunction: w as LogicalOperator });
        }

        if (splitIndices.length === 0) {
            return { segments: [text], connector: "and" };
        }

        const connector = splitIndices[0].conjunction;
        const originalWords = text.split(/\s+/);
        const segments: string[] = [];
        let start = 0;

        for (const { wordIdx } of splitIndices) {
            segments.push(originalWords.slice(start, wordIdx).join(" ").trim());
            start = wordIdx + 1;
        }
        if (start < originalWords.length) {
            segments.push(originalWords.slice(start).join(" ").trim());
        }

        const filtered = segments.filter(Boolean);
        if (filtered.length <= 1) {
            return { segments: [text], connector: "and" };
        }

        return { segments: filtered, connector };
    }

    private isPartOfOperatorAlias(words: string[], conjIdx: number): boolean {
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

    public parse(text: string): ParsedCondition | null {
        const input = text.trim().toLowerCase();
        if (!input) return null;

        const allWords = input.split(/\s+/);
        const words = stripLeadingNoise(allWords);
        if (words.length === 0) return null;

        if (allWords.length !== words.length) {
            log("noise stripped: %o -> %o", allWords, words);
        }

        const best = this.findBestPartition(words);
        if (!best) {
            log("no valid partition found for: %s", input);
            return null;
        }

        const fieldValues = best.field.option.fieldValues
            ?? this.knownValues?.[best.field.option.value];

        const result: ParsedCondition = {
            field: new Field(best.field.raw, best.field.option, best.field.score),
            operator: new Operator(
                best.operator.raw,
                best.operator.score < 1 ? best.operator.option : null,
                best.operator.score,
            ),
            value: new Value(best.valueRaw, fieldValues),
        };

        log(
            "result: field=%s(%s) op=%s(%s) value=%s (valid: %o)",
            result.field.value,
            result.field.label,
            result.operator.value,
            result.operator.label,
            result.value.value,
            { field: result.field.isValid, op: result.operator.isValid, value: result.value.isValid },
        );

        return result;
    }

    private findBestPartition(words: string[]): ScoredPartition | null {
        let best: ScoredPartition | null = null;

        for (const partition of this.enumeratePartitions(words)) {
            const scored = this.scorePartition(partition);
            if (!best || scored.totalScore < best.totalScore) {
                log(
                    "new best: [%s] [%s] [%s] (score: %f, skip: %d)",
                    scored.field.raw,
                    scored.operator.raw,
                    scored.valueRaw,
                    scored.totalScore,
                    scored.skipped,
                );
                best = scored;
            }
        }

        return best;
    }

    private *enumeratePartitions(words: string[]): Generator<Partition> {
        const n = words.length;

        for (let i = 1; i <= n; i++) {
            const fieldRaw = words.slice(0, i).join(" ");
            const fieldMatch = this.matchField(fieldRaw);
            if (!fieldMatch) continue;

            if (i === n) {
                const defaultOp = fieldMatch.option.operators?.[0] ?? this.operators[0];
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

    private static readonly SKIP_PENALTY = 0.01;
    private static readonly VALUE_WORD_PENALTY = 0.03;
    private static readonly EMPTY_OP_PENALTY = 1;
    private static readonly EMPTY_VALUE_PENALTY = 0.1;

    private scorePartition(p: Partition): ScoredPartition {
        const valueCost = p.valueRaw
            ? p.valueWordCount * ConditionParser.VALUE_WORD_PENALTY
            : ConditionParser.EMPTY_VALUE_PENALTY;

        return {
            ...p,
            totalScore:
                p.field.score
                + p.operator.score
                + p.skipped * ConditionParser.SKIP_PENALTY
                + valueCost,
        };
    }

    private matchField(
        candidate: string,
    ): FuseMatch<FieldOption> | null {
        for (const f of this.fields) {
            if (candidate === f.label.toLowerCase()) {
                log("field exact match: %s -> %s", candidate, f.value);
                return { option: f, score: 0 };
            }
        }
        const results = this.fieldFuse.search(candidate);
        if (results.length > 0 && (results[0].score ?? 1) <= 0.4) {
            log("field fuzzy match: %s -> %s (score: %f)", candidate, results[0].item.value, results[0].score);
            return { option: results[0].item, score: results[0].score ?? 1 };
        }
        return null;
    }

    public getSuggestion(text: string): { completion: string; display: string } | null {
        const input = text.trimStart().toLowerCase();
        if (!input) return null;

        const endsWithSpace = /\s$/.test(input);
        const words = input.split(/\s+/).filter(Boolean);
        if (words.length === 0) return null;

        // Phase 1: try to match the field from the beginning
        let matchedField: FieldOption | null = null;
        let fieldWordCount = 0;

        for (let i = 1; i <= words.length; i++) {
            const candidate = words.slice(0, i).join(" ");
            const match = this.matchField(candidate);
            if (match && match.score === 0) {
                matchedField = match.option;
                fieldWordCount = i;
            }
        }

        // No field matched yet — suggest a field completion
        if (!matchedField) {
            if (endsWithSpace) return null;
            const partial = words.join(" ");

            for (const f of this.fields) {
                const lower = f.label.toLowerCase();
                if (lower.startsWith(partial) && lower !== partial) {
                    return { completion: lower.slice(partial.length), display: f.label };
                }
            }
            return null;
        }

        const remaining = words.slice(fieldWordCount);

        // Field matched but no trailing space and no more words — user is still on the field token
        if (!endsWithSpace && remaining.length === 0) return null;

        // Phase 2: field matched, try to match operator
        let matchedOp: OperatorOption | null = null;
        let opWordCount = 0;

        const ops = matchedField.operators ?? this.operators;

        for (let i = 1; i <= remaining.length; i++) {
            const candidate = remaining.slice(0, i).join(" ");
            for (const op of ops) {
                for (const alias of op.aliases) {
                    if (candidate === alias.toLowerCase()) {
                        matchedOp = op;
                        opWordCount = i;
                    }
                }
            }
        }

        // No operator matched — suggest one
        if (!matchedOp) {
            const partial = remaining.join(" ");
            if (!partial) return null;
            if (endsWithSpace) return null;

            for (const op of ops) {
                for (const alias of op.aliases) {
                    const lower = alias.toLowerCase();
                    if (lower.startsWith(partial) && lower !== partial) {
                        return { completion: lower.slice(partial.length), display: alias };
                    }
                }
            }
            return null;
        }

        // Operator matched but no trailing space after it — user may still be typing
        if (!endsWithSpace && remaining.length === opWordCount) return null;

        // Phase 3: field + operator matched, suggest a value
        const valueWords = remaining.slice(opWordCount);
        const fieldValues = matchedField.fieldValues ?? this.knownValues?.[matchedField.value];
        if (!fieldValues || fieldValues.length === 0) return null;

        const partial = valueWords.join(" ");
        if (!partial) return null;
        if (endsWithSpace) return null;

        for (const v of fieldValues) {
            const lower = v.label.toLowerCase();
            if (lower.startsWith(partial) && lower !== partial) {
                return { completion: lower.slice(partial.length), display: v.label };
            }
        }
        return null;
    }

    private matchOperator(
        candidate: string,
        field?: FieldOption,
    ): FuseMatch<OperatorOption> | null {
        const ops = field?.operators ?? this.operators;
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
}
