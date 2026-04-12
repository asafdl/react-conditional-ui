import { adjustOperatorScore } from "../fuzzy/score";
import { allowedOperatorsForField } from "../fuzzy/operator-policy";
import { MatchEngine, type FuseMatch } from "../fuzzy/match-engine";
import type { FieldOption, OperatorOption } from "../types";

export type FieldResolution = {
    raw: string;
    fieldOption: FieldOption;
    fieldScore: number;
    remaining: string[];
};

export type OperatorCandidate = {
    match: FuseMatch<OperatorOption>;
    raw: string;
    endIdx: number;
    adjustedScore: number;
};

export class ConditionQueryHelper {
    public constructor(
        private readonly engine: MatchEngine,
        private readonly fields: FieldOption[],
        private readonly operators: OperatorOption[],
    ) {}

    public getFields(): FieldOption[] {
        return this.fields;
    }

    public findFieldByValue(value: string): FieldOption | undefined {
        return this.fields.find((field) => field.value === value);
    }

    public identifyField(words: string[]): FieldResolution | null {
        let best: { candidate: string; match: FuseMatch<FieldOption>; wordCount: number } | null =
            null;

        for (let i = words.length; i >= 1; i--) {
            const candidate = words.slice(0, i).join(" ");
            const match = this.engine.matchField(candidate);
            if (match && (!best || match.score < best.match.score)) {
                best = { candidate, match, wordCount: i };
            }
        }

        if (!best) return null;

        return {
            raw: best.candidate,
            fieldOption: best.match.option,
            fieldScore: best.match.score,
            remaining: words.slice(best.wordCount),
        };
    }

    public getOperatorCandidates(words: string[], fieldOption: FieldOption): OperatorCandidate[] {
        const candidates: OperatorCandidate[] = [];

        for (let start = 0; start < words.length; start++) {
            for (let end = start + 1; end <= words.length; end++) {
                const opRaw = words.slice(start, end).join(" ");
                const opMatch = this.engine.matchOperator(opRaw, fieldOption);
                if (!opMatch) continue;

                candidates.push({
                    match: opMatch,
                    raw: opRaw,
                    endIdx: end,
                    adjustedScore: adjustOperatorScore(opMatch.score, words, start, end),
                });
            }
        }

        candidates.sort((a, b) => a.adjustedScore - b.adjustedScore);
        return candidates;
    }

    public allowedOpsForField(field: FieldOption): OperatorOption[] {
        return allowedOperatorsForField(field, this.operators);
    }

    public prefixMatches(
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
