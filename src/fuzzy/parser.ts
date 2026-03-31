import type { FieldOption, OperatorOption, ParsedCondition, ConditionGroup, ConditionEntry, LogicalOperator } from "../types";
import { createLogger } from "../logger";
import { Field, Operator, Value } from "../condition-structure";
import { generateId } from "../id";
import { MatchEngine, stripLeadingNoise } from "./match-engine";

const log = createLogger("parser");

export class ConditionParser extends MatchEngine {
    constructor(
        fields: FieldOption[],
        operators: OperatorOption[],
        knownValues?: Record<string, FieldOption[]>,
    ) {
        super(fields, operators, knownValues);
    }

    public parseCompound(text: string): ConditionGroup | null {
        const input = text.trim();
        if (!input) return null;

        const resolved = this.resolveSegments(input);
        if (resolved.length === 0) return null;

        const connector = this.splitOnConjunction(input).connector;
        const entries: ConditionEntry[] = resolved.map((condition) => ({
            id: generateId(),
            condition,
            connector,
        }));

        return { id: generateId(), entries };
    }

    private resolveSegments(text: string): ParsedCondition[] {
        const { segments } = this.splitOnConjunction(text);
        const results: ParsedCondition[] = [];

        for (const segment of segments) {
            let result = this.parse(segment);
            const previous = results[results.length - 1] ?? null;

            if (previous) {
                const isFieldOnly = result && !result.operator.isValid;
                if (!result || isFieldOnly) {
                    const inherited = `${previous.field.raw} ${previous.operator.raw} ${segment}`;
                    log("inheriting field+op for segment: %s -> %s", segment, inherited);
                    const inheritedResult = this.parse(inherited);
                    if (inheritedResult) result = inheritedResult;
                }
            }

            if (result) results.push(result);
        }

        return results;
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

    public getSuggestion(text: string): { completion: string; display: string } | null {
        const { segments } = this.splitOnConjunction(text);
        const last = segments[segments.length - 1];
        const trailingSpace = /\s$/.test(text) ? " " : "";

        const direct = this.suggestForSegment(last + trailingSpace);
        if (direct) return direct;

        if (segments.length < 2) return null;
        const resolved = this.resolveSegments(segments.slice(0, -1).join(" and "));
        const previous = resolved[resolved.length - 1];
        if (!previous) return null;

        const inherited = `${previous.field.raw} ${previous.operator.raw} ${last}${trailingSpace}`;
        return this.suggestForSegment(inherited);
    }

    private suggestForSegment(text: string): { completion: string; display: string } | null {
        const input = text.trimStart().toLowerCase();
        if (!input) return null;

        const endsWithSpace = /\s$/.test(input);
        const words = input.split(/\s+/).filter(Boolean);
        if (words.length === 0) return null;

        const best = this.findBestPartition(words);

        if (!best) {
            if (endsWithSpace) return null;
            return this.prefixMatch(words.join(" "), this.fields.map((f) => f.label));
        }

        if (!best.operator.raw) {
            if (endsWithSpace) {
                const ops = best.field.option.operators ?? this.operators;
                return this.prefixMatch("", ops.flatMap((op) => op.aliases));
            }
            return this.prefixMatch(words.join(" "), this.fields.map((f) => f.label));
        }

        if (!best.valueRaw) {
            if (endsWithSpace) return null;
            const ops = best.field.option.operators ?? this.operators;
            const aliases = ops.flatMap((op) => op.aliases);
            const opPartial = words.slice(words.indexOf(best.operator.raw.split(" ")[0])).join(" ");
            return this.prefixMatch(opPartial || best.operator.raw, aliases);
        }

        if (endsWithSpace) return null;
        const fieldValues = best.field.option.fieldValues ?? this.knownValues?.[best.field.option.value];
        if (!fieldValues?.length) return null;
        return this.prefixMatch(best.valueRaw, fieldValues.map((v) => v.label));
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
}
