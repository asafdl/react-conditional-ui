import { AND_CONJUNCTION, OR_CONJUNCTION } from "../../consts";
import { ConditionParser } from "../../conditions/parser";
import { SegmentResolver } from "../segments";

export class SuggestionsProvider {
    public constructor(
        private readonly parser: ConditionParser,
        private readonly segmentResolver: SegmentResolver,
    ) {}

    public getCompletions(text: string, limit = 6): { completion: string; display: string }[] {
        const { last, before } = this.splitForSuggestion(text);
        const trailingSpace = /\s$/.test(text) ? " " : "";

        const direct = this.completionsForSegment(last + trailingSpace, limit);
        if (direct.length > 0) return direct;

        if (!before) return [];
        const { conditions } = this.segmentResolver.resolve(before);
        const previous = conditions[conditions.length - 1];
        if (!previous) return [];

        const inherited = `${previous.field.raw} ${previous.operator.raw} ${last}${trailingSpace}`;
        return this.completionsForSegment(inherited, limit);
    }

    public getSuggestion(text: string): { completion: string; display: string } | null {
        if (!text.trim()) return null;
        const results = this.getCompletions(text, 1);
        if (results.length === 0) return null;
        const r = results[0];
        if (r.completion === r.display && /\s$/.test(text)) return null;
        return r;
    }

    private completionsForSegment(
        text: string,
        limit: number,
    ): { completion: string; display: string }[] {
        const input = text.trimStart().toLowerCase();
        if (!input) {
            return this.parser.fields
                .slice(0, limit)
                .map((f) => ({ completion: f.label, display: f.label }));
        }

        const endsWithSpace = /\s$/.test(input);
        const words = input.split(/\s+/).filter(Boolean);
        if (words.length === 0) return [];

        const fieldResult = this.parser.identifyField(words);

        if (!fieldResult) {
            if (endsWithSpace) return [];
            return this.parser.prefixMatches(
                words.join(" "),
                this.parser.fields.map((f) => f.label),
                limit,
            );
        }

        const fieldOption = fieldResult.fieldOption;

        if (fieldResult.remaining.length === 0) {
            if (endsWithSpace) {
                const ops = this.parser.allowedOpsForField(fieldOption);
                return ops
                    .slice(0, limit)
                    .map((op) => ({ completion: op.label, display: op.label }));
            }
            return this.parser.prefixMatches(
                words.join(" "),
                this.parser.fields.map((f) => f.label),
                limit,
            );
        }

        const candidates = this.parser.getOperatorCandidates(fieldResult.remaining, fieldOption);
        const bestOp = candidates[0];

        if (!bestOp || bestOp.endIdx > fieldResult.remaining.length) {
            if (endsWithSpace) return [];
            const ops = this.parser.allowedOpsForField(fieldOption);
            const aliases = ops.flatMap((op) => op.aliases);
            const opPartial = fieldResult.remaining.join(" ");
            return this.parser.prefixMatches(opPartial, aliases, limit);
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
            const ops = this.parser.allowedOpsForField(fieldOption);
            const aliases = ops.flatMap((op) => op.aliases);
            const opPartial = fieldResult.remaining.join(" ");
            return this.parser.prefixMatches(opPartial, aliases, limit);
        }

        if (endsWithSpace) return [];
        const fieldValues = fieldOption.fieldValues;
        if (!fieldValues?.length) return [];
        return this.parser.prefixMatches(
            valueRaw,
            fieldValues.map((v) => v.label),
            limit,
        );
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
}
