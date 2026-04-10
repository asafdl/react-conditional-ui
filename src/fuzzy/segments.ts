import { log } from "debug";
import { ParsedCondition, LogicalOperator, ConditionEntry, ConditionGroup } from "../types";
import { scoreConditions } from "./score";
import { powerSet, splitAtIndices } from "./word-utils";
import { AND_CONJUNCTION, OR_CONJUNCTION } from "../consts";
import { generateId } from "../id";
import { ConditionParser } from "../conditions/parser";

type SplitCandidate = {
    segments: string[];
    conditions: ParsedCondition[];
    connector: LogicalOperator;
};

export class SegmentResolver {
    public constructor(private readonly parser: ConditionParser) {}

    public resolve(text: string): {
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
            const single = this.parser.parse(text);
            return {
                segments: [text],
                conditions: single ? [single] : [],
                connector: AND_CONJUNCTION,
            };
        }

        const noSplit = this.parser.parse(text);
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

    public parseConditions(text: string): ConditionGroup | null {
        const input = text.trim();
        if (!input) return null;

        const { conditions, connector } = this.resolve(input);
        if (conditions.length === 0) return null;

        const entries: ConditionEntry[] = conditions.map((condition: ParsedCondition) => ({
            id: generateId(),
            condition,
            connector,
        }));

        return { id: generateId(), entries };
    }

    private parseSegments(segments: string[]): ParsedCondition[] {
        const conditions: ParsedCondition[] = [];
        for (const segment of segments) {
            const previous = conditions[conditions.length - 1] ?? null;
            const result = this.getInherited(segment, previous) ?? this.parser.parse(segment);
            if (result) conditions.push(result);
        }
        return conditions;
    }

    private getInherited(
        segment: string,
        previous: ParsedCondition | null,
    ): ParsedCondition | null {
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
