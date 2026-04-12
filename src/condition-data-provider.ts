import { MatchEngine } from "./fuzzy/match-engine";
import { ConditionParser } from "./conditions/parser";
import { SuggestionsProvider } from "./fuzzy/providers/suggestions";
import { DiagnosticsProvider } from "./fuzzy/providers/diagnostics";
import type { FieldOption, OperatorOption, ConditionGroup, Diagnostic } from "./types";
import { SegmentResolver } from "./fuzzy/segments";

export class ConditionDataProvider {
    private readonly suggestions: SuggestionsProvider;
    private readonly diagnostics: DiagnosticsProvider;
    private readonly segments: SegmentResolver;

    public constructor(fields: FieldOption[], operators: OperatorOption[]) {
        const engine = new MatchEngine(fields, operators);
        const parser = new ConditionParser(engine);
        this.segments = new SegmentResolver(parser);
        this.suggestions = new SuggestionsProvider(parser, this.segments);
        this.diagnostics = new DiagnosticsProvider(parser, this.segments);
    }

    public parseComplexCondition(text: string): ConditionGroup | null {
        return this.segments.parseConditions(text);
    }

    public getCompletions(text: string, limit = 6): { completion: string; display: string }[] {
        return this.suggestions.getCompletions(text, limit);
    }

    public getSuggestion(text: string): { completion: string; display: string } | null {
        return this.suggestions.getSuggestion(text);
    }

    public diagnose(text: string): Diagnostic[] {
        return this.diagnostics.diagnose(text);
    }
}
