import type { FieldOption, ParsedCondition } from "../types";
import { createLogger } from "../logger";
import { Operator, Value, Field } from "../condition-structure";
import { stripLeadingNoise } from "../fuzzy/word-utils";
import { MatchEngine } from "../fuzzy/match-engine";
import { ConditionQueryHelper } from "./query-helper";

const log = createLogger("parser");

export class ConditionParser {
    private readonly query: ConditionQueryHelper;

    constructor(engine: MatchEngine, queryHelper?: ConditionQueryHelper) {
        this.query =
            queryHelper ?? new ConditionQueryHelper(engine, engine.fields, engine.operators);
    }

    public parse(text: string): ParsedCondition | null {
        const input = text.trim().toLowerCase();
        if (!input) return null;

        const allWords = input.split(/\s+/);
        const words = stripLeadingNoise(allWords);
        if (words.length === 0) return null;

        const fieldResult = this.query.identifyField(words);
        if (!fieldResult) return null;

        if (fieldResult.remaining.length === 0) {
            return {
                field: new Field(
                    fieldResult.raw,
                    fieldResult.fieldOption.value,
                    fieldResult.fieldOption.label,
                ),
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
            field: new Field(
                fieldResult.raw,
                fieldResult.fieldOption.value,
                fieldResult.fieldOption.label,
            ),
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

    resolveOperator(
        words: string[],
        fieldOption: FieldOption,
    ): { operator: Operator; value: Value; operatorScore: number } {
        const candidates = this.query.getOperatorCandidates(words, fieldOption);
        if (candidates.length > 0) {
            log(
                "operator candidates: %o",
                candidates.map(
                    (c) => `${c.raw} -> ${c.match.option.value} (${c.adjustedScore.toFixed(3)})`,
                ),
            );
        }

        if (candidates.length === 0) {
            return {
                operator: Operator.invalid(words.join(" ")),
                value: Value.empty(),
                operatorScore: 1,
            };
        }

        for (const candidate of candidates) {
            const valueRaw = words.slice(candidate.endIdx).join(" ");
            const value = MatchEngine.matchValue(valueRaw, fieldOption);

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
            value: MatchEngine.matchValue(valueRaw, fieldOption),
            operatorScore: best.adjustedScore,
        };
    }
}
