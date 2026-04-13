import { log } from "debug";
import type { ParsedCondition, LogicalOperator, ConditionEntry, ConditionGroup } from "../types";
import { scoreConditions, type ScoredCondition } from "./score";
import { powerSet, splitAtIndices } from "./word-utils";
import { AND_CONJUNCTION, OR_CONJUNCTION } from "../consts";
import { generateId } from "../id";
import { ConditionParser } from "../conditions/parser";

type SplitCandidate = {
    segments: string[];
    conditions: ScoredCondition[];
    connector: LogicalOperator;
};

type ConjunctionIndex = { index: number; conjunction: LogicalOperator };

export class SegmentResolver {
    public constructor(private readonly parser: ConditionParser) {}

    public resolve(text: string): {
        segments: string[];
        conditions: ScoredCondition[];
        connector: LogicalOperator;
    } {
        const originalWords = text.split(/\s+/);
        const lowerWords = originalWords.map((w) => w.toLowerCase());
        const conjIndices = this.findConjunctionIndices(lowerWords);
        const fallback = this.createSingleCandidate(text);
        if (conjIndices.length === 0) {
            return fallback;
        }

        let best: SplitCandidate = fallback;
        let bestScore = scoreConditions(best.conditions, 1);

        for (const subset of powerSet(conjIndices)) {
            const connector = subset[0].conjunction;
            if (subset.some((s) => s.conjunction !== connector)) continue;
            const next = this.buildSplitCandidate(originalWords, subset, connector);
            if (!next) continue;
            const { segments, conditions } = next;
            const score = scoreConditions(conditions, segments.length);

            if (score < bestScore) {
                bestScore = score;
                best = { segments, conditions, connector };
            }
        }

        return this.trySplitFromValueConjunction(best, originalWords, conjIndices) ?? best;
    }

    public parseConditions(text: string): ConditionGroup | null {
        const input = text.trim();
        if (!input) return null;

        const { conditions, connector } = this.resolve(input);
        if (conditions.length === 0) return null;

        const entries: ConditionEntry[] = conditions.map(
            ({ score: _score, ...condition }): ConditionEntry => ({
                id: generateId(),
                condition,
                connector,
            }),
        );

        return { id: generateId(), entries };
    }

    private parseSegments(segments: string[]): ScoredCondition[] {
        const conditions: ScoredCondition[] = [];
        for (const segment of segments) {
            const previous = conditions[conditions.length - 1] ?? null;
            const result = this.getInherited(segment, previous) ?? this.parser.parse(segment);
            if (result) conditions.push(result);
        }
        return conditions;
    }

    private createSingleCandidate(text: string): SplitCandidate {
        const parsed = this.parser.parse(text);
        return {
            segments: [text],
            conditions: parsed ? [parsed] : ([] as ScoredCondition[]),
            connector: AND_CONJUNCTION,
        };
    }

    private findConjunctionIndices(words: string[]): ConjunctionIndex[] {
        const indices: ConjunctionIndex[] = [];
        for (let i = 0; i < words.length; i++) {
            if (words[i] === AND_CONJUNCTION || words[i] === OR_CONJUNCTION) {
                indices.push({ index: i, conjunction: words[i] as LogicalOperator });
            }
        }
        return indices;
    }

    private buildSplitCandidate(
        originalWords: string[],
        splitPoints: ConjunctionIndex[],
        connector: LogicalOperator,
    ): SplitCandidate | null {
        const splitIndices = splitPoints.map((s) => s.index);
        const segments = splitAtIndices(originalWords, splitIndices);
        if (segments.some((s) => !s)) return null;

        return {
            segments,
            conditions: this.parseSegments(segments),
            connector,
        };
    }

    private trySplitFromValueConjunction(
        best: SplitCandidate,
        originalWords: string[],
        conjIndices: ConjunctionIndex[],
    ): SplitCandidate | null {
        const onlyCondition = best.conditions[0];
        if (
            best.conditions.length !== 1 ||
            !onlyCondition?.value.isValid ||
            onlyCondition.value.matchedOption !== null
        ) {
            return null;
        }

        const valueWords = onlyCondition.value.raw.split(/\s+/);
        const conjInValue = valueWords.find(
            (w) => w.toLowerCase() === AND_CONJUNCTION || w.toLowerCase() === OR_CONJUNCTION,
        );
        if (!conjInValue) return null;

        const connector = conjInValue.toLowerCase() as LogicalOperator;
        const matching = conjIndices.filter((c) => c.conjunction === connector);

        for (const subset of powerSet(matching).reverse()) {
            const candidate = this.buildSplitCandidate(originalWords, subset, connector);
            if (!candidate) continue;

            if (
                candidate.conditions.length === candidate.segments.length &&
                candidate.conditions.every((c) => c.field.isValid && c.operator.isValid)
            ) {
                return candidate;
            }
        }

        return null;
    }

    private getInherited(
        segment: string,
        previous: ScoredCondition | null,
    ): ScoredCondition | null {
        if (!previous) return null;

        const direct = this.parser.parse(segment);
        if (direct && direct.operator.isValid) return direct;

        const inheritField = `${previous.field.raw} ${segment}`;
        const fieldOnly = this.parser.parse(inheritField);
        if (fieldOnly && fieldOnly.operator.isValid) {
            log("inheriting field for segment: %s -> %s", segment, inheritField);
            return fieldOnly;
        }

        const inheritAll = `${previous.field.raw} ${previous.operator.raw} ${segment}`;
        const full = this.parser.parse(inheritAll);
        if (full) {
            log("inheriting field+op for segment: %s -> %s", segment, inheritAll);
            return full;
        }

        return direct;
    }
}
