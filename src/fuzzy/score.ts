import { ParsedCondition } from "../types";

const AMBIGUOUS_OP_WORDS = new Set(["is", "has"]);
const AMBIGUITY_PENALTY = 0.35;
const LINKING_VERB_PENALTY = 0.35;
const LENGTH_BONUS_PER_WORD = 0.01;
const GAP_PENALTY_PER_WORD = 0.3;

const UNPARSED_PENALTY = 10;
const FREETEXT_WORD_COST = 0.1;

export function adjustOperatorScore(
    baseScore: number,
    words: string[],
    start: number,
    end: number,
): number {
    let score = baseScore;

    const firstWord = words[start];
    if (end - start === 1 && AMBIGUOUS_OP_WORDS.has(firstWord)) {
        score += AMBIGUITY_PENALTY;
    } else if (end - start > 1 && AMBIGUOUS_OP_WORDS.has(firstWord)) {
        score += LINKING_VERB_PENALTY;
    }

    score -= (end - start) * LENGTH_BONUS_PER_WORD;

    if (start > 0) {
        score += start * GAP_PENALTY_PER_WORD;
    }

    return score;
}

export function scoreConditions(conditions: ParsedCondition[], segmentCount: number): number {
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
