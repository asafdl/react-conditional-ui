import type {
    FieldOption,
    OperatorOption,
    ParsedCondition,
    ConditionGroup,
    ConditionEntry,
    LogicalOperator,
    Diagnostic,
} from "../types";
import { createLogger } from "../logger";
import { Field, Operator, Value } from "../condition-structure";
import { matchFieldValue } from "./field-value-matcher";
import { generateId } from "../id";
import { MatchEngine, type FuseMatch, stripLeadingNoise } from "./match-engine";

const log = createLogger("parser");
const AND_CONJUNCTION = "and";
const OR_CONJUNCTION = "or";

const AMBIGUOUS_OP_WORDS = new Set(["is", "has"]);
const AMBIGUITY_PENALTY = 0.35;
const LINKING_VERB_PENALTY = 0.35;
const LENGTH_BONUS_PER_WORD = 0.01;
const GAP_PENALTY_PER_WORD = 0.3;

type OpCandidate = {
    match: FuseMatch<OperatorOption>;
    raw: string;
    endIdx: number;
    adjustedScore: number;
};

export class ConditionParser extends MatchEngine {
    constructor(fields: FieldOption[], operators: OperatorOption[]) {
        super(fields, operators);
    }

    private parse(text: string): ParsedCondition | null {
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

    private identifyField(words: string[]): {
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

    private getOperatorCandidates(words: string[], fieldOption: FieldOption): OpCandidate[] {
        const candidates: OpCandidate[] = [];

        for (let start = 0; start < words.length; start++) {
            for (let end = start + 1; end <= words.length; end++) {
                const opRaw = words.slice(start, end).join(" ");
                const opMatch = this.matchOperator(opRaw, fieldOption);
                if (!opMatch) continue;

                let adjustedScore = opMatch.score;

                const firstWord = words[start];
                if (end - start === 1 && AMBIGUOUS_OP_WORDS.has(firstWord)) {
                    adjustedScore += AMBIGUITY_PENALTY;
                } else if (end - start > 1 && AMBIGUOUS_OP_WORDS.has(firstWord)) {
                    adjustedScore += LINKING_VERB_PENALTY;
                }

                adjustedScore -= (end - start) * LENGTH_BONUS_PER_WORD;

                if (start > 0) {
                    adjustedScore += start * GAP_PENALTY_PER_WORD;
                }

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

    private completionsForSegment(
        text: string,
        limit: number,
    ): { completion: string; display: string }[] {
        const input = text.trimStart().toLowerCase();
        if (!input) {
            return this.fields
                .slice(0, limit)
                .map((f) => ({ completion: f.label, display: f.label }));
        }

        const endsWithSpace = /\s$/.test(input);
        const words = input.split(/\s+/).filter(Boolean);
        if (words.length === 0) return [];

        const fieldResult = this.identifyField(words);

        if (!fieldResult) {
            if (endsWithSpace) return [];
            return this.prefixMatches(
                words.join(" "),
                this.fields.map((f) => f.label),
                limit,
            );
        }

        const fieldOption = fieldResult.fieldOption;

        if (fieldResult.remaining.length === 0) {
            if (endsWithSpace) {
                const ops = this.allowedOpsForField(fieldOption);
                return ops
                    .slice(0, limit)
                    .map((op) => ({ completion: op.label, display: op.label }));
            }
            return this.prefixMatches(
                words.join(" "),
                this.fields.map((f) => f.label),
                limit,
            );
        }

        const candidates = this.getOperatorCandidates(fieldResult.remaining, fieldOption);
        const bestOp = candidates[0];

        if (!bestOp || bestOp.endIdx > fieldResult.remaining.length) {
            if (endsWithSpace) return [];
            const ops = this.allowedOpsForField(fieldOption);
            const aliases = ops.flatMap((op) => op.aliases);
            const opPartial = fieldResult.remaining.join(" ");
            return this.prefixMatches(opPartial, aliases, limit);
        }

        const valueRaw = fieldResult.remaining.slice(bestOp.endIdx).join(" ");

        if (!valueRaw) {
            if (endsWithSpace) {
                const fieldValues = fieldOption.fieldValues;
                if (!fieldValues?.length) return [];
                return fieldValues
                    .slice(0, limit)
                    .map((v) => ({ completion: v.label, display: v.label }));
            }
            const ops = this.allowedOpsForField(fieldOption);
            const aliases = ops.flatMap((op) => op.aliases);
            const opPartial = fieldResult.remaining.join(" ");
            return this.prefixMatches(opPartial, aliases, limit);
        }

        if (endsWithSpace) return [];
        const fieldValues = fieldOption.fieldValues;
        if (!fieldValues?.length) return [];
        return this.prefixMatches(
            valueRaw,
            fieldValues.map((v) => v.label),
            limit,
        );
    }

    // ── Public API (compound, completions, diagnostics) ──────────────

    public parseCompound(text: string): ConditionGroup | null {
        const input = text.trim();
        if (!input) return null;

        const { conditions, connector } = this.resolveSegments(input);
        if (conditions.length === 0) return null;

        const entries: ConditionEntry[] = conditions.map((condition) => ({
            id: generateId(),
            condition,
            connector,
        }));

        return { id: generateId(), entries };
    }

    public getCompletions(text: string, limit = 6): { completion: string; display: string }[] {
        const { last, before } = this.splitForSuggestion(text);
        const trailingSpace = /\s$/.test(text) ? " " : "";

        const direct = this.completionsForSegment(last + trailingSpace, limit);
        if (direct.length > 0) return direct;

        if (!before) return [];
        const { conditions } = this.resolveSegments(before);
        const previous = conditions[conditions.length - 1];
        if (!previous) return [];

        const inherited = `${previous.field.raw} ${previous.operator.raw} ${last}${trailingSpace}`;
        return this.completionsForSegment(inherited, limit);
    }

    private splitForSuggestion(text: string): { last: string; before: string | null } {
        const words = text.split(/\s+/);
        for (let i = words.length - 1; i > 0; i--) {
            const lower = words[i].toLowerCase();
            if (lower === AND_CONJUNCTION || lower === OR_CONJUNCTION) {
                const last = words.slice(i + 1).join(" ");
                if (!last) break;
                return {
                    before: words.slice(0, i).join(" "),
                    last,
                };
            }
        }
        return { last: text, before: null };
    }

    public getSuggestion(text: string): { completion: string; display: string } | null {
        if (!text.trim()) return null;
        const results = this.getCompletions(text, 1);
        if (results.length === 0) return null;
        const r = results[0];
        if (r.completion === r.display && /\s$/.test(text)) return null;
        return r;
    }

    public diagnose(text: string): Diagnostic[] {
        const input = text.trim();
        if (!input) return [{ start: 0, end: text.length || 1, message: "Empty condition" }];

        const { segments, conditions } = this.resolveSegments(input);
        const diagnostics: Diagnostic[] = [];

        if (conditions.length === 0) {
            return [
                { start: 0, end: input.length, message: "Could not understand this condition" },
            ];
        }

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const offset = input.toLowerCase().indexOf(seg.toLowerCase());
            const condition = conditions[i];

            if (!condition) {
                diagnostics.push({
                    start: offset,
                    end: offset + seg.length,
                    message: "Could not understand this condition",
                });
                continue;
            }

            if (!condition.operator.isValid) {
                const fieldEnd = offset + condition.field.raw.length;
                const fieldConfig = this.fields.find((f) => f.value === condition.field.value);
                const hasRestriction = fieldConfig?.operators || fieldConfig?.type;
                diagnostics.push({
                    start: fieldEnd,
                    end: offset + seg.length,
                    message: hasRestriction
                        ? `Operator not supported for ${condition.field.label}`
                        : "Unknown operator",
                });
            }

            if (condition.operator.isValid && !condition.value.isValid) {
                if (!condition.value.raw) {
                    diagnostics.push({
                        start: offset + seg.length,
                        end: offset + seg.length + 1,
                        message: "Missing value",
                    });
                } else {
                    const valStart =
                        offset + seg.toLowerCase().lastIndexOf(condition.value.raw.toLowerCase());
                    diagnostics.push({
                        start: valStart,
                        end: valStart + condition.value.raw.length,
                        message:
                            condition.value.errorMessage ??
                            `Value not recognized for ${condition.field.label}`,
                    });
                }
            }
        }

        return diagnostics;
    }

    // ── Compound condition helpers ───────────────────────────────────

    private resolveSegments(text: string): {
        segments: string[];
        conditions: ParsedCondition[];
        connector: LogicalOperator;
    } {
        const originalWords = text.split(/\s+/);
        const lowerWords = originalWords.map((w) => w.toLowerCase());

        const conjIndices: { index: number; conjunction: LogicalOperator }[] = [];
        for (let i = 0; i < lowerWords.length; i++) {
            if (lowerWords[i] === AND_CONJUNCTION || lowerWords[i] === OR_CONJUNCTION) {
                conjIndices.push({ index: i, conjunction: lowerWords[i] as LogicalOperator });
            }
        }

        if (conjIndices.length === 0) {
            const single = this.parse(text);
            return {
                segments: [text],
                conditions: single ? [single] : [],
                connector: AND_CONJUNCTION,
            };
        }

        type SplitCandidate = {
            segments: string[];
            conditions: ParsedCondition[];
            connector: LogicalOperator;
        };

        const noSplit = this.parse(text);
        let best: SplitCandidate = {
            segments: [text],
            conditions: noSplit ? [noSplit] : [],
            connector: AND_CONJUNCTION,
        };
        let bestScore = scoreConditions(best.conditions, 1);

        for (const subset of powerSet(conjIndices)) {
            const connector = subset[0].conjunction;
            if (subset.some((s) => s.conjunction !== connector)) continue;

            const splitIndices = subset.map((s) => s.index);
            const segments = splitAtIndices(originalWords, splitIndices);
            if (segments.some((s) => !s)) continue;

            const conditions = this.parseSegments(segments);
            const score = scoreConditions(conditions, segments.length);

            if (score < bestScore) {
                bestScore = score;
                best = { segments, conditions, connector };
            }
        }

        if (
            best.conditions.length === 1 &&
            best.conditions[0].value.isValid &&
            best.conditions[0].value.matchedOption === null
        ) {
            const valueWords = best.conditions[0].value.raw.split(/\s+/);
            const conjInValue = valueWords.find(
                (w) => w.toLowerCase() === AND_CONJUNCTION || w.toLowerCase() === OR_CONJUNCTION,
            );

            if (conjInValue) {
                const connector = conjInValue.toLowerCase() as LogicalOperator;
                const matching = conjIndices.filter((c) => c.conjunction === connector);

                for (const subset of powerSet(matching).reverse()) {
                    const splitIndices = subset.map((s) => s.index);
                    const segments = splitAtIndices(originalWords, splitIndices);
                    if (segments.some((s) => !s)) continue;

                    const conditions = this.parseSegments(segments);
                    if (
                        conditions.length === segments.length &&
                        conditions.every((c) => c.field.isValid && c.operator.isValid)
                    ) {
                        return { segments, conditions, connector };
                    }
                }
            }
        }

        return best;
    }

    private parseSegments(segments: string[]): ParsedCondition[] {
        const conditions: ParsedCondition[] = [];
        for (const segment of segments) {
            const previous = conditions[conditions.length - 1] ?? null;
            const result = this.getInheritedSegment(segment, previous) ?? this.parse(segment);
            if (result) conditions.push(result);
        }
        return conditions;
    }

    private getInheritedSegment(
        segment: string,
        previous: ParsedCondition | null,
    ): ParsedCondition | null {
        if (!previous) return null;

        const direct = this.parse(segment);
        if (direct && direct.operator.isValid) return direct;

        const inheritField = `${previous.field.raw} ${segment}`;
        const fieldOnly = this.parse(inheritField);
        if (fieldOnly && fieldOnly.operator.isValid) {
            log("inheriting field for segment: %s -> %s", segment, inheritField);
            return fieldOnly;
        }

        const inheritAll = `${previous.field.raw} ${previous.operator.raw} ${segment}`;
        const full = this.parse(inheritAll);
        if (full) {
            log("inheriting field+op for segment: %s -> %s", segment, inheritAll);
            return full;
        }

        return direct;
    }
}

// ── Utility functions ────────────────────────────────────────────────

function powerSet<T>(items: T[]): T[][] {
    const result: T[][] = [];
    const total = 1 << items.length;
    for (let mask = 1; mask < total; mask++) {
        const subset: T[] = [];
        for (let i = 0; i < items.length; i++) {
            if (mask & (1 << i)) subset.push(items[i]);
        }
        result.push(subset);
    }
    return result;
}

function splitAtIndices(words: string[], indices: number[]): string[] {
    const segments: string[] = [];
    let start = 0;
    for (const idx of indices) {
        segments.push(words.slice(start, idx).join(" "));
        start = idx + 1;
    }
    segments.push(words.slice(start).join(" "));
    return segments;
}

const UNPARSED_PENALTY = 10;
const FREETEXT_WORD_COST = 0.1;

function scoreConditions(conditions: ParsedCondition[], segmentCount: number): number {
    const unparsed = segmentCount - conditions.length;
    let score = unparsed * UNPARSED_PENALTY;
    for (const c of conditions) {
        score += c.score;
        if (!c.field.isValid) score += UNPARSED_PENALTY;
        if (!c.operator.isValid) score += UNPARSED_PENALTY;
        if (!c.value.isValid) score += UNPARSED_PENALTY;
        if (c.value.isValid && c.value.matchedOption === null) {
            score += c.value.raw.split(/\s+/).length * FREETEXT_WORD_COST;
        }
    }
    return score;
}
